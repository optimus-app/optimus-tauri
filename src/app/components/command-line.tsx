"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command as CommandPrimitive } from "cmdk";

import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";

/**
 * Modified so that:
 * 1) Each item shows its label and, on the right side (small gray text), the item's value.
 * 2) Tab auto-fills the *value* into the input (instead of the label).
 * 3) Searching is possible by both the label and the value.
 *
 * You can supply any groups array with shape:
 * [
 *   {
 *     label?: string;
 *     items: { value: string; label: string }[];
 *   }
 * ]
 * and optionally control open state via `open` and `onOpenChange`.
 */
export function CommandLineInput({
    onAction,
    inputWidth = "200px",
    groups = [],
    open,
    onOpenChange,
}: {
    onAction?: (currentValue: string, currentLabel: string) => void;
    inputWidth?: string;
    groups?: { label?: string; items: { value: string; label: string }[] }[];
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [search, setSearch] = React.useState("");
    const [value, setValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Automatically focus the input field when the dropdown is opened
    React.useEffect(() => {
        if (open) {
            inputRef.current?.focus();
        }
    }, [open]);

    // Handle `Command + K` or `Ctrl + K` shortcut
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

    // Handle keydown events for autocomplete (Tab, Enter, Escape)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const highlightedItem = document.querySelector(
            '[cmdk-item][aria-selected="true"]'
        ) as HTMLElement | null;

        if (e.key === "Enter" && highlightedItem) {
            // Select the highlighted item with Enter
            const currentValue =
                highlightedItem.getAttribute("data-item-value");
            const currentLabel =
                highlightedItem.getAttribute("data-item-label");
            if (currentValue && currentLabel) {
                onAction?.(currentValue, currentLabel);
                setValue(currentValue); // store the value in state
                setSearch("");
                onOpenChange?.(false);
                inputRef.current?.blur();
            }
        } else if (e.key === "Tab" && highlightedItem) {
            // Autofill the *value* into the input with Tab
            e.preventDefault();
            const currentValue =
                highlightedItem.getAttribute("data-item-value");
            if (currentValue) {
                setSearch(currentValue);
            }
        } else if (e.key === "Escape") {
            onOpenChange?.(false);
            inputRef.current?.blur();
        }
    };

    return (
        <div className="flex items-center">
            <Popover open={open} onOpenChange={onOpenChange}>
                <Command>
                    <PopoverPrimitive.Anchor asChild>
                        <CommandPrimitive.Input
                            asChild
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Select framework..."
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
                            <CommandEmpty>No items found.</CommandEmpty>

                            {groups.map((group, idx) => (
                                <CommandGroup key={idx}>
                                    {group.label && (
                                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                            {group.label}
                                        </div>
                                    )}
                                    {group.items.map((item) => {
                                        // Combine item.value and item.label
                                        // so that users can search by either
                                        const combinedSearchValue = `${item.value} ${item.label}`;
                                        return (
                                            <CommandItem
                                                key={item.value}
                                                value={combinedSearchValue}
                                                // We'll store the actual value and label in data attributes
                                                data-item-value={item.value}
                                                data-item-label={item.label}
                                                onSelect={() => {
                                                    onAction?.(
                                                        item.value,
                                                        item.label
                                                    );
                                                    setValue(item.value);
                                                    setSearch("");
                                                    onOpenChange?.(false);
                                                }}
                                            >
                                                <div className="flex w-full items-center justify-between">
                                                    <span>{item.label}</span>
                                                    {/* On the right side, show the value in small text */}
                                                    <span className="ml-2 text-sm text-gray-400">
                                                        {item.value}
                                                    </span>
                                                </div>
                                            </CommandItem>
                                        );
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
