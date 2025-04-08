"use client";

import React, { useState } from "react";
import { OrderHistoryTable } from "@/components/order-history-table";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";

interface Order {
    id: string;
    action: "Buy" | "Sell";
    type: "Market" | "Limit" | "Stop";
    details: string;
    quantity: number;
    fillPrice: number | null;
    status: "Pending" | "Filled" | "Cancelled";
    timestamp: Date;
}

export default function OrderEntryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [bid, setBid] = useState(145.75); // Initial bid price
    const [ask, setAsk] = useState(146.68); // Initial ask price
    const [position, setPosition] = useState(50); // Position as a percentage (0-100)
    const [quantity, setQuantity] = useState(300); // Initial quantity

    // Calculate mid price for display
    const mid = (bid + ask) / 2;

    // Update position when slider moves
    const updatePosition = (newPosition: number[]) => {
        setPosition(newPosition[0]);
    };

    // Handle order submission
    const handleOrderSubmit = (
        newOrder: Omit<Order, "id" | "timestamp" | "status" | "fillPrice">
    ) => {
        const order: Order = {
            ...newOrder,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date(),
            status: "Pending",
            fillPrice: null,
        };
        setOrders([order, ...orders]);
    };

    // Handle order cancellation
    const handleCancelOrder = (orderId: string) => {
        setOrders(
            orders.map((order) =>
                order.id === orderId ? { ...order, status: "Cancelled" } : order
            )
        );
    };

    // Calculate the price at the current position
    const positionPrice = bid + ((ask - bid) * position) / 100;
    const { setTheme } = useTheme();
    setTheme("dark");

    return (
        <div className="container mx-auto py-6 space-y-8 bg-background text-foreground">
            <h1 className="text-3xl font-bold">Order Entry</h1>

            <Card className="bg-card text-card-foreground">
                <CardHeader>
                    <CardTitle>Order Entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Quantity Input */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="quantity"
                                className="text-sm font-medium"
                            >
                                Quantity
                            </label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) =>
                                    setQuantity(Number(e.target.value))
                                }
                                className="w-full bg-input text-foreground"
                            />
                        </div>
                    </div>

                    {/* Price Slider and Inputs */}
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Bid: ${bid.toFixed(2)}</span>
                            {/* <span>Mid: ${mid.toFixed(2)}</span> */}
                            <span>Ask: ${ask.toFixed(2)}</span>
                        </div>
                        <div className="relative">
                            {/* Position Label Above Slider */}
                            <div className="absolute left-1/2 transform -translate-x-1/2 -top-6 text-xs text-foreground">
                                Position: ${positionPrice.toFixed(2)}
                            </div>
                            <Slider
                                value={[position]}
                                onValueChange={updatePosition}
                                max={100}
                                step={1}
                                className="w-full"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="bid"
                                    className="text-sm font-medium"
                                >
                                    Bid
                                </label>
                                <Input
                                    id="bid"
                                    type="number"
                                    step="0.01"
                                    value={bid}
                                    onChange={(e) =>
                                        setBid(Number(e.target.value))
                                    }
                                    className="w-full bg-input text-foreground"
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="ask"
                                    className="text-sm font-medium"
                                >
                                    Ask
                                </label>
                                <Input
                                    id="ask"
                                    type="number"
                                    step="0.01"
                                    value={ask}
                                    onChange={(e) =>
                                        setAsk(Number(e.target.value))
                                    }
                                    className="w-full bg-input text-foreground"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Buy and Sell Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() =>
                                handleOrderSubmit({
                                    action: "Buy",
                                    type: "Limit",
                                    details: `Limit @ $${positionPrice.toFixed(
                                        2
                                    )}`,
                                    quantity,
                                })
                            }
                        >
                            Buy
                        </Button>
                        <Button
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={() =>
                                handleOrderSubmit({
                                    action: "Sell",
                                    type: "Limit",
                                    details: `Limit @ $${positionPrice.toFixed(
                                        2
                                    )}`,
                                    quantity,
                                })
                            }
                        >
                            Sell
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Order History</h2>
                <OrderHistoryTable
                    orders={orders}
                    onCancelOrder={handleCancelOrder}
                />
            </div>
        </div>
    );
}
