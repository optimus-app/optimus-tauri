"use client";
import { useState, useCallback, useEffect } from "react";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import WebSocket from "@tauri-apps/plugin-websocket";
import { Button } from "@/components/ui/button";
import { fetch } from "@tauri-apps/plugin-http";
import { info } from "@tauri-apps/plugin-log";

export default function Home() {
    const [message, setMessage] = useState<String | Promise<String>>("hello");
    const [open, setOpen] = useState(false);
    const [ws, setWs] = useState(null);
    const [connected, setConnected] = useState("Connect to websocket");

    const wsInit = useCallback(async () => {
        const sock = await WebSocket.connect(
            "ws://localhost:8080/connect/chat"
        ).then((r) => {
            console.log("Connected to websocket");
            setConnected("Connected to websocket");
            return r;
        });

        sock.addListener((msg) => {
            console.log("Received message:", msg);
        });

        await sock.send("CONNECT\naccept-version:1.2\n\n\0").then((r) => {
            console.log("Connection Established");
        });

        await sock
            .send(
                "SUBSCRIBE\ndestination:/subscribe/chat/messages/user1\nid:user1\nack:auto\n\n\0"
            )
            .then((r) => {
                console.log("Sent");
            })
            .catch((error) => {
                console.log("GG");
            });

        setWs(sock);
        console.log({ sock });
    }, [ws]);

    const handleFetch = async () => {
        const response = await fetch(
            "http://localhost:8080/chat/chatRoom/user1",
            {
                method: "GET",
            }
        );
        const data = await response.text();
        const body = JSON.parse(data);
        const roomTitle = body[0].roomTitle;
        info(body[0].roomTitle);
        setMessage(roomTitle);
    };

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <Button onClick={handleFetch}>{message}</Button>
            <Button onClick={wsInit}>{connected}</Button>
            {/* <p className="text-sm text-muted-foreground">
                Press{" "}
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>J
                </kbd>
            </p>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem>
                            <Calendar />
                            <span>Calendar</span>
                        </CommandItem>
                        <CommandItem>
                            <Smile />
                            <span>Search Emoji</span>
                        </CommandItem>
                        <CommandItem>
                            <Calculator />
                            <span>Calculator</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                        <CommandItem>
                            <User />
                            <span>Profile</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                            <CreditCard />
                            <span>Billing</span>
                            <CommandShortcut>⌘B</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                            <Settings />
                            <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog> */}
        </div>
    );
}
