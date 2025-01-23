"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import WebSocketManager from "./utils/WebSocketManager";
import HTTPRequestManager, { Methods } from "./utils/HTTPRequestManager";
import { invoke } from "@tauri-apps/api/core";

export default function Home() {
    const [message, setMessage] = useState("Click to spawn window");
    const [connected, setConnected] = useState("Click to connect");

    const wsManager = WebSocketManager.getInstance();
    const httpManager = HTTPRequestManager.getInstance();

    const wsInit = useCallback(async () => {
        wsManager.addSubscriptionPath(
            "/subscribe/chat/messages/user1",
            (msg: any) => {
                console.log("Message Received");
                setMessage(msg.content);
            }
        );

        await wsManager.start();
        setConnected("Connected!");
    }, [wsManager]);

    const createWindow = async () => {
        invoke("create_window");
    };

    const fetchData = async () => {
        const data = await httpManager
            .handleRequest("chat/chatRoom/user1", Methods.GET)
            .then((r) => {
                console.log("Sent!");
            });
    };

    return (
        <>
            <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
                <Button onClick={createWindow}>{message}</Button>
                <Button onClick={wsInit}>{connected}</Button>
            </div>
        </>
    );
}
