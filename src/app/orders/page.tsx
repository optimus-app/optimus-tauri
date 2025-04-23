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
import {
    CalendarIcon,
    Plus,
    Minus,
    RefreshCw,
    AlertCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import WebSocketManager, { ProtocolType } from "@/app/utils/WebSocketManager";
import HTTPRequestManager, { Methods } from "@/app/utils/HTTPRequestManager";
import { ActiveOrdersTable } from "@/components/active-orders-table";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

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

// Updated Position interface to match actual API response
interface Position {
    code: string;
    quantity: number;
    avg_price: number;
    market_value: number;
    unrealized_pl: number;
    pl_ratio: number;
    // Optional fields in case they're missing
    can_sell_qty?: number;
    nominal_price?: number;
}

// Order book level interface
interface OrderBookLevel {
    price: number;
    volume: number;
}

// Order book data interface
interface OrderBookData {
    code: string;
    timestamp: string;
    bid: OrderBookLevel[];
    ask: OrderBookLevel[];
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

// Fetch current stock position and quote
const fetchStockPosition = async (
    code: string,
    httpManager: HTTPRequestManager
) => {
    try {
        const response = await httpManager.handleRequest(
            "api/v1/market/positions",
            Methods.POST,
            {
                trd_mkt: code.split(".")[0],
                refresh_cache: true,
            },
            "orders-server"
        );

        if (response && Array.isArray(response)) {
            // Find the position for the specified stock code with non-zero quantity
            const position = response.find(
                (pos: Position) => pos.code === code && pos.quantity > 0
            );
            return position || null;
        }
        return null;
    } catch (error) {
        console.error("Error fetching stock position:", error);
        return null;
    }
};

// Order Book display component
const OrderBookDisplay = ({
    orderBookData,
    isLoading,
    onPriceSelect,
}: {
    orderBookData: OrderBookData | null;
    isLoading: boolean;
    onPriceSelect: (price: number) => void;
}) => {
    // Find max volume for display scaling
    const maxVolume = useMemo(() => {
        if (!orderBookData) return 1000;

        const allVolumes = [
            ...(orderBookData.bid?.map((item) => item.volume) || []),
            ...(orderBookData.ask?.map((item) => item.volume) || []),
        ];

        return Math.max(...allVolumes, 1000);
    }, [orderBookData]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    Loading order book data...
                </p>
            </div>
        );
    }

    if (!orderBookData) {
        return (
            <Alert className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Order Book Not Available</AlertTitle>
                <AlertDescription>
                    No order book data is available for this stock. This may be
                    due to market hours or connectivity issues.
                </AlertDescription>
            </Alert>
        );
    }

    // Calculate time ago from timestamp
    const getTimeAgo = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 60) return `${diffSec}s ago`;
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        return `${Math.floor(diffSec / 3600)}h ago`;
    };

    const timeAgo = orderBookData.timestamp
        ? getTimeAgo(orderBookData.timestamp)
        : "unknown";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ask Levels (Sell) - Displayed in reverse order */}
            <div className="space-y-1 order-2 md:order-1">
                <div className="text-sm font-medium text-red-500 mb-2">
                    Ask (Sell)
                </div>
                {orderBookData.ask?.slice(0, 5).map((level, index) => (
                    <div
                        key={`ask-${index}`}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded"
                        onClick={() => onPriceSelect(level.price)}
                    >
                        <div className="text-sm font-medium text-red-500 w-20">
                            ${level.price.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground w-20 text-right">
                            {level.volume}
                        </div>
                        <div className="flex-1">
                            <div className="relative h-3">
                                <Progress
                                    value={(level.volume / maxVolume) * 100}
                                    className="h-full bg-muted"
                                    // indicatorClassName="bg-red-200"
                                />
                            </div>
                        </div>
                    </div>
                ))}
                {(!orderBookData.ask || orderBookData.ask.length === 0) && (
                    <div className="text-sm text-muted-foreground italic">
                        No ask data available
                    </div>
                )}
            </div>

            {/* Bid Levels (Buy) */}
            <div className="space-y-1 order-3 md:order-2">
                <div className="text-sm font-medium text-green-500 mb-2">
                    Bid (Buy)
                </div>
                {orderBookData.bid?.slice(0, 5).map((level, index) => (
                    <div
                        key={`bid-${index}`}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded"
                        onClick={() => onPriceSelect(level.price)}
                    >
                        <div className="text-sm font-medium text-green-500 w-20">
                            ${level.price.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground w-20 text-right">
                            {level.volume}
                        </div>
                        <div className="flex-1">
                            <div className="relative h-3">
                                <Progress
                                    value={(level.volume / maxVolume) * 100}
                                    className="h-full bg-muted"
                                    // indicatorClassName="bg-green-200"
                                />
                            </div>
                        </div>
                    </div>
                ))}
                {(!orderBookData.bid || orderBookData.bid.length === 0) && (
                    <div className="text-sm text-muted-foreground italic">
                        No bid data available
                    </div>
                )}
            </div>

            {/* Timestamp - Full width across bottom */}
            <div className="col-span-1 md:col-span-2 text-xs text-muted-foreground text-right order-1 md:order-3">
                Last updated: {timeAgo}
            </div>
        </div>
    );
};

