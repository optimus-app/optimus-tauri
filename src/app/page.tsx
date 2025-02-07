"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CommandLineInput } from "./components/command-line";
import WebSocketManager from "./utils/WebSocketManager";
import HTTPRequestManager, { Methods } from "./utils/HTTPRequestManager";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function Home() {
    const [message, setMessage] = useState("Click to spawn window");
    const [connected, setConnected] = useState("Click to connect");
    const [isFocused, setIsFocused] = useState(false);
    const [openCommandLine, setOpenCommandLine] = useState(false);

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

    useEffect(() => {
        const fetchInitialMessage = async () => {
            try {
                const response = await httpManager
                    .handleRequest("chat/chatRoom/user1", Methods.GET)
                    .then((r) => {
                        console.log("Sent!");
                    });
            } catch (error) {
                console.log("Did not send it out!");
            }
        };

        fetchInitialMessage();
    }, [httpManager]);

    const handleAction = (selectedValue: string) => {
        console.log("parsing {}", selectedValue);
        invoke("create_window", { name: selectedValue });
    };

    useEffect(() => {
        const setupFocusListener = async () => {
            const unlisten = await getCurrentWindow().onFocusChanged(
                ({ payload: focused }) => {
                    console.log("Focus changed, window is focused? " + focused);
                    setIsFocused(focused);
                    setOpenCommandLine(focused);
                }
            );

            return () => {
                unlisten(); // Cleanup on component unmount
            };
        };
        setupFocusListener();
    }, []);

    return (
        <>
            <div className="grid items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
                <CommandLineInput
                    onAction={handleAction}
                    inputWidth="300px" // Set input width
                    groups={[
                        {
                            label: "Functions",
                            items: [
                                { value: "im", label: "Instant Messaging" },
                                { value: "dashboard", label: "Dashboard" },
                            ],
                        },
                    ]}
                    open={openCommandLine} // Bind visibility to window focus
                    onOpenChange={setOpenCommandLine} // Allow external control of visibility
                />
                <Button onClick={createWindow}>{message}</Button>
                <Button onClick={wsInit}>{connected}</Button>
            </div>
        </>
    );
}
