"use client";
import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import WebSocket from "@tauri-apps/plugin-websocket";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetch } from "@tauri-apps/plugin-http";
import { info } from "@tauri-apps/plugin-log";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import WebSocketManager from "./utils/WebSocketManager";
import HTTPRequestManager, { Methods } from "./utils/HTTPRequestManager";

export default function Home() {
    const [message, setMessage] = useState("Hello");
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
                <Button onClick={fetchData}>{message}</Button>
                <Button onClick={wsInit}>{connected}</Button>
            </div>
        </>
    );
}