export default function OrderEntryPage() {
    const { toast } = useToast();
    // Get singleton instances of managers
    const wsManager = useMemo(() => WebSocketManager.getInstance(), []);
    const httpManager = useMemo(() => HTTPRequestManager.getInstance(), []);
    const ORDERS_WS_CONNECTION_ID = "orders-connection";
    const ORDERBOOK_WS_CONNECTION_ID = "orderbook-connection";

    // Order state
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [historicalOrders, setHistoricalOrders] = useState<Order[]>([]);
    const [bid, setBid] = useState(475.7); // Default
    const [ask, setAsk] = useState(477.7); // Default
    const [position, setPosition] = useState(50);
    const [quantity, setQuantity] = useState(100);
    const [currentPosition, setCurrentPosition] = useState<Position | null>(
        null
    );
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);

    // Order book state
    const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(
        null
    );
    const [isLoadingOrderBook, setIsLoadingOrderBook] = useState(false);

    // Selection state
    const [market, setMarket] = useState("HK");
    const [selectedStock, setSelectedStock] = useState("HK.00700");
    const [selectedStrategy, setSelectedStrategy] = useState("manual");

    // WebSocket state
    const [isConnected, setIsConnected] = useState(false);
    const [isOrderBookConnected, setIsOrderBookConnected] = useState(false);

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

    // Fetch position and quote when stock changes
    useEffect(() => {
        fetchCurrentPositionAndQuote(selectedStock);
        setupOrderBookSubscription(selectedStock);
    }, [selectedStock, httpManager, wsManager]);

    // Update the setupOrderBookSubscription function to fix the getConnection issue

    // Setup order book WebSocket subscription
    const setupOrderBookSubscription = async (stockCode: string) => {
        setIsLoadingOrderBook(true);
        setOrderBookData(null);

        try {
            // Close any existing connection
            try {
                await wsManager.disconnectConnection(
                    ORDERBOOK_WS_CONNECTION_ID
                );
            } catch (error) {
                // Ignore error, connection might not exist yet
            }

            // Add a new connection for order book - using the correct endpoint from backend
            wsManager.addConnection(
                ORDERBOOK_WS_CONNECTION_ID,
                "ws://localhost:9000/ws/orderbook", // Updated path to match backend
                ProtocolType.RAW
            );

            // Set up a message handler for the connection
            wsManager.addSubscriptionToConnection(
                ORDERBOOK_WS_CONNECTION_ID,
                "message", // Generic message handler instead of a specific subscription path
                (msg: string) => {
                    try {
                        const data = JSON.parse(msg);
                        console.log(`Order Book Update:`, data);

                        // Check if this is an order book update for our stock
                        if (
                            data.type === "order_book_update" &&
                            data.code === stockCode
                        ) {
                            setOrderBookData(data);
                            setIsLoadingOrderBook(false);

                            // If we get order book data with valid bid/ask prices, update the form values
                            if (data.bid?.length > 0 && data.ask?.length > 0) {
                                const topBid = data.bid[0].price;
                                const topAsk = data.ask[0].price;

                                if (topBid > 0 && topAsk > 0) {
                                    setBid(topBid);
                                    setAsk(topAsk);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(
                            "Error processing order book message:",
                            error
                        );
                    }
                }
            );

            await wsManager.startConnection(ORDERBOOK_WS_CONNECTION_ID);
            setIsOrderBookConnected(true);

            // Set up ping interval to keep the connection alive
            const pingInterval = setInterval(async () => {
                try {
                    // Use sendMessage instead of getConnection to send ping
                    if (isOrderBookConnected) {
                        await wsManager.sendMessage(
                            ORDERBOOK_WS_CONNECTION_ID,
                            "ping"
                        );
                    } else {
                        clearInterval(pingInterval);
                    }
                } catch (error) {
                    console.error("Error sending ping:", error);
                    clearInterval(pingInterval);
                }
            }, 30000); // Send ping every 30 seconds

            // After 5 seconds, if no order book data is received, consider it unavailable
            setTimeout(() => {
                setIsLoadingOrderBook(false);
            }, 5000);

            // Return a cleanup function
            return () => {
                clearInterval(pingInterval);
            };
        } catch (error) {
            console.error("OrderBook WebSocket initialization failed:", error);
            setIsOrderBookConnected(false);
            setIsLoadingOrderBook(false);

            // Return an empty function for consistent return type
            return () => {};
        }
    };

    // Handle price selection from order book
    const handlePriceSelect = (price: number) => {
        // Calculate what position this price represents between bid and ask
        if (price <= bid) {
            // If at or below bid, set to 0
            setPosition(0);
        } else if (price >= ask) {
            // If at or above ask, set to 100
            setPosition(100);
        } else {
            // Calculate position percentage between bid and ask
            const positionPercent = ((price - bid) / (ask - bid)) * 100;
            setPosition(Math.round(positionPercent));
        }
    };

    // Fetch current position and set prices based on nominal price
    const fetchCurrentPositionAndQuote = async (stockCode: string) => {
        setIsLoadingQuote(true);
        try {
            // Fetch position data
            const positionData = await fetchStockPosition(
                stockCode,
                httpManager
            );

            if (positionData) {
                setCurrentPosition(positionData);

                // Set bid/ask prices based on the avg_price from position data if available
                // Otherwise, keep the current prices
                if (positionData.avg_price && positionData.avg_price > 0) {
                    const avgPrice = positionData.avg_price;
                    const spreadPercentage = 0.002; // 0.2% spread
                    const spreadAmount = avgPrice * spreadPercentage;

                    setBid(parseFloat((avgPrice - spreadAmount).toFixed(2)));
                    setAsk(parseFloat((avgPrice + spreadAmount).toFixed(2)));

                    // Reset position to midpoint
                    setPosition(50);
                }
            } else {
                // If no position data, use default values
                // For HK.00700, use the specified defaults
                if (stockCode === "HK.00700") {
                    setBid(475.7);
                    setAsk(477.7);
                } else {
                    // Otherwise simulate some reasonable prices
                    const stockIndex =
                        STOCKS[
                            stockCode.split(".")[0] as keyof typeof STOCKS
                        ]?.findIndex((stock) => stock.code === stockCode) || 0;

                    const basePrice = 100 + stockIndex * 10;
                    setBid(basePrice - 0.5);
                    setAsk(basePrice + 0.5);
                }
                setPosition(50);
            }
        } catch (error) {
            console.error("Error fetching position:", error);
            toast({
                title: "Data Error",
                description: "Unable to fetch current position",
                variant: "destructive",
            });
        } finally {
            setIsLoadingQuote(false);
        }
    };

    // Functions to adjust bid and ask
    const adjustBid = (amount: number) => {
        setBid((prev) => Math.max(0, parseFloat((prev + amount).toFixed(2))));
    };

    const adjustAsk = (amount: number) => {
        setAsk((prev) => Math.max(0, parseFloat((prev + amount).toFixed(2))));
    };

    // Fetch historical orders
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
    // Update the cleanup in the WebSocket useEffect

    // Update the cleanup in the WebSocket useEffect

    // Fix the WebSocket useEffect cleanup

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

        // Set up orderbook connection and store the cleanup function
        // Now returns a normal function, not a Promise
        const orderBookCleanup = setupOrderBookSubscription(selectedStock);

        return () => {
            // Cleanup all WebSocket connections
            try {
                wsManager.disconnectConnection(ORDERS_WS_CONNECTION_ID);
                wsManager.disconnectConnection(ORDERBOOK_WS_CONNECTION_ID);
                setIsConnected(false);
                setIsOrderBookConnected(false);

                // Execute the cleanup function
            } catch (error) {
                console.error("Error during WebSocket cleanup:", error);
            }
        };
    }, [wsManager, selectedStock]);

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
            const firstStock = STOCKS[value as keyof typeof STOCKS][0].code;
            setSelectedStock(firstStock);
        }
    };

    // Handle stock change
    const handleStockChange = (value: string) => {
        setSelectedStock(value);
        fetchCurrentPositionAndQuote(value);
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

    // Get stock name for display
    const getStockName = () => {
        const stockObj = STOCKS[market as keyof typeof STOCKS]?.find(
            (stock) => stock.code === selectedStock
        );
        return stockObj ? stockObj.name : selectedStock;
    };

    return (
        <div className="container mx-auto py-6 space-y-8 bg-background text-foreground">
            <h1 className="text-3xl font-bold">Order Entry</h1>

            {/* Split Order Entry and Order Book */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Market and Stock Selection - Shared between both sections */}
                <Card className="col-span-1 lg:col-span-2 bg-card text-card-foreground">
                    <CardContent className="pt-6">
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
                                <label className="text-sm font-medium">
                                    Stock
                                </label>
                                <Select
                                    value={selectedStock}
                                    onValueChange={handleStockChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select stock" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STOCKS[
                                            market as keyof typeof STOCKS
                                        ]?.map((stock) => (
                                            <SelectItem
                                                key={stock.code}
                                                value={stock.code}
                                            >
                                                {stock.name} ({stock.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Order Book Section - Left Side */}
                <Card className="bg-card text-card-foreground">
                    <CardHeader>
                        <CardTitle>Order Book: {getStockName()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <OrderBookDisplay
                            orderBookData={orderBookData}
                            isLoading={isLoadingOrderBook}
                            onPriceSelect={handlePriceSelect}
                        />

                        {/* Connection Status */}
                        <div className="flex items-center space-x-2 text-sm mt-4">
                            <div
                                className={`w-3 h-3 rounded-full ${
                                    isOrderBookConnected
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                }`}
                            ></div>
                            <span>
                                {isOrderBookConnected
                                    ? "Connected to market data"
                                    : "Disconnected from market data"}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Order Entry Section - Right Side */}
                <Card className="bg-card text-card-foreground">
                    <CardHeader>
                        <CardTitle>Place Order</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Current Position Information */}
                        {currentPosition && (
                            <div className="p-3 bg-muted rounded-md">
                                <h3 className="text-sm font-semibold mb-2">
                                    Current Position
                                </h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <div>
                                        Quantity:{" "}
                                        <span className="font-medium">
                                            {currentPosition.quantity}
                                        </span>
                                    </div>
                                    <div>
                                        Available to Sell:{" "}
                                        <span className="font-medium">
                                            {currentPosition.can_sell_qty ??
                                                currentPosition.quantity}
                                        </span>
                                    </div>
                                    <div>
                                        Cost Basis:{" "}
                                        <span className="font-medium">
                                            $
                                            {currentPosition.avg_price.toFixed(
                                                2
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        Market Value:{" "}
                                        <span className="font-medium">
                                            $
                                            {currentPosition.market_value.toFixed(
                                                2
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        P&L:{" "}
                                        <span
                                            className={`font-medium ${
                                                currentPosition.unrealized_pl >=
                                                0
                                                    ? "text-green-500"
                                                    : "text-red-500"
                                            }`}
                                        >
                                            $
                                            {currentPosition.unrealized_pl.toFixed(
                                                2
                                            )}{" "}
                                            (
                                            {currentPosition.pl_ratio.toFixed(
                                                2
                                            )}
                                            %)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                    <div className="flex justify-between items-center">
                                        <label
                                            htmlFor="bid"
                                            className="text-sm font-medium"
                                        >
                                            Bid
                                        </label>
                                        <div className="flex space-x-1">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-6 w-6"
                                                onClick={() => adjustBid(-0.01)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-6 w-6"
                                                onClick={() => adjustBid(0.01)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
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
                                    <div className="flex justify-between items-center">
                                        <label
                                            htmlFor="ask"
                                            className="text-sm font-medium"
                                        >
                                            Ask
                                        </label>
                                        <div className="flex space-x-1">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-6 w-6"
                                                onClick={() => adjustAsk(-0.01)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-6 w-6"
                                                onClick={() => adjustAsk(0.01)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
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
                            <div className="flex justify-center">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex items-center"
                                    onClick={() => {
                                        fetchCurrentPositionAndQuote(
                                            selectedStock
                                        );
                                        setupOrderBookSubscription(
                                            selectedStock
                                        );
                                    }}
                                    disabled={
                                        isLoadingQuote || isLoadingOrderBook
                                    }
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 mr-2 ${
                                            isLoadingQuote || isLoadingOrderBook
                                                ? "animate-spin"
                                                : ""
                                        }`}
                                    />
                                    Refresh Market Data
                                </Button>
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
            </div>

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
                            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Start Date
                                    </label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full md:w-[240px] justify-start text-left font-normal"
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
                                                className="w-full md:w-[240px] justify-start text-left font-normal"
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
                                    <Button
                                        onClick={fetchOrderHistory}
                                        className="w-full md:w-auto"
                                    >
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
