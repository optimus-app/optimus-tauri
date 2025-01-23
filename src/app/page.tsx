"use client";
import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import WebSocket from "@tauri-apps/plugin-websocket";
import { Button } from "@/components/ui/button";
import { fetch } from "@tauri-apps/plugin-http";
import { info } from "@tauri-apps/plugin-log";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, MoonIcon, Sun } from "lucide-react";

export default function Home() {
    const { setTheme } = useTheme();
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

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                        Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                        Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                        System
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
