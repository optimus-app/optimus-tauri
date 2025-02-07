"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Plus, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import WebSocketManager from "../utils/WebSocketManager";
import HTTPRequestManager, { Methods } from "../utils/HTTPRequestManager";
import { ScrollArea } from "@/components/ui/scroll-area";

const users = [
    {
        name: "Olivia Martin",
        email: "m@example.com",
        avatar: "/avatars/01.png",
    },
    {
        name: "Isabella Nguyen",
        email: "isabella.nguyen@email.com",
        avatar: "/avatars/03.png",
    },
    {
        name: "Emma Wilson",
        email: "emma@example.com",
        avatar: "/avatars/05.png",
    },
    {
        name: "Jackson Lee",
        email: "lee@example.com",
        avatar: "/avatars/02.png",
    },
    {
        name: "William Kim",
        email: "will@email.com",
        avatar: "/avatars/04.png",
    },
] as const;

type User = (typeof users)[number];

interface Message {
    role: string;
    content: string;
}

export default function CardsChat() {
    const wsManager = useMemo(() => WebSocketManager.getInstance(), []);
    const httpManager = useMemo(() => HTTPRequestManager.getInstance(), []);

    const [open, setOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const inputLength = input.trim().length;
    const lastMessageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const wsInit = async () => {
            try {
                wsManager.addSubscriptionPath(
                    "/subscribe/chat/messages/user1",
                    (msg: any) => {
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "agent",
                                content: msg.content,
                            },
                        ]);
                    }
                );
                await wsManager.start();
            } catch (error) {
                console.error("WebSocket subscription failed", error);
            }
        };
        wsInit();
        return () => {
            wsManager.disconnect();
        };
    }, [wsManager]);

    useEffect(() => {
        const fetchInitialMessage = async () => {
            try {
                await httpManager
                    .handleRequest("chat/messages/1", Methods.GET)
                    .then((r) => {
                        console.log("Sent!", r);
                        r.forEach((item: any) => {
                            setMessages((prev) => [
                                ...prev,
                                {
                                    role:
                                        item.role === "user1"
                                            ? "user"
                                            : "agent",
                                    content: item.content,
                                },
                            ]);
                        });
                    });
            } catch (error) {
                console.error("Did not send it out!", error);
            }
        };

        fetchInitialMessage();
    }, [httpManager]);

    useEffect(() => {
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [messages]);

    return (
        <div className="font-[family-name:var(--font-geist-sans)] h-screen flex flex-col">
            <Card className="flex flex-col h-full">
                <CardHeader className="flex flex-row items-center shrink-0">
                    <div className="flex items-center space-x-4">
                        <Avatar>
                            <AvatarImage src="/avatars/01.png" alt="Image" />
                            <AvatarFallback>OM</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium leading-none">
                                Sofia Davis
                            </p>
                            <p className="text-sm text-muted-foreground">
                                m@example.com
                            </p>
                        </div>
                    </div>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="ml-auto rounded-full"
                                    onClick={() => setOpen(true)}
                                >
                                    <Plus />
                                    <span className="sr-only">New message</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={10}>
                                New message
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                        <div className="space-y-4 p-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                        message.role === "user"
                                            ? "ml-auto bg-primary text-primary-foreground"
                                            : "bg-muted"
                                    )}
                                >
                                    {message.content}
                                </div>
                            ))}
                            <div ref={lastMessageRef} />
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="shrink-0 border-t bg-card">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (inputLength === 0) return;
                            setMessages((prev) => [
                                ...prev,
                                {
                                    role: "user",
                                    content: input,
                                },
                            ]);
                            setInput("");
                        }}
                        className="flex w-full items-center space-x-2"
                    >
                        <Input
                            id="message"
                            placeholder="Type your message..."
                            className="flex-1"
                            autoComplete="off"
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={inputLength === 0}
                        >
                            <Send />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="gap-0 p-0 outline-none">
                    <DialogHeader className="px-4 pb-4 pt-5">
                        <DialogTitle>New message</DialogTitle>
                        <DialogDescription>
                            Invite a user to this thread. This will create a new
                            group message.
                        </DialogDescription>
                    </DialogHeader>
                    <Command className="overflow-hidden rounded-t-none border-t bg-transparent">
                        <CommandInput placeholder="Search user..." />
                        <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup className="p-2">
                                {users.map((user) => (
                                    <CommandItem
                                        key={user.email}
                                        className="flex items-center px-2"
                                        onSelect={() => {
                                            if (selectedUsers.includes(user)) {
                                                return setSelectedUsers(
                                                    selectedUsers.filter(
                                                        (selectedUser) =>
                                                            selectedUser !==
                                                            user
                                                    )
                                                );
                                            }
                                            return setSelectedUsers([
                                                ...selectedUsers,
                                                user,
                                            ]);
                                        }}
                                    >
                                        <Avatar>
                                            <AvatarImage
                                                src={user.avatar}
                                                alt="Image"
                                            />
                                            <AvatarFallback>
                                                {user.name[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="ml-2">
                                            <p className="text-sm font-medium leading-none">
                                                {user.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                        {selectedUsers.includes(user) ? (
                                            <Check className="ml-auto flex h-5 w-5 text-primary" />
                                        ) : null}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                    <DialogFooter className="flex items-center border-t p-4 sm:justify-between">
                        {selectedUsers.length > 0 ? (
                            <div className="flex -space-x-2 overflow-hidden">
                                {selectedUsers.map((user) => (
                                    <Avatar
                                        key={user.email}
                                        className="inline-block border-2 border-background"
                                    >
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback>
                                            {user.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Select users to add to this thread.
                            </p>
                        )}
                        <Button
                            disabled={selectedUsers.length < 2}
                            onClick={() => setOpen(false)}
                        >
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
