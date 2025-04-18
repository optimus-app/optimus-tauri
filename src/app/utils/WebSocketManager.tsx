import WebSocket from "@tauri-apps/plugin-websocket";

type MessageHandler = (message: string) => void;

// Protocol types supported by the manager
enum ProtocolType {
    STOMP = "stomp",
    RAW = "raw",
}

// Connection information for a WebSocket
interface ConnectionInfo {
    url: string;
    protocol: ProtocolType;
    ws: any;
    connected: boolean;
    subscriptions: Map<string, MessageHandler>;
}

class WebSocketManager {
    // Singleton instance
    private static instance: WebSocketManager | null = null;

    // Map of connection IDs to connection info
    private connections: Map<string, ConnectionInfo> = new Map();

    // Default connection ID for backward compatibility with existing code
    private readonly DEFAULT_CONNECTION_ID = "default-stomp-chat";

    // STOMP protocol frames
    private readonly STOMP_CONNECT_FRAME = "CONNECT\naccept-version:1.2\n\n\0";
    private readonly STOMP_SUBSCRIBE_FRAME =
        "SUBSCRIBE\ndestination:{0}\nid:{1}\nack:auto\n\n\0";

    // Default STOMP URL for backward compatibility
    private readonly DEFAULT_STOMP_URL = "ws://localhost:8080/connect/chat";

    private constructor() {
        // Initialize the default connection for backward compatibility
        this.connections.set(this.DEFAULT_CONNECTION_ID, {
            url: this.DEFAULT_STOMP_URL,
            protocol: ProtocolType.STOMP,
            ws: null,
            connected: false,
            subscriptions: new Map(),
        });
    }

    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    // For backward compatibility - adds subscription to default STOMP connection
    addSubscriptionPath(path: string, handler: MessageHandler): void {
        const connection = this.connections.get(this.DEFAULT_CONNECTION_ID);
        if (connection) {
            connection.subscriptions.set(path, handler);
        }
    }

    // Add a new WebSocket connection with specified protocol
    addConnection(id: string, url: string, protocol: ProtocolType): void {
        if (!this.connections.has(id)) {
            this.connections.set(id, {
                url,
                protocol,
                ws: null,
                connected: false,
                subscriptions: new Map(),
            });
        }
    }

    // Add subscription to a specific connection
    addSubscriptionToConnection(
        connectionId: string,
        path: string,
        handler: MessageHandler
    ): void {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.subscriptions.set(path, handler);
        } else {
            console.error(`Connection ${connectionId} does not exist`);
        }
    }

    private generateSubscriptionId(): string {
        return `sub-${Math.floor(Math.random() * 10000)}-${Date.now()}`;
    }

    private parseStompPayload(payload: string): {
        destination: string;
        body: any;
    } {
        const [rawDest, rawBody] = payload.split("\n\n");

        const headers = rawDest.split("\n").reduce((acc, line) => {
            const [key, value] = line.split(":");
            if (key && value) {
                acc[key.trim()] = value.trim();
            }
            return acc;
        }, {} as Record<string, string>);

        if (headers["version"] != null) {
            return { destination: "", body: null };
        }

        const destination = headers["destination"];
        let body = null;

        try {
            if (rawBody) {
                body = JSON.parse(rawBody.replace(/\0/g, ""));
            }
        } catch (e) {
            console.error("Failed to parse message body:", e);
        }

        return { destination, body };
    }

    // Start a specific connection
    async startConnection(connectionId: string): Promise<void> {
        const connection = this.connections.get(connectionId);

        if (!connection) {
            console.error(`Connection ${connectionId} does not exist`);
            return;
        }

        if (connection.connected) {
            console.log(`WebSocket ${connectionId} is already connected`);
            return;
        }

        try {
            connection.ws = await WebSocket.connect(connection.url);

            // Handle connection based on protocol
            if (connection.protocol === ProtocolType.STOMP) {
                // STOMP protocol connection
                await connection.ws.send(this.STOMP_CONNECT_FRAME);
                console.log(`STOMP Connection ${connectionId} established`);

                // Set up listener for STOMP messages
                connection.ws.addListener((message: any) => {
                    this.handleStompMessage(connectionId, message.data);
                });

                // Subscribe to all STOMP paths
                for (const [
                    path,
                    handler,
                ] of connection.subscriptions.entries()) {
                    const subscriptionPath = this.STOMP_SUBSCRIBE_FRAME.replace(
                        /\{0\}/g,
                        path
                    ).replace(/\{1\}/g, this.generateSubscriptionId());

                    await connection.ws.send(subscriptionPath);
                    console.log(
                        `Subscribed to ${path} on connection ${connectionId}`
                    );
                }
            } else {
                // Raw WebSocket connection
                console.log(
                    `Raw WebSocket Connection ${connectionId} established`
                );

                // Set up listener for raw messages
                connection.ws.addListener((message: any) => {
                    this.handleRawMessage(connectionId, message.data);
                });
            }

            connection.connected = true;
            this.connections.set(connectionId, connection);
        } catch (error) {
            console.error(
                `Failed to connect WebSocket ${connectionId}:`,
                error
            );
        }
    }

    // Start the default connection (for backward compatibility)
    async start(): Promise<void> {
        await this.startConnection(this.DEFAULT_CONNECTION_ID);
    }

    // Start all configured connections
    async startAll(): Promise<void> {
        for (const connectionId of this.connections.keys()) {
            await this.startConnection(connectionId);
        }
    }

    // Handle STOMP WebSocket messages
    private handleStompMessage(connectionId: string, message: any): void {
        console.log(`Received STOMP message on ${connectionId}:`, message);

        const { destination, body } = this.parseStompPayload(message);

        if (destination === "" && body === null) {
            return;
        }

        const connection = this.connections.get(connectionId);
        if (!connection) return;

        const handler = connection.subscriptions.get(destination);
        if (handler) {
            handler(JSON.stringify(body));
        } else {
            console.warn(
                `No handler for destination: ${destination} on connection ${connectionId}`
            );
        }
    }

    // Handle Raw WebSocket messages
    private handleRawMessage(connectionId: string, message: any): void {
        console.log(`Received Raw message on ${connectionId}:`, message);

        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // For raw connections, we dispatch the message to all handlers
        // Each handler can parse the message as needed
        for (const [path, handler] of connection.subscriptions.entries()) {
            handler(message);
        }
    }

    // Send a message on a specific connection
    async sendMessage(connectionId: string, message: string): Promise<void> {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.connected || !connection.ws) {
            console.error(
                `Cannot send message: connection ${connectionId} is not ready`
            );
            return;
        }

        await connection.ws.send(message);
    }

    // Disconnect a specific connection
    async disconnectConnection(connectionId: string): Promise<void> {
        const connection = this.connections.get(connectionId);
        if (connection && connection.ws) {
            await connection.ws.disconnect();
            connection.connected = false;
            connection.ws = null;
            this.connections.set(connectionId, connection);
            console.log(`Disconnected WebSocket ${connectionId}`);
        }
    }

    // Disconnect the default connection (for backward compatibility)
    async disconnect(): Promise<void> {
        await this.disconnectConnection(this.DEFAULT_CONNECTION_ID);
    }

    // Disconnect all connections
    async disconnectAll(): Promise<void> {
        for (const connectionId of this.connections.keys()) {
            await this.disconnectConnection(connectionId);
        }
    }
}

export { WebSocketManager, ProtocolType };
export default WebSocketManager;
