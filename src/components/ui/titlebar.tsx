"use client";

import * as React from "react";
import { X, Minus, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitlebarProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
}

export function Titlebar({
    title = "Optimus CLI",
    className,
    ...props
}: TitlebarProps) {
    // We need to use client-side code to access the Tauri API
    const [mounted, setMounted] = React.useState(false);

    // Add this useEffect to update the mounted state when component mounts
    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Handle window actions
    const handleMinimize = async () => {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.minimize();
        } catch (e) {
            console.error("Failed to minimize window", e);
        }
    };

    const handleMaximize = async () => {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.toggleMaximize();
        } catch (e) {
            console.error("Failed to maximize window", e);
        }
    };

    const handleClose = async () => {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.close();
        } catch (e) {
            console.error("Failed to close window", e);
        }
    };

    const handleTitleBarMouseDown = async (e: React.MouseEvent) => {
        if (e.buttons === 1) {
            try {
                const appWindow = getCurrentWindow();
                if (e.detail === 2) {
                    // Double click to maximize/restore
                    await appWindow.toggleMaximize();
                } else {
                    // Start dragging on single click
                    await appWindow.startDragging();
                }
            } catch (e) {
                console.error("Failed to interact with window", e);
            }
        }
    };

    return (
        <div
            className={cn(
                "h-8 bg-background border-b border-border flex items-center justify-between select-none fixed top-0 left-0 right-0 z-50 w-full",
                className
            )}
            onMouseDown={handleTitleBarMouseDown}
            data-tauri-drag-region
            {...props}
        >
            <div className="px-3 text-sm font-medium">{title}</div>

            <div className="flex">
                <button
                    className="h-8 w-12 inline-flex items-center justify-center hover:bg-muted transition-colors"
                    onClick={handleMinimize}
                    aria-label="Minimize"
                    disabled={!mounted}
                >
                    <Minus className="h-4 w-4" />
                </button>
                <button
                    className="h-8 w-12 inline-flex items-center justify-center hover:bg-muted transition-colors"
                    onClick={handleMaximize}
                    aria-label="Maximize"
                    disabled={!mounted}
                >
                    <Square className="h-4 w-4" />
                </button>
                <button
                    className="h-8 w-12 inline-flex items-center justify-center hover:bg-red-500/90 group transition-colors"
                    onClick={handleClose}
                    aria-label="Close"
                    disabled={!mounted}
                >
                    <X className="h-4 w-4 group-hover:text-white" />
                </button>
            </div>
        </div>
    );
}
