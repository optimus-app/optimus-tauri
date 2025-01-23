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

    const [isLoading, setIsLoading] = useState<boolean>(false);

    async function onSubmit(event: React.SyntheticEvent) {
        event.preventDefault();
        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
        }, 3000);
    }

    return (
        <>
            <div className="container relative h-[800px] flex-ol items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
                <Button
                    variant="ghost"
                    className="absolute right-4 top-4 md:right-8 md:top-8"
                >
                    Login
                </Button>
                <div className="lg:p-8 text-white">
                    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                        <div className="flex flex-col space-y-2 text-center">
                            <h1 className="text-2xl font-semibold tracking-tight text-white">
                                Create an account
                            </h1>
                            <p className="text-sm text-muted-foreground text-white">
                                Enter your email below to create your account
                            </p>
                        </div>
                        <form onSubmit={onSubmit}>
                            <div className="grid gap-2">
                                <div className="grid gap-1">
                                    <Label className="sr-only" htmlFor="email">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button disabled={isLoading}>
                                    {isLoading && (
                                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Sign In with Email
                                </Button>
                            </div>
                        </form>
                        <p className="px-8 text-center text-sm text-muted-foreground">
                            By clicking continue, you agree to our{" "}
                            <Link
                                href="/terms"
                                className="underline underline-offset-4 hover:text-primary"
                            >
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link
                                href="/privacy"
                                className="underline underline-offset-4 hover:text-primary"
                            >
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
