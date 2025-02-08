"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { GalleryVerticalEnd } from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface SubItem {
    title: string;
    url: string;
    isActive?: boolean;
    id?: string | number;
}

interface MenuItem {
    title: string;
    url: string;
    items?: SubItem[];
    id?: string | number;
}

interface SidebarData {
    navMain: MenuItem[];
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    data: SidebarData;
    username?: string;
    onChatSelect?: (chatId: string | number) => void;
    activeRoomId?: string | number;
}

export function AppSidebar({
    data,
    username = "User1",
    onChatSelect,
    activeRoomId,
    ...props
}: AppSidebarProps) {
    // Initially, the time is computed on the server, and may differ from the client.
    // To prevent a hydration error, we use the suppressHydrationWarning prop.
    const [currentTime, setCurrentTime] = useState(
        new Date().toLocaleTimeString()
    );

    const handleChatClick = (
        event: React.MouseEvent,
        chatId?: string | number
    ) => {
        event.preventDefault();
        if (chatId && onChatSelect) {
            onChatSelect(chatId);
            console.log("Chat selected:", chatId);
            console.log(activeRoomId);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <Sidebar variant="floating" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <GalleryVerticalEnd className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold">
                                        {username}
                                    </span>
                                    {/* Using suppressHydrationWarning here prevents errors if the server time differs from the client */}
                                    <span suppressHydrationWarning>
                                        {currentTime}
                                    </span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu className="gap-2">
                        {data.navMain.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                    <a
                                        href={item.url}
                                        className="font-medium"
                                        onClick={(e) =>
                                            handleChatClick(e, item.id)
                                        }
                                    >
                                        {item.title}
                                    </a>
                                </SidebarMenuButton>
                                {item.items?.length ? (
                                    <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem
                                                key={subItem.title}
                                            >
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={
                                                        subItem.id ===
                                                        activeRoomId
                                                    }
                                                >
                                                    <a
                                                        href={subItem.url}
                                                        onClick={(e) =>
                                                            handleChatClick(
                                                                e,
                                                                subItem.id
                                                            )
                                                        }
                                                    >
                                                        {subItem.title}
                                                    </a>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                ) : null}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}

export default AppSidebar;
