"use client";
import { useState, useCallback, useEffect } from "react";
import { CommandLineInput } from "./components/command-line";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function Home() {
    const [isFocused, setIsFocused] = useState(false);
    const [openCommandLine, setOpenCommandLine] = useState(false);

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
            </div>
        </>
    );
}
