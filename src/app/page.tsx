"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CommandLineInput } from "./components/command-line";
import WebSocketManager from "./utils/WebSocketManager";
import HTTPRequestManager, { Methods } from "./utils/HTTPRequestManager";
import { invoke } from "@tauri-apps/api/core";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandList,
} from "@/components/ui/command";

export default function Home() {
    const [message, setMessage] = useState("Click to spawn window");
    const [connected, setConnected] = useState("Click to connect");
    const [isFocused, setIsFocused] = useState(false);

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

    const handleAction = (selectedValue: string) => {
        console.log(`You selected: ${selectedValue}`);
    };

    return (
        <>
            <div className="grid items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
                <CommandLineInput
                    onAction={handleAction}
                    inputWidth="300px" // Set input width
                    groups={[
                        {
                            label: "Suggestions",
                            items: [
                                { value: "next.js", label: "Next.js" },
                                { value: "sveltekit", label: "SvelteKit" },
                            ],
                        },
                        {
                            label: "Popular Tools",
                            items: [
                                { value: "nuxt.js", label: "Nuxt.js" },
                                { value: "remix", label: "Remix" },
                                { value: "astro", label: "Astro" },
                            ],
                        },
                    ]}
                />
                <Button onClick={createWindow}>{message}</Button>
                <Button onClick={wsInit}>{connected}</Button>
            </div>
        </>
    );
}
