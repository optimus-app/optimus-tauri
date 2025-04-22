"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command as CommandPrimitive } from "cmdk";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";

export function CommandLineInput({
    onAction,
    inputWidth = "200px",
    groups = [],
    open,
    onOpenChange,
}: {
    onAction?: (command: string, args: string[], fullInput: string) => void;
    inputWidth?: string;
    groups?: { label?: string; items: { value: string; label: string }[] }[];
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [search, setSearch] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const parseCommandLine = (input: string) => {
        const parts = input.trim().match(/("[^"]+"|[^\s"]+)/g) || [];
        return parts.map((part) => part.replace(/^"(.*)"$/, "$1"));
    };

    const getCommandPart = (input: string) => {
        return input.split(/\s+/)[0] || "";
    };

    React.useEffect(() => {
        if (open) {
            inputRef.current?.focus();
        }
    }, [open]);

    React.useEffect(() => {
        const handleShortcut = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes("MAC");
            if (
                (isMac && e.metaKey && e.key === "k") ||
                (!isMac && e.ctrlKey && e.key === "k")
            ) {
                e.preventDefault();
                inputRef.current?.focus();
                onOpenChange?.(true);
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => {
            window.removeEventListener("keydown", handleShortcut);
        };
    }, [onOpenChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        try {
            const highlightedItem = document.querySelector(
                '[cmdk-item][aria-selected="true"]'
            ) as HTMLElement | null;

            if (e.key === "Enter") {
                e.preventDefault();
                if (search.trim()) {
                    const parts = parseCommandLine(search);
                    const command = parts[0];
                    const args = parts.slice(1);
                    onAction?.(command, args, search);
                    setSearch("");
                    onOpenChange?.(false);
                    inputRef.current?.blur();
                }
            } else if (e.key === "Tab" && highlightedItem) {
                e.preventDefault();
                const currentValue =
                    highlightedItem.getAttribute("data-item-value");
                if (currentValue) {
                    const currentArgs = search.slice(
                        getCommandPart(search).length
                    );
                    setSearch(currentValue + currentArgs);
                }
            } else if (e.key === "Escape") {
                setTimeout(() => {
                    onOpenChange?.(false);
                    inputRef.current?.blur();
                }, 0);
            }
        } catch (error) {
            // Optionally log the error if needed, but don't rethrow it.
            console.error("KeyDown handler error:", error);
        }
    };

    return (
        <div className="flex items-center">
            <Popover open={open} onOpenChange={onOpenChange}>
                <Command
                    filter={(value, search) => {
                        const commandPart = getCommandPart(
                            search.toLowerCase()
                        );
                        if (!commandPart) return 1;
                        const itemValue = value.toLowerCase();
                        if (itemValue.includes(commandPart)) return 1;
                        return 0;
                    }}
                >
                    <PopoverPrimitive.Anchor asChild>
                        <CommandPrimitive.Input
                            asChild
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Type a command..."
                            onKeyDown={handleKeyDown}
                            onFocus={() => onOpenChange?.(true)}
                            ref={inputRef}
                            style={{ width: inputWidth }}
                            className="w-full"
                        >
                            <Input />
                        </CommandPrimitive.Input>
                    </PopoverPrimitive.Anchor>
                    <PopoverContent
                        asChild
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        <CommandList>
                            <CommandEmpty>No commands found.</CommandEmpty>

                            {groups.map((group, idx) => (
                                <CommandGroup key={idx}>
                                    {group.label && (
                                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                            {group.label}
                                        </div>
                                    )}
                                    {group.items.map((item) => {
                                        const searchCommand = getCommandPart(
                                            search.toLowerCase()
                                        );
                                        const combinedSearchValue =
                                            `${item.value} ${item.label}`.toLowerCase();

                                        const shouldShow =
                                            !searchCommand ||
                                            combinedSearchValue.includes(
                                                searchCommand
                                            );

                                        return shouldShow ? (
                                            <CommandItem
                                                key={item.value}
                                                value={item.value}
                                                data-item-value={item.value}
                                                data-item-label={item.label}
                                                onSelect={() => {
                                                    const currentArgs =
                                                        search.slice(
                                                            getCommandPart(
                                                                search
                                                            ).length
                                                        );
                                                    const newSearch =
                                                        item.value +
                                                        currentArgs;
                                                    setSearch(newSearch);
                                                }}
                                            >
                                                <div className="flex w-full items-center justify-between">
                                                    <span>{item.label}</span>
                                                    <span className="ml-2 text-sm text-gray-400">
                                                        {item.value}
                                                    </span>
                                                </div>
                                            </CommandItem>
                                        ) : null;
                                    })}
                                </CommandGroup>
                            ))}
                        </CommandList>
                    </PopoverContent>
                </Command>
            </Popover>
        </div>
    );
}

export default CommandLineInput;
