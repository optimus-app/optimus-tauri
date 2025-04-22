"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Plus, Send, LogOut, UserPlus } from "lucide-react";

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
import WebSocketManager, { ProtocolType } from "../utils/WebSocketManager";
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
    timestamp?: string;
}

function formatMessageTime(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        if (isToday(date)) {
            // If the message is from today, show only the time
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // If the message is from another day, show date and time
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
                   ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    } catch (e) {
        console.error("Error formatting timestamp:", e);
        return "";
    }
}

function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

async function sendMessageToServer(
    chatRoom: number,
    content: string,
    user: string,
    httpManager: HTTPRequestManager
) {
    // Validate content before sending
    if (!content || content.trim() === "") {
        console.warn("Attempted to send empty message");
        return;
    }

    const payload = {
        content: content.trim(), // Ensure content is trimmed
        sender: user,
        roomId: chatRoom,
        timestamp: new Date().toISOString(),
    };

    try {
        await httpManager
            .handleRequest("chat/message", Methods.POST, payload)
            .then((r) => {
                console.log("Message sent successfully:", r);
                // Return a promise that resolves after a short delay
                return new Promise((resolve) =>
                    setTimeout(() => resolve(r), 300)
                );
            });
    } catch (error) {
        console.error("Message send error:", error);
    }
}

async function createChatRoom(
    title: string,
    members: string[],
    httpManager: HTTPRequestManager
) {
    const payload = {
        roomTitle: title,
        members: members,
    };
    try {
        await httpManager
            .handleRequest("chat/room/createRoom", Methods.POST, payload)
            .then(() => {
                console.log("Chatroom created!");
            });
    } catch (error) {
        console.error("Chatroom creation error:", error);
    }
}

// New function for adding users to a chatroom
async function addUsersToChatRoom(
    roomId: number,
    users: string[],
    httpManager: HTTPRequestManager
) {
    const payload = {
        usersToAdd: users,
    };

    try {
        const response = await httpManager.handleRequest(
            `chat/room/${roomId}/addUsers`,
            Methods.POST,
            payload
        );
        console.log("Users added to chatroom:", response);
        return response;
    } catch (error) {
        console.error("Error adding users to chatroom:", error);
        throw error;
    }
}

