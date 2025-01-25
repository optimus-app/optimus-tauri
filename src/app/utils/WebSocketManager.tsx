import WebSocket from "@tauri-apps/plugin-websocket";

type MessageHandler = (message: string) => void;

class WebSocketManager {
    private static instance: WebSocketManager | null = null; // Singleton instance
    private ws: any = null; //
    private subscriptions: Map<string, MessageHandler> = new Map(); // Subscription map
    private connected: boolean = false; // Connection state
    private readonly SUBSCRIBE_FRAME: string =
        "SUBSCRIBE\ndestination:{0}\nid:{1}\nack:auto\n\n\0";
    private readonly url: string = "ws://localhost:8080/connect/chat";

    private constructor() {}

    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    addSubscriptionPath(path: string, handler: MessageHandler): void {
        this.subscriptions.set(path, handler);
    }

    private generateSubscriptionId(): string {
        // Generates a random string, e.g., "sub-9348-167345"
        return `sub-${Math.floor(Math.random() * 10000)}-${Date.now()}`;
    }

    private parseWebSocketPayload(payload: string): {
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

        console.log(rawDest);
        console.log(rawBody);

        const body = JSON.parse(rawBody.replace(/\0/g, ""));

        return { destination, body };
    }

    // Start the WebSocket connection and handle subscriptions
    async start(): Promise<void> {
        if (this.connected) {
            console.log("WebSocket is already connected");
            return;
        }

        try {
            this.ws = await WebSocket.connect(this.url);
            await this.ws
                .send("CONNECT\naccept-version:1.2\n\n\0")
                .then((r: any) => {
                    console.log("Connection Established");
                });
            this.connected = true;
            console.log("Connected to WebSocket");

            // Set up the WebSocket message listener
            this.ws.addListener((message: any) => {
                this.handleMessage(message.data);
            });

            // Subscribe to all paths
            for (const [key, handler] of this.subscriptions.entries()) {
                const subscriptionPath = this.SUBSCRIBE_FRAME.replace(
                    /\{0\}/g,
                    key
                ).replace(/\{1\}/g, this.generateSubscriptionId());
                console.log(subscriptionPath);
                await this.ws.send(subscriptionPath);
                console.log(`Subscribed to ${key}`);
            }
        } catch (error) {
            console.error("Failed to connect to WebSocket:", error);
        }
    }

    // Handle incoming WebSocket messages
    private handleMessage(message: any): void {
        console.log("Received message:", message);
        /*
        MESSAGE
        destination:/subscribe/chat/messages/user1
        content-type:application/json
        subscription:user1
        message-id:e5a8c7d9-2aed-9272-3fd4-352e7d3254e9-3
        content-length:50

        {"content":"hi","roomId":1,"sender":"user1"}
        */
        const { destination, body } = this.parseWebSocketPayload(message);

        if (destination == "" && body == "null") {
            return;
        }
        console.log(`Destination: ${destination}`);
        const handler = this.subscriptions.get(destination);

        if (handler) {
            handler(body);
        } else {
            console.warn(`No handler for destination: ${destination}`);
        }
    }

    // Disconnect the WebSocket
    async disconnect(): Promise<void> {
        if (this.ws) {
            await this.ws.disconnect();
            console.log("Disconnected from WebSocket");
        }
    }
}

export default WebSocketManager;
