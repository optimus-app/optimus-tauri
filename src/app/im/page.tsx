"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Plus, Send, GalleryVerticalEnd } from "lucide-react";

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
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import WebSocketManager from "../utils/WebSocketManager";
import HTTPRequestManager, { Methods } from "../utils/HTTPRequestManager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import { emitTo, listen } from "@tauri-apps/api/event";

const ChatSkeleton = () => (
    <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-[200px] ml-0" />
        <Skeleton className="h-12 w-[300px] ml-auto" />
        <Skeleton className="h-12 w-[250px] ml-0" />
        <Skeleton className="h-12 w-[200px] ml-auto" />
    </div>
);

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

async function sendMessageToServer(
    chatRoom: number,
    content: string,
    user: string,
    httpManager: HTTPRequestManager
) {
    let payload = {
        content: content,
        sender: user,
        roomId: chatRoom,
    };
    try {
        const response = await httpManager
            .handleRequest("chat/message", Methods.POST, payload)
            .then((r) => {
                console.log("Sent!", r);
            });
    } catch (error) {
        console.error("Lolololololololol!", error);
    }
}

const userName = "user4";

export default function CardsChat() {
    const { setTheme } = useTheme();
    setTheme("dark");
    const wsManager = useMemo(() => WebSocketManager.getInstance(), []);
    const httpManager = useMemo(() => HTTPRequestManager.getInstance(), []);

    const [open, setOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const inputLength = input.trim().length;
    const [chatData, setChatData] = useState<any>({ navMain: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [activeChatName, setActiveChatName] = useState<string>("");

    const lastMessageRef = useRef<HTMLDivElement>(null);

    const loadChatMessages = async (chatId: number) => {
        setIsLoading(true);
        setMessages([]);

        try {
            const response = await httpManager.handleRequest(
                `chat/messages/${chatId}`,
                Methods.GET,
                null
            );

            const chatRoom = chatData.navMain[0].items.find(
                (item: any) => item.id === chatId
            );
            setActiveChatName(chatRoom?.title || "Chat");

            if (Array.isArray(response)) {
                response.forEach((item: any) => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: item.sender === userName ? "user" : "agent",
                            content: item.content,
                        },
                    ]);
                });
            } else {
                console.error("Unexpected response format:", response);
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("Failed to load chat messages:", error);
            setMessages([
                {
                    role: "system",
                    content: "Failed to load messages. Please try again later.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [messages]);

    const [isChatDataReady, setIsChatDataReady] = useState(false);
    const [isWebSocketReady, setIsWebSocketReady] = useState(false);

    const unlistenRef = useRef<(() => void) | null>(null);
    // First useEffect for fetching chat rooms and initializing chatData
    useEffect(() => {
        const getChatRoom = async () => {
            try {
                const response = await httpManager.handleRequest(
                    `chat/chatRoom/${userName}`,
                    Methods.GET,
                    null
                );

                console.log("Responses: ", response);
                const formattedData = {
                    navMain: [
                        {
                            title: "Messages",
                            url: "#",
                            id: 0,
                            items: response.map((room: any) => ({
                                title: room.roomTitle,
                                url: "#",
                                id: room.roomId,
                                isActive: false,
                            })),
                        },
                    ],
                };
                setChatData(formattedData);
                setIsChatDataReady(true); // Signal that chatData is ready
            } catch (error) {
                console.log("Error fetching chat rooms!", error);
            }
        };

        getChatRoom();
    }, [httpManager]);

    // Second useEffect for WebSocket setup - triggered by chatData ready
    useEffect(() => {
        if (!isChatDataReady) return;

        const initWebSocket = async () => {
            try {
                wsManager.addSubscriptionPath(
                    `/subscribe/chat/messages/${userName}`,
                    (msg: any) => {
                        setMessages((prev) => [
                            ...prev,
                            {
                                role:
                                    msg.sender === userName ? "user" : "agent",
                                content: msg.content,
                            },
                        ]);
                    }
                );
                await wsManager.start();
                setIsWebSocketReady(true); // Signal that WebSocket is ready
            } catch (error) {
                console.error("WebSocket initialization failed:", error);
            }
        };

        initWebSocket();

        return () => {
            wsManager.disconnect();
            setIsWebSocketReady(false);
        };
    }, [isChatDataReady, wsManager]); // Depend on isChatDataReady instead of chatData

    // Third useEffect for Tauri event listeners - triggered by WebSocket ready
    useEffect(() => {
        if (!isWebSocketReady) return;

        const setupTauriListener = async () => {
            try {
                await emitTo("main", "window_created", "from im");
                const unlisten = await listen<any>("targetfield", (event) => {
                    console.log("Received event", event.payload);
                    console.log("Args", event.payload.args);
                    console.log("Command", event.payload.command);

                    const args = event.payload.args;
                    if (!args || args.trim() === "") {
                        console.log("Nothing");
                        return;
                    }

                    const matchingRoom = chatData.navMain[0].items.find(
                        (item: any) =>
                            item.title.toLowerCase() ===
                            event.payload.args.toLowerCase()
                    );

                    if (matchingRoom) {
                        console.log("Found matching room:", matchingRoom);
                        setActiveChatId(matchingRoom.id);
                        setActiveChatName(matchingRoom.title);
                        loadChatMessages(matchingRoom.id);
                    } else {
                        console.log(
                            "No matching room found for:",
                            event.payload.args
                        );
                    }
                });
                unlistenRef.current = unlisten;
                console.log("Tauri listener setup complete");
            } catch (error) {
                console.error("Tauri listener setup failed:", error);
            }
        };

        setupTauriListener();

        return () => {
            if (unlistenRef.current) {
                unlistenRef.current();
            }
        };
    }, [isWebSocketReady, chatData, loadChatMessages]); // Depend on isWebSocketReady

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "19rem",
                } as React.CSSProperties
            }
        >
            <AppSidebar
                data={chatData}
                username={userName}
                onChatSelect={(chatId) => {
                    console.log("selected chat", chatId);
                    setActiveChatId(Number(chatId));
                    loadChatMessages(Number(chatId));
                }}
                activeRoomId={activeChatId || undefined}
            />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">
                                    Messages
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>
                                    {activeChatName || "Select a chat"}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>
                <div className="flex flex-1 flex-col p-4 pt-0 h-[calc(100vh-4rem)]">
                    {!activeChatId ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            Select a chat to start messaging
                        </div>
                    ) : (
                        <Card className="flex flex-col h-full">
                            <CardHeader className="flex flex-row items-center shrink-0">
                                <div className="flex items-center space-x-4">
                                    <Avatar>
                                        <AvatarImage
                                            src="/avatars/01.png"
                                            alt="Image"
                                        />
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
                                                <span className="sr-only">
                                                    New message
                                                </span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent sideOffset={10}>
                                            New message
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0 p-0">
                                <ScrollArea className="h-full">
                                    {isLoading ? (
                                        <ChatSkeleton />
                                    ) : messages.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-muted-foreground">
                                            No messages found
                                        </div>
                                    ) : (
                                        <div className="space-y-4 p-4">
                                            {messages.map((message, index) => (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                                        message.role === "user"
                                                            ? "ml-auto bg-primary text-primary-foreground"
                                                            : message.role ===
                                                              "system"
                                                            ? "mx-auto bg-destructive text-destructive-foreground"
                                                            : "bg-muted"
                                                    )}
                                                >
                                                    {message.content}
                                                </div>
                                            ))}
                                            <div ref={lastMessageRef} />
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="shrink-0">
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        if (inputLength === 0) return;
                                        setInput("");
                                        sendMessageToServer(
                                            Number(activeChatId),
                                            input,
                                            userName,
                                            httpManager
                                        );
                                    }}
                                    className="flex w-full items-center space-x-2"
                                >
                                    <Input
                                        id="message"
                                        placeholder="Type your message..."
                                        className="flex-1"
                                        autoComplete="off"
                                        value={input}
                                        onChange={(event) =>
                                            setInput(event.target.value)
                                        }
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
                    )}
                </div>
            </SidebarInset>
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
        </SidebarProvider>
    );
}
