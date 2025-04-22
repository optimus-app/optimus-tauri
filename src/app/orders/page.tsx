"use client";

import React, { useState, useEffect, useMemo } from "react";
import { OrderHistoryTable } from "@/components/order-history-table";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTheme } from "next-themes";
import WebSocketManager, { ProtocolType } from "@/app/utils/WebSocketManager";
import HTTPRequestManager, { Methods } from "@/app/utils/HTTPRequestManager";
import { ActiveOrdersTable } from "@/components/active-orders-table";
// Add these imports at the top of your file
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";

// Extended Order interface to match API response
interface Order {
    order_id: string;
    code: string;
    stock_name?: string;
    order_market?: string;
    trd_side: "BUY" | "SELL";
    order_type: string;
    order_status: string;
    qty: number;
    price: number;
    create_time?: string;
    updated_time?: string;
    dealt_qty?: number;
    dealt_avg_price?: number;
    currency?: string;
    // Additional fields for local state management
    timestamp?: Date;
}

// Strategy options
const STRATEGIES = [
    { id: "manual", name: "Manual Order" },
    { id: "twap", name: "Time-Weighted Average Price (TWAP)" },
    { id: "vwap", name: "Volume-Weighted Average Price (VWAP)" },
    { id: "poc", name: "Percentage of Volume (POV)" },
    { id: "iceberg", name: "Iceberg" },
];

// Sample markets and stocks
const MARKETS = [
    { id: "HK", name: "Hong Kong" },
    { id: "US", name: "United States" },
    { id: "CN", name: "China" },
];

const STOCKS = {
    HK: [
        { code: "HK.00700", name: "Tencent Holdings" },
        { code: "HK.09988", name: "Alibaba Group" },
        { code: "HK.03690", name: "Meituan" },
    ],
    US: [
        { code: "US.AAPL", name: "Apple Inc." },
        { code: "US.MSFT", name: "Microsoft Corp." },
        { code: "US.GOOGL", name: "Alphabet Inc." },
    ],
    CN: [
        { code: "CN.600519", name: "Kweichow Moutai" },
        { code: "CN.601318", name: "Ping An Insurance" },
        { code: "CN.600036", name: "China Merchants Bank" },
    ],
};

