"use client";
import { useState, useEffect } from "react";
import { CommandLineInput } from "./components/command-line";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emitTo, listen } from "@tauri-apps/api/event";

export default function Home() {
    const [isFocused, setIsFocused] = useState(false);
    const [openCommandLine, setOpenCommandLine] = useState(false);

    const handleAction = async (
        command: string,
        args: string[],
        fullInput: string
    ) => {
        let payload = null;
        const windowCreatedPromise = new Promise<boolean>(async (resolve) => {
            const unlisten = await listen<string>("window_created", (event) => {
                console.log("Window created", event.payload);
                payload = event.payload;
                resolve(true);
                unlisten();
            });
        });
        invoke("create_window", { name: command });
        await windowCreatedPromise;
        if (payload) {
            // TODO: Optimise this handshake portion, and refactor into a reusable function
            const waitToSend = new Promise((resolve) =>
                setTimeout(resolve, 700)
            );
            await waitToSend;
        }
        await emitTo(command, "targetfield", {
            args: args[0],
            command: command,
        });
        console.log(
            "Window creation completed, proceeding with additional actions"
        );
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
                                { value: "dashboard", label: "Dashboard" },
                                { value: "im", label: "Instant Messaging" },
                                {
                                    value: "trade-exec",
                                    label: "Trade Execution",
                                },
                                { value: "backtest", label: "Backtesting" },
                            ],
                        },
                    ]}
                    open={openCommandLine} // Bind visibility to window focus
                    onOpenChange={setOpenCommandLine} // Allow external control of visibility
                />
            </div>
        </>
    );
}
