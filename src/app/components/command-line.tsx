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

const frameworks = [
    {
        value: "next.js",
        label: "Next.js",
    },
    {
        value: "sveltekit",
        label: "SvelteKit",
    },
    {
        value: "nuxt.js",
        label: "Nuxt.js",
    },
    {
        value: "remix",
        label: "Remix",
    },
    {
        value: "astro",
        label: "Astro",
    },
];

export function CommandLineInput({
    onAction,
    inputWidth = "200px", // Customizable input width
    groups = [{ label: "Suggestions", items: frameworks }], // Supports multiple groups with labels
}: {
    onAction?: (currentValue: string, currentLabel: string) => void; // Callback with both value and label
    inputWidth?: string; // Customizable input width
    groups?: { label?: string; items: { value: string; label: string }[] }[]; // Data with groups and labels
}) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [value, setValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null); // Ref for the input field

    // Handle `Command + K` or `Ctrl + K` shortcut
    React.useEffect(() => {
        const handleShortcut = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes("MAC");
            if (
                (isMac && e.metaKey && e.key === "k") ||
                (!isMac && e.ctrlKey && e.key === "k")
            ) {
                e.preventDefault();
                inputRef.current?.focus(); // Focus the input field
                setOpen(true); // Open the dropdown
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => {
            window.removeEventListener("keydown", handleShortcut);
        };
    }, []);

    // Handle keydown events for autocomplete (Tab, Enter, Escape)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const highlightedItem = document.querySelector(
            '[cmdk-item][aria-selected="true"]'
        ) as HTMLElement | null;

        if (e.key === "Enter" && highlightedItem) {
            // Select the highlighted item with Enter
            const currentValue = highlightedItem.getAttribute("value");
            const currentLabel = highlightedItem.textContent?.trim();
            if (currentValue && currentLabel) {
                onAction?.(currentValue, currentLabel); // Trigger onAction with value and label
                setValue(currentLabel); // Set the selected value
                setSearch(""); // Clear the search
                setOpen(false); // Close the dropdown
                inputRef.current?.blur(); // Blur the input after selection
            }
        } else if (e.key === "Tab" && highlightedItem) {
            // Autofill with the highlighted option on Tab, but keep the dropdown open
            e.preventDefault();
            const currentLabel = highlightedItem.textContent?.trim();
            if (currentLabel) {
                setSearch(currentLabel); // Autofill the input with the label
            }
        } else if (e.key === "Escape") {
            // Close the dropdown on Escape
            setOpen(false);
            inputRef.current?.blur(); // Remove focus from the input field
        }
    };

    return (
        <div className="flex items-center">
            <Popover open={open} onOpenChange={setOpen}>
                <Command>
                    <PopoverPrimitive.Anchor asChild>
                        <CommandPrimitive.Input
                            asChild
                            value={search}
                            onValueChange={setSearch}
                            onKeyDown={handleKeyDown} // Handle keydown events
                            onMouseDown={() =>
                                setOpen((open) => !!search || !open)
                            }
                            onFocus={() => setOpen(true)}
                            onBlur={() => {
                                // Preserve the input value but keep the dropdown closed
                                setSearch((prev) => prev);
                            }}
                        >
                            <Input
                                ref={inputRef} // Attach the ref to the input
                                placeholder="Select framework..."
                                style={{ width: inputWidth }} // Apply customizable width
                                className="w-full"
                            />
                        </CommandPrimitive.Input>
                    </PopoverPrimitive.Anchor>
                    {!open && (
                        <CommandList aria-hidden="true" className="hidden" />
                    )}
                    <PopoverContent
                        asChild
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onInteractOutside={(e) => {
                            if (
                                e.target instanceof Element &&
                                e.target.hasAttribute("cmdk-input")
                            ) {
                                e.preventDefault();
                            }
                        }}
                        style={{ width: inputWidth }} // Apply customizable popover width
                        className="p-0"
                    >
                        <CommandList>
                            <CommandEmpty>No framework found.</CommandEmpty>
                            {groups.map((group, idx) => (
                                <CommandGroup key={idx}>
                                    {group.label && (
                                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                            {group.label}
                                        </div>
                                    )}
                                    {group.items.map((item) => (
                                        <CommandItem
                                            key={item.value}
                                            value={item.value}
                                            className="hover:bg-muted hover:text-foreground" // Default highlighting
                                            onMouseDown={(e) =>
                                                e.preventDefault()
                                            }
                                            onSelect={() => {
                                                onAction?.(
                                                    item.value,
                                                    item.label
                                                ); // Pass both value and label to onAction
                                                setValue(item.label); // Set the selected value
                                                setSearch(""); // Clear the search
                                                setOpen(false); // Close the dropdown
                                                inputRef.current?.blur(); // Blur the input after selection
                                            }}
                                        >
                                            <span className="mr-6" />{" "}
                                            {/* Preserve spacing */}
                                            {item.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            ))}
                        </CommandList>
                    </PopoverContent>
                </Command>
            </Popover>
        </div>
    );
}