// New function for leaving a chatroom
async function leaveChatRoom(
    roomId: number,
    username: string,
    httpManager: HTTPRequestManager
) {
    const payload = {
        roomId: roomId,
        username: username,
    };

    try {
        const response = await httpManager.handleRequest(
            `chat/room/${roomId}/leave`,
            Methods.POST,
            payload
        );
        console.log("Left chatroom:", response);
        return true;
    } catch (error) {
        console.error("Error leaving chatroom:", error);
        return false;
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

    const [createRoomOpen, setCreateRoomOpen] = useState(false);
    const [roomTitle, setRoomTitle] = useState("");
    const [selectedMembers, setSelectedMembers] = useState<string[]>([
        userName,
    ]);

    // New state for confirming leave room action
    const [leaveRoomDialogOpen, setLeaveRoomDialogOpen] = useState(false);

    const lastMessageRef = useRef<HTMLDivElement>(null);
    const CHAT_WS_CONNECTION_ID = "chat-connection";

    // --- Create a new chat room ---
    const handleCreateRoom = async () => {
        if (!roomTitle) return;

        try {
            await createChatRoom(roomTitle, selectedMembers, httpManager);
            setCreateRoomOpen(false);
            setRoomTitle("");
            setSelectedMembers([userName]);

            // Refresh the chat rooms list
            refreshChatRooms();
        } catch (error) {
            console.error("Error creating chat room:", error);
        }
    };

    // --- Add users to chat room ---
    const handleAddUsers = async () => {
        if (!activeChatId || selectedUsers.length === 0) {
            setOpen(false);
            return;
        }

        try {
            // Extract emails from selected users
            const userEmails = selectedUsers.map((user) => user.email);

            await addUsersToChatRoom(activeChatId, userEmails, httpManager);
            setOpen(false);
            setSelectedUsers([]);

            // Refresh the chat rooms list to update member information
            refreshChatRooms();
        } catch (error) {
            console.error("Error adding users to chat room:", error);
        }
    };

    // --- Leave chat room ---
    const handleLeaveRoom = async () => {
        if (!activeChatId) return;

        try {
            const success = await leaveChatRoom(
                activeChatId,
                userName,
                httpManager
            );

            if (success) {
                // Remove the room from local state
                const updatedItems = chatData.navMain[0].items.filter(
                    (item: any) => item.id !== activeChatId
                );

                const updatedChatData = {
                    navMain: [
                        {
                            ...chatData.navMain[0],
                            items: updatedItems,
                        },
                    ],
                };

                setChatData(updatedChatData);

                // Clear current active chat
                setActiveChatId(null);
                setActiveChatName("");
                setMessages([]);
                setLeaveRoomDialogOpen(false);
            }
        } catch (error) {
            console.error("Error leaving chat room:", error);
        }
    };

    // --- Refresh chat rooms list ---
    const refreshChatRooms = async () => {
        try {
            const response = await httpManager.handleRequest(
                `chat/chatRoom/${userName}`,
                Methods.GET,
                null
            );

            console.log("Chat room response:", response);
            const rooms = Array.isArray(response) ? response : [response];

            const formattedData = {
                navMain: [
                    {
                        title: "Messages",
                        url: "#",
                        id: 0,
                        items: rooms.map((room: any) => ({
                            title: room.roomTitle,
                            url: "#",
                            id: room.roomId,
                            members: room.members
                                ? room.members
                                      .map((member: string) =>
                                          member === userName ? "me" : member
                                      )
                                      .join(", ")
                                : "",
                            isActive: activeChatId === room.roomId,
                        })),
                    },
                ],
            };

            setChatData(formattedData);
        } catch (error) {
            console.error("Error refreshing chat rooms:", error);
        }
    };

    // --- Load messages for a given chat room ---
    const loadChatMessages = async (chatId: number) => {
        setIsLoading(true);
        setMessages([]);

        try {
            const response = await httpManager.handleRequest(
                `chat/messages/${chatId}`,
                Methods.GET,
                null
            );

            let messagesArray;
            // New response structure: object with messages, roomTitle, etc.
            if (response && response.messages) {
                messagesArray = response.messages;
                setActiveChatName(response.roomTitle || "Chat");
            } else if (Array.isArray(response)) {
                messagesArray = response;
                const chatRoom = chatData.navMain[0].items.find(
                    (item: any) => item.id === chatId
                );
                setActiveChatName(chatRoom?.title || "Chat");
            } else {
                messagesArray = [];
            }

            const formattedMessages = messagesArray.map((item: any) => ({
                role: item.sender === userName ? "user" : "agent",
                content: item.content,
                timestamp: item.timestamp || new Date().toISOString(),
            }));

            setMessages(formattedMessages);
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

    // Auto-scroll to bottom when messages change.
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

    // --- Fetch Chat Room(s) ---
    useEffect(() => {
        const getChatRoom = async () => {
            try {
                const response = await httpManager.handleRequest(
                    `chat/chatRoom/${userName}`,
                    Methods.GET,
                    null
                );

                console.log("Chat room response: ", response);
                // Allow for a single object or an array of rooms.
                const rooms = Array.isArray(response) ? response : [response];

                const formattedData = {
                    navMain: [
                        {
                            title: "Messages",
                            url: "#",
                            id: 0,
                            items: rooms.map((room: any) => ({
                                title: room.roomTitle,
                                url: "#",
                                id: room.roomId,
                                // Format members as a comma-separated string.
                                members: room.members
                                    ? room.members
                                          .map((member: string) =>
                                              member === userName
                                                  ? "me"
                                                  : member
                                          )
                                          .join(", ")
                                    : "",
                                isActive: false,
                            })),
                        },
                    ],
                };
                setChatData(formattedData);
                setIsChatDataReady(true);
            } catch (error) {
                console.error("Error fetching chat rooms!", error);
            }
        };

        getChatRoom();
    }, [httpManager]);

    // --- Set up WebSocket for messages ---
    useEffect(() => {
        if (!isChatDataReady) return;

        const initWebSocket = async () => {
            try {
                wsManager.addConnection(
                    CHAT_WS_CONNECTION_ID,
                    "ws://localhost:8080/connect/chat",
                    ProtocolType.STOMP
                );
                wsManager.addSubscriptionToConnection(
                    CHAT_WS_CONNECTION_ID,
                    `/subscribe/chat/messages/${userName}`,
                    (msg: any) => {
                        console.log("Received webscket");
                        const parsedMsg = JSON.parse(msg);
                        if (
                            parsedMsg &&
                            parsedMsg.content &&
                            typeof parsedMsg.content === "string" &&
                            parsedMsg.content.trim() !== "" &&
                            parsedMsg.roomId !== undefined
                        ) {
                            // Only add message to UI if it belongs to the currently active chat room
                            if (parsedMsg.roomId === activeChatId) {
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        role:
                                            parsedMsg.sender === userName
                                                ? "user"
                                                : "agent",
                                        content: parsedMsg.content,
                                        timestamp: parsedMsg.timestamp || new Date().toISOString(),
                                    },
                                ]);

                                setTimeout(() => {
                                    if (lastMessageRef.current) {
                                        lastMessageRef.current.scrollIntoView({
                                            behavior: "smooth",
                                            block: "end",
                                        });
                                    }
                                }, 100);
                            } else {
                                console.log(
                                    `Received message for room ${parsedMsg.roomId}, but currently in room ${activeChatId}`
                                );
                            }
                        } else {
                            console.warn(
                                "Received invalid message format:",
                                msg
                            );
                        }
                    }
                );

                // Add subscription for room updates
                wsManager.addSubscriptionToConnection(
                    CHAT_WS_CONNECTION_ID,
                    `/subscribe/chat/room/update/${userName}`,
                    (room: any) => {
                        console.log("Room updated:", room);
                        refreshChatRooms();
                    }
                );

                await wsManager.startConnection(CHAT_WS_CONNECTION_ID);
                setIsWebSocketReady(true);
            } catch (error) {
                console.error("WebSocket initialization failed:", error);
            }
        };

        initWebSocket();

        return () => {
            wsManager.disconnect();
            setIsWebSocketReady(false);
        };
    }, [isChatDataReady, wsManager]);

    // --- Set up Tauri event listeners ---
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
                            item.title.toLowerCase() === args.toLowerCase()
                    );

                    if (matchingRoom) {
                        console.log("Found matching room:", matchingRoom);
                        setActiveChatId(matchingRoom.id);
                        setActiveChatName(matchingRoom.title);
                        loadChatMessages(matchingRoom.id);
                    } else {
                        console.log("No matching room found for:", args);
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
    }, [isWebSocketReady, chatData]);

    // Determine the current active chat room from chatData for header display.
    const currentRoom =
        activeChatId && chatData.navMain[0]
            ? chatData.navMain[0].items.find(
                  (item: any) => item.id === activeChatId
              )
            : null;

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "19rem",
                } as React.CSSProperties
            }
        >
            <div
                style={{
                    position: "fixed",
                    top: 20,
                    left: 0,
                    right: 0,
                    display: "flex",
                }}
            >
                <div
                    style={{
                        position: "fixed",
                        bottom: 20,
                        left: 16,
                        width: "calc(19rem - 32px)",
                        zIndex: 50,
                    }}
                >
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 shadow-md"
                        onClick={() => setCreateRoomOpen(true)}
                    >
                        <UserPlus className="h-4 w-4" />
                        Create New Room
                    </Button>
                </div>
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
                        <Separator
                            orientation="vertical"
                            className="mr-2 h-4"
                        />
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
                                <CardHeader className="flex flex-row items-center justify-between shrink-0">
                                    <div className="flex items-center space-x-4">
                                        <Avatar>
                                            <AvatarImage
                                                src="/avatars/01.png"
                                                alt="Chat avatar"
                                            />
                                            <AvatarFallback>
                                                {activeChatName
                                                    ? activeChatName.charAt(0)
                                                    : "C"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium leading-none">
                                                {activeChatName || "Chat"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {currentRoom &&
                                                currentRoom.members
                                                    ? currentRoom.members
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Leave Chat Room Button */}
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="rounded-full"
                                                        onClick={() =>
                                                            setLeaveRoomDialogOpen(
                                                                true
                                                            )
                                                        }
                                                    >
                                                        <LogOut className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            Leave chat room
                                                        </span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent sideOffset={10}>
                                                    Leave chat room
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        {/* Add Users Button */}
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="rounded-full"
                                                        onClick={() =>
                                                            setOpen(true)
                                                        }
                                                    >
                                                        <Plus />
                                                        <span className="sr-only">
                                                            Add users
                                                        </span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent sideOffset={10}>
                                                    Add users to chat
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
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
                                                {messages.map(
                                                    (message, index) => (
                                                        <div
                                                            key={index}
                                                            className={cn(
                                                                "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                                                message.role ===
                                                                    "user"
                                                                    ? "ml-auto bg-primary text-primary-foreground"
                                                                    : message.role ===
                                                                      "system"
                                                                    ? "mx-auto bg-destructive text-destructive-foreground"
                                                                    : "bg-muted"
                                                            )}
                                                        >
                                                            <div>{message.content}</div>
                                                        {message.timestamp && (
                                                            <div className={cn(
                                                                "text-[0.65rem] self-end mt-1 opacity-70",
                                                                message.role === "user" 
                                                                    ? "text-primary-foreground" 
                                                                    : "text-muted-foreground"
                                                            )}>
                                                                {formatMessageTime(message.timestamp)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    )
                                                )}
                                                <div ref={lastMessageRef} />
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                                <CardFooter className="shrink-0">
                                    <form
                                        onSubmit={async (event) => {
                                            event.preventDefault();
                                            if (inputLength === 0) return;

                                            const messageText = input.trim();
                                            setInput("");

                                            try {
                                                // Only show optimistic UI update for non-empty messages
                                                if (messageText) {
                                                    // Add message to local state with a unique ID
                                                    const messageId =
                                                        Date.now().toString();
                                                    setMessages((prev) => [
                                                        ...prev,
                                                        {
                                                            id: messageId,
                                                            role: "user",
                                                            content:
                                                                messageText,
                                                            timestamp: new Date().toISOString(),
                                                        } as any,
                                                    ]);

                                                    // Send with delay for proper syncing
                                                    await sendMessageToServer(
                                                        Number(activeChatId),
                                                        messageText,
                                                        userName,
                                                        httpManager
                                                    );
                                                }

                                                // Add a small delay before scrolling
                                                setTimeout(() => {
                                                    if (
                                                        lastMessageRef.current
                                                    ) {
                                                        lastMessageRef.current.scrollIntoView(
                                                            {
                                                                behavior:
                                                                    "smooth",
                                                                block: "end",
                                                            }
                                                        );
                                                    }
                                                }, 100);
                                            } catch (error) {
                                                console.error(
                                                    "Error sending message:",
                                                    error
                                                );
                                            }
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
                                            <span className="sr-only">
                                                Send
                                            </span>
                                        </Button>
                                    </form>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                </SidebarInset>

                {/* Dialog for Adding Users to Chat */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="gap-0 p-0 outline-none">
                        <DialogHeader className="px-4 pb-4 pt-5">
                            <DialogTitle>Add Users to Chat</DialogTitle>
                            <DialogDescription>
                                Select users to add to this chat room.
                            </DialogDescription>
                        </DialogHeader>
                        <Command className="overflow-hidden rounded-t-none border-t bg-transparent">
                            <CommandInput placeholder="Search user..." />
                            <CommandList>
                                <CommandEmpty>No users found.</CommandEmpty>
                                <CommandGroup className="p-2">
                                    {users
                                        // Filter out users who are already members
                                        .filter((user) => {
                                            // If we have a current room
                                            if (
                                                currentRoom &&
                                                currentRoom.members
                                            ) {
                                                // Check if the user's email is in the members list
                                                const memberEmails: string[] =
                                                    currentRoom.members
                                                        .split(", ")
                                                        .map(
                                                            (
                                                                member: string
                                                            ): string => {
                                                                // Handle the "me" case which represents the current user
                                                                return member ===
                                                                    "me"
                                                                    ? userName
                                                                    : member;
                                                            }
                                                        );

                                                // Only show users who are NOT already members
                                                return !memberEmails.includes(
                                                    user.email
                                                );
                                            }
                                            // If no current room or no members, show all users
                                            return true;
                                        })
                                        .map((user) => (
                                            <CommandItem
                                                key={user.email}
                                                className="flex items-center px-2"
                                                onSelect={() => {
                                                    if (
                                                        selectedUsers.includes(
                                                            user
                                                        )
                                                    ) {
                                                        return setSelectedUsers(
                                                            selectedUsers.filter(
                                                                (
                                                                    selectedUser
                                                                ) =>
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
                                                {selectedUsers.includes(
                                                    user
                                                ) ? (
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
                                    Select users to add to this chat room.
                                </p>
                            )}
                            <Button
                                disabled={selectedUsers.length === 0}
                                onClick={handleAddUsers}
                            >
                                Add Users
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog for Creating New Room */}
                <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                    <DialogContent className="gap-0 p-0 outline-none">
                        <DialogHeader className="px-4 pb-4 pt-5">
                            <DialogTitle>Create New Chat Room</DialogTitle>
                            <DialogDescription>
                                Enter a name for your chat room and select
                                members to add.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="p-4 border-t">
                            <div className="mb-4">
                                <label className="text-sm font-medium mb-1 block">
                                    Room Name
                                </label>
                                <Input
                                    placeholder="Enter room name..."
                                    value={roomTitle}
                                    onChange={(e) =>
                                        setRoomTitle(e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <Command className="overflow-hidden border-t bg-transparent">
                            <CommandInput placeholder="Search users to add..." />
                            <CommandList>
                                <CommandEmpty>No users found.</CommandEmpty>
                                <CommandGroup className="p-2">
                                    {users.map((user) => (
                                        <CommandItem
                                            key={user.email}
                                            className="flex items-center px-2"
                                            onSelect={() => {
                                                if (
                                                    selectedMembers.includes(
                                                        user.email
                                                    )
                                                ) {
                                                    setSelectedMembers(
                                                        selectedMembers.filter(
                                                            (email) =>
                                                                email !==
                                                                user.email
                                                        )
                                                    );
                                                } else {
                                                    setSelectedMembers([
                                                        ...selectedMembers,
                                                        user.email,
                                                    ]);
                                                }
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
                                            {selectedMembers.includes(
                                                user.email
                                            ) ? (
                                                <Check className="ml-auto flex h-5 w-5 text-primary" />
                                            ) : null}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        <DialogFooter className="flex items-center border-t p-4 sm:justify-between">
                            {selectedMembers.length > 0 ? (
                                <div className="text-sm">
                                    <strong>
                                        {selectedMembers.length - 1}
                                    </strong>{" "}
                                    members selected
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Select users to add to this room.
                                </p>
                            )}
                            <Button
                                disabled={
                                    !roomTitle || selectedMembers.length < 2
                                }
                                onClick={handleCreateRoom}
                            >
                                Create Room
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog for Leaving Room Confirmation */}
                <Dialog
                    open={leaveRoomDialogOpen}
                    onOpenChange={(isOpen) => {
                        // Only update state if the dialog is being closed (not opened)
                        if (!isOpen) {
                            setLeaveRoomDialogOpen(false);
                            // Don't trigger any leave action when closing via X button or ESC key
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Leave Chat Room</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to leave this chat room?
                                You won't receive any more messages from this
                                conversation.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setLeaveRoomDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleLeaveRoom}
                            >
                                Leave Room
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </SidebarProvider>
    );
}
