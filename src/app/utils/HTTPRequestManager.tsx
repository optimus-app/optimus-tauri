import { fetch } from "@tauri-apps/plugin-http";

export enum Methods {
    GET = "GET",
    POST = "POST",
    DELETE = "DELETE",
}

// Server configuration interface
interface ServerConfig {
    baseUrl: string;
}

class HTTPRequestManager {
    private static instance: HTTPRequestManager | null = null;

    // Default server for backward compatibility
    private readonly defaultServer: string = "default";

    // Server configurations map
    private servers: Map<string, ServerConfig> = new Map();

    private constructor() {
        // Set up the default server configuration
        this.servers.set(this.defaultServer, {
            baseUrl: "http://localhost:8080/",
        });
    }

    static getInstance(): HTTPRequestManager {
        if (!HTTPRequestManager.instance) {
            HTTPRequestManager.instance = new HTTPRequestManager();
        }
        return HTTPRequestManager.instance;
    }

    /**
     * Add or update a server configuration
     * @param serverId Unique identifier for the server
     * @param baseUrl Base URL for the server
     */
    addServer(serverId: string, baseUrl: string): void {
        this.servers.set(serverId, { baseUrl });
    }

    /**
     * Get a server configuration
     * @param serverId Server identifier
     * @returns The server configuration or default if not found
     */
    getServer(serverId: string): ServerConfig {
        return (
            this.servers.get(serverId) || this.servers.get(this.defaultServer)!
        );
    }

    /**
     * Make an HTTP request to a specific server
     * @param path API endpoint path
     * @param request_method HTTP method
     * @param payload Request payload (optional)
     * @param serverId Server to use (optional, defaults to default server)
     * @returns Promise with the response data
     */
    async handleRequest(
        path: string,
        request_method: Methods,
        payload: any | null = null,
        serverId: string = this.defaultServer
    ): Promise<any> {
        const server = this.getServer(serverId);
        const final_path = server.baseUrl + path;

        console.log(`Making ${request_method} request to ${final_path}`);

        const response = await fetch(final_path, {
            method: request_method,
            body: payload ? JSON.stringify(payload) : null,
            headers: payload
                ? {
                      "Content-Type": "application/json",
                  }
                : {},
        });

        const data = await response.text();

        // If the response is not OK (e.g., 500 error), throw an error with status
        if (!response.ok) {
            const error = new Error(`Request failed: ${data}`);
            (error as any).status = response.status;
            throw error;
        }

        return JSON.parse(data || "{}");
    }
}

export default HTTPRequestManager;
