import { fetch } from "@tauri-apps/plugin-http";

export enum Methods {
    GET = "GET",
    POST = "POST",
}

class HTTPRequestManager {
    private static instance: HTTPRequestManager | null = null;
    private readonly url: string = "http://localhost:8080/";

    static getInstance(): HTTPRequestManager {
        if (!HTTPRequestManager.instance) {
            HTTPRequestManager.instance = new HTTPRequestManager();
        }
        return HTTPRequestManager.instance;
    }

    async handleRequest(
        path: string,
        request_method: Methods,
        payload: any | null
    ): Promise<any> {
        const final_path = this.url + path;
        console.log("Final path", final_path);
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
        return JSON.parse(data);
    }
}

export default HTTPRequestManager;
