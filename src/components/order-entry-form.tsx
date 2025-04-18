import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface OrderEntryFormProps {
    onSubmit: (order: {
        action: "Buy" | "Sell";
        type: "Market" | "Limit" | "Stop";
        details: string;
        quantity: number;
    }) => void;
}

export function OrderEntryForm({ onSubmit }: OrderEntryFormProps) {
    const [quantity, setQuantity] = useState(1);
    const [orderType, setOrderType] = useState<"Market" | "Limit" | "Stop">(
        "Market"
    );
    const [limitPrice, setLimitPrice] = useState(0);

    // Mock market data
    const marketPrice = 152.75;
    const bidPrice = marketPrice - 0.05;
    const askPrice = marketPrice + 0.05;
    const spread = askPrice - bidPrice;

    // Calculate position in the price range for the slider
    const sliderPosition =
        ((marketPrice - bidPrice) / (askPrice - bidPrice)) * 100;

    const handleSubmitBuy = () => {
        onSubmit({
            action: "Buy",
            type: orderType,
            details:
                orderType === "Market"
                    ? "Market Order"
                    : `${orderType} @ $${limitPrice.toFixed(2)}`,
            quantity,
        });
    };

    const handleSubmitSell = () => {
        onSubmit({
            action: "Sell",
            type: orderType,
            details:
                orderType === "Market"
                    ? "Market Order"
                    : `${orderType} @ $${limitPrice.toFixed(2)}`,
            quantity,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Order Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Interactive Price Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Bid: ${bidPrice.toFixed(2)}</span>
                        <span>Spread: ${spread.toFixed(2)}</span>
                        <span>Ask: ${askPrice.toFixed(2)}</span>
                    </div>

                    <div className="relative h-8 bg-gray-100 rounded-md">
                        {/* Market price indicator */}
                        <div
                            className="absolute top-0 w-0.5 h-full bg-black"
                            style={{ left: `${sliderPosition}%` }}
                        />
                        <div
                            className="absolute -top-6 text-xs"
                            style={{
                                left: `${sliderPosition}%`,
                                transform: "translateX(-50%)",
                            }}
                        >
                            ${marketPrice.toFixed(2)}
                        </div>

                        {/* Bid area */}
                        <div
                            className="absolute top-0 left-0 h-full bg-green-100 rounded-l-md"
                            style={{ width: `${sliderPosition}%` }}
                        />

                        {/* Ask area */}
                        <div
                            className="absolute top-0 right-0 h-full bg-red-100 rounded-r-md"
                            style={{ width: `${100 - sliderPosition}%` }}
                        />
                    </div>
                </div>

                {/* Order Form */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) =>
                                setQuantity(Number(e.target.value))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="orderType">Order Type</Label>
                        <Select
                            value={orderType}
                            onValueChange={(value) =>
                                setOrderType(value as any)
                            }
                        >
                            <SelectTrigger id="orderType">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Market">Market</SelectItem>
                                <SelectItem value="Limit">Limit</SelectItem>
                                <SelectItem value="Stop">Stop</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {orderType !== "Market" && (
                    <div className="space-y-2">
                        <Label htmlFor="limitPrice">
                            {orderType} Price ($)
                        </Label>
                        <Input
                            id="limitPrice"
                            type="number"
                            step="0.01"
                            value={limitPrice}
                            onChange={(e) =>
                                setLimitPrice(Number(e.target.value))
                            }
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleSubmitBuy}
                    >
                        Buy
                    </Button>
                    <Button
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={handleSubmitSell}
                    >
                        Sell
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