export default function OrderEntryPage() {
    const { toast } = useToast();
    // Get singleton instances of managers
    const wsManager = useMemo(() => WebSocketManager.getInstance(), []);
    const httpManager = useMemo(() => HTTPRequestManager.getInstance(), []);
    const ORDERS_WS_CONNECTION_ID = "orders-connection";

    // Order state
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [historicalOrders, setHistoricalOrders] = useState<Order[]>([]);
    const [bid, setBid] = useState(145.75);
    const [ask, setAsk] = useState(146.68);
    const [position, setPosition] = useState(50);
    const [quantity, setQuantity] = useState(100);

    // Selection state
    const [market, setMarket] = useState("HK");
    const [selectedStock, setSelectedStock] = useState("HK.00700");
    const [selectedStrategy, setSelectedStrategy] = useState("manual");

    // WebSocket state
    const [isConnected, setIsConnected] = useState(false);

    // Date range for order history
    const [startDate, setStartDate] = useState<Date | undefined>(
        new Date(new Date().setDate(new Date().getDate() - 30))
    );
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());

    // Calculate mid price
    const mid = (bid + ask) / 2;
    const positionPrice = bid + ((ask - bid) * position) / 100;

    const { setTheme } = useTheme();
    setTheme("dark");

    useEffect(() => {
        // Configure HTTP manager for the order server
        httpManager.addServer("orders-server", "http://0.0.0.0:9000/");

        // Rest of your initialization code
    }, [httpManager]);

    // Fetch historical orders
    // Fetch historical orders with timezone handling
    // Fetch historical orders with timezone handling
    const fetchOrderHistory = async () => {
        if (!startDate || !endDate) return;

        try {
            // Create dates at the start and end of the day in local time
            const localStartDate = new Date(startDate);
            localStartDate.setHours(0, 0, 0, 0);

            const localEndDate = new Date(endDate);
            localEndDate.setHours(23, 59, 59, 999);

            // Format dates in a way that preserves the local calendar date
            const formattedStartDate = `${localStartDate.getFullYear()}-${String(
                localStartDate.getMonth() + 1
            ).padStart(2, "0")}-${String(localStartDate.getDate()).padStart(
                2,
                "0"
            )}T00:00:00`;
            const formattedEndDate = `${localEndDate.getFullYear()}-${String(
                localEndDate.getMonth() + 1
            ).padStart(2, "0")}-${String(localEndDate.getDate()).padStart(
                2,
                "0"
            )}T23:59:59`;

            console.log("Start date (formatted):", formattedStartDate);
            console.log("End date (formatted):", formattedEndDate);

            const response = await httpManager.handleRequest(
                "api/v1/account/historicalOrders",
                Methods.POST,
                {
                    start_date: formattedStartDate,
                    end_date: formattedEndDate,
                    limit: 100,
                },
                "orders-server"
            );

            if (response && response.orders) {
                console.log("Response received");
                // Split orders into active and historical based on status
                const active: Order[] = [];
                const historical: Order[] = [];

                response.orders.forEach((order: Order) => {
                    if (
                        ["FILLED", "CANCELLED_ALL", "FAILED"].includes(
                            order.order_status
                        )
                    ) {
                        historical.push(order);
                    } else {
                        active.push(order);
                    }
                });

                // Update both state variables
                setActiveOrders(active);
                setHistoricalOrders(historical);
            }
        } catch (error) {
            console.error("Error fetching order history:", error);
        }
    };

    // WebSocket connection for order updates
    // WebSocket connection for order updates
    useEffect(() => {
        const initWebSocket = async () => {
            try {
                // Add a new connection for orders
                wsManager.addConnection(
                    ORDERS_WS_CONNECTION_ID,
                    "ws://localhost:9000/api/v1/ws/orders",
                    ProtocolType.RAW
                );

                // Add a subscription handler for the orders connection
                wsManager.addSubscriptionToConnection(
                    ORDERS_WS_CONNECTION_ID,
                    "/subscribe/orders/updates",
                    (msg: string) => {
                        try {
                            const data = JSON.parse(msg);
                            console.log(`Order Update:`, data);

                            if (data.type === "order_update") {
                                const orderUpdate = data.data;

                                // Check if this is a terminal status
                                const isTerminalStatus = [
                                    "FILLED",
                                    "CANCELLED_ALL",
                                    "FAILED",
                                ].includes(orderUpdate.order_status);

                                // Update active orders
                                setActiveOrders((prevOrders) => {
                                    const existingOrderIndex =
                                        prevOrders.findIndex(
                                            (order) =>
                                                order.order_id ===
                                                orderUpdate.order_id
                                        );

                                    // If terminal status, remove from active orders
                                    if (isTerminalStatus) {
                                        return prevOrders.filter(
                                            (order) =>
                                                order.order_id !==
                                                orderUpdate.order_id
                                        );
                                    }

                                    // Otherwise update or add the order
                                    if (existingOrderIndex >= 0) {
                                        const updatedOrders = [...prevOrders];
                                        updatedOrders[existingOrderIndex] = {
                                            ...updatedOrders[
                                                existingOrderIndex
                                            ],
                                            ...orderUpdate,
                                        };
                                        return updatedOrders;
                                    } else {
                                        // Add new order
                                        return [orderUpdate, ...prevOrders];
                                    }
                                });

                                // For terminal status orders, also add them to historical orders
                                if (isTerminalStatus) {
                                    setHistoricalOrders((prevHistorical) => {
                                        // Check if order is already in historical list
                                        const existingIndex =
                                            prevHistorical.findIndex(
                                                (order) =>
                                                    order.order_id ===
                                                    orderUpdate.order_id
                                            );

                                        if (existingIndex >= 0) {
                                            // Update existing historical order
                                            const updatedHistorical = [
                                                ...prevHistorical,
                                            ];
                                            updatedHistorical[existingIndex] = {
                                                ...updatedHistorical[
                                                    existingIndex
                                                ],
                                                ...orderUpdate,
                                            };
                                            return updatedHistorical;
                                        } else {
                                            // Add to historical orders
                                            return [
                                                orderUpdate,
                                                ...prevHistorical,
                                            ];
                                        }
                                    });
                                }
                            }
                        } catch (error) {
                            console.error(
                                "Error processing WebSocket message:",
                                error
                            );
                        }
                    }
                );

                await wsManager.startConnection(ORDERS_WS_CONNECTION_ID);
                setIsConnected(true);
            } catch (error) {
                console.error("WebSocket initialization failed:", error);
                setIsConnected(false);
            }
        };

        initWebSocket();

        return () => {
            wsManager.disconnectConnection(ORDERS_WS_CONNECTION_ID);
            setIsConnected(false);
        };
    }, [wsManager]);

    // Fetch order history when date range changes
    useEffect(() => {
        if (startDate && endDate) {
            fetchOrderHistory();
        }
    }, [startDate, endDate]);

    // Update position when slider moves
    const updatePosition = (newPosition: number[]) => {
        setPosition(newPosition[0]);
    };

    // Handle market change
    const handleMarketChange = (value: string) => {
        setMarket(value);
        // Set the first stock of selected market as default
        if (STOCKS[value as keyof typeof STOCKS]?.length > 0) {
            setSelectedStock(STOCKS[value as keyof typeof STOCKS][0].code);
        }
    };

    // Handle order submission
    const handleOrderSubmit = async (side: "BUY" | "SELL") => {
        try {
            const orderData = {
                code: selectedStock,
                side: side,
                qty: quantity,
                price: positionPrice,
            };

            const response = await httpManager.handleRequest(
                "api/v1/trade/order",
                Methods.POST,
                orderData,
                "orders-server"
            );

            console.log("Order submitted successfully:", response);

            // Show success toast
            toast({
                title: "Order Submitted",
                description: `${side} order for ${quantity} shares of ${selectedStock} at $${positionPrice.toFixed(
                    2
                )}`,
                variant: "default",
            });
        } catch (error: any) {
            console.error("Error submitting order:", error);

            // Check if it's a server error (status code 500)
            if (
                error.status === 500 ||
                (error.message && error.message.includes("500"))
            ) {
                toast({
                    title: "Server Error",
                    description:
                        error.message ||
                        "Failed to process order. Please try again later.",
                    variant: "destructive",
                    action: (
                        <ToastAction
                            altText="Try again"
                            onClick={() => handleOrderSubmit(side)}
                        >
                            Retry
                        </ToastAction>
                    ),
                });
            } else {
                // Generic error toast
                toast({
                    title: "Order Failed",
                    description:
                        error.message ||
                        "Unable to submit order. Please check your inputs and try again.",
                    variant: "destructive",
                });
            }
        }
    };

    // Execute algorithmic trading strategy
    const executeStrategy = async () => {
        try {
            const strategyData = {
                code: selectedStock,
                strategy: selectedStrategy,
                qty: quantity,
                price: positionPrice,
            };

            const response = await httpManager.handleRequest(
                "api/v1/algo/execute",
                Methods.POST,
                strategyData,
                "orders-server"
            );

            console.log("Strategy execution initiated:", response);

            // Show success toast
            toast({
                title: "Strategy Initiated",
                description: `${selectedStrategy} strategy started for ${quantity} shares of ${selectedStock}`,
                variant: "default",
            });
        } catch (error: any) {
            console.error("Error executing strategy:", error);

            // Check if it's a server error (status code 500)
            if (
                error.status === 500 ||
                (error.message && error.message.includes("500"))
            ) {
                toast({
                    title: "Server Error",
                    description:
                        error.message ||
                        "Failed to start strategy. Please try again later.",
                    variant: "destructive",
                    action: (
                        <ToastAction
                            altText="Try again"
                            onClick={executeStrategy}
                        >
                            Retry
                        </ToastAction>
                    ),
                });
            } else {
                // Generic error toast
                toast({
                    title: "Strategy Failed",
                    description:
                        error.message ||
                        "Unable to execute strategy. Please check your inputs and try again.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        try {
            // Changed to DELETE method with order_id in the URL path
            const response = await httpManager.handleRequest(
                `api/v1/trade/order/${orderId}`,
                Methods.DELETE,
                null, // No body needed for DELETE request
                "orders-server"
            );

            console.log("Order cancellation requested:", response);
            // The order status update will come through the WebSocket
        } catch (error) {
            console.error("Error cancelling order:", error);
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-8 bg-background text-foreground">
            <h1 className="text-3xl font-bold">Order Entry</h1>

            {/* Order Entry Card */}
            <Card className="bg-card text-card-foreground">
                <CardHeader>
                    <CardTitle>Order Entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Market and Stock Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Market
                            </label>
                            <Select
                                value={market}
                                onValueChange={handleMarketChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select market" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MARKETS.map((market) => (
                                        <SelectItem
                                            key={market.id}
                                            value={market.id}
                                        >
                                            {market.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stock</label>
                            <Select
                                value={selectedStock}
                                onValueChange={setSelectedStock}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select stock" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STOCKS[market as keyof typeof STOCKS]?.map(
                                        (stock) => (
                                            <SelectItem
                                                key={stock.code}
                                                value={stock.code}
                                            >
                                                {stock.name} ({stock.code})
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Strategy Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Trading Strategy
                        </label>
                        <Select
                            value={selectedStrategy}
                            onValueChange={setSelectedStrategy}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select strategy" />
                            </SelectTrigger>
                            <SelectContent>
                                {STRATEGIES.map((strategy) => (
                                    <SelectItem
                                        key={strategy.id}
                                        value={strategy.id}
                                    >
                                        {strategy.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quantity Input */}
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

                    {/* Price Slider and Inputs */}
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Bid: ${bid.toFixed(2)}</span>
                            <span>Mid: ${mid.toFixed(2)}</span>
                            <span>Ask: ${ask.toFixed(2)}</span>
                        </div>
                        <div className="relative">
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

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-4">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleOrderSubmit("BUY")}
                            disabled={selectedStrategy !== "manual"}
                        >
                            Buy
                        </Button>
                        <Button
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={() => handleOrderSubmit("SELL")}
                            disabled={selectedStrategy !== "manual"}
                        >
                            Sell
                        </Button>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={executeStrategy}
                            disabled={selectedStrategy === "manual"}
                        >
                            Execute Strategy
                        </Button>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center space-x-2 text-sm">
                        <div
                            className={`w-3 h-3 rounded-full ${
                                isConnected ? "bg-green-500" : "bg-red-500"
                            }`}
                        ></div>
                        <span>
                            {isConnected
                                ? "Connected to order updates"
                                : "Disconnected"}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Active Orders Section */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Active Orders</h2>
                    <div className="text-sm text-muted-foreground">
                        Showing orders that are not filled or cancelled
                    </div>
                </div>
                <ActiveOrdersTable
                    orders={activeOrders}
                    onCancelOrder={handleCancelOrder}
                />
            </div>

            {/* History Tab for completed/historical orders */}
            <Tabs defaultValue="history" className="w-full mt-8">
                <TabsList>
                    <TabsTrigger value="history">Order History</TabsTrigger>
                </TabsList>

                <TabsContent value="history">
                    <Card className="bg-card text-card-foreground">
                        <CardHeader>
                            <CardTitle>Completed Orders</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Date Range Selection */}
                            <div className="flex space-x-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Start Date
                                    </label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-[240px] justify-start text-left font-normal"
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {startDate
                                                    ? format(startDate, "PPP")
                                                    : "Pick a date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={startDate}
                                                onSelect={setStartDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        End Date
                                    </label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-[240px] justify-start text-left font-normal"
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {endDate
                                                    ? format(endDate, "PPP")
                                                    : "Pick a date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={endDate}
                                                onSelect={setEndDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="self-end">
                                    <Button onClick={fetchOrderHistory}>
                                        Refresh Orders
                                    </Button>
                                </div>
                            </div>

                            <OrderHistoryTable
                                orders={historicalOrders}
                                onCancelOrder={handleCancelOrder}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <Toaster />
        </div>
    );
}
