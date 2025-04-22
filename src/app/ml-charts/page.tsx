"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import HTTPRequestManager, { Methods } from "../utils/HTTPRequestManager";

interface PredictionData {
    symbol: string;
    entries: {
        date: string;
        predictedClose: number;
    }[];
}

interface StockEntry {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface StockResponse {
    symbol: string;
    entries: StockEntry[];
}

const tickerOptions = [
    { value: "TEN", label: "Tencent" },
    { value: "AIA", label: "AIA Group" },
];

const modelOptions = [
    { value: "lr", label: "Linear Regression" },
    { value: "xgb", label: "XGBoost" },
    { value: "lgb", label: "LightGBM" },
];

// Mapping from ticker to exchange symbol
const tickerToExchangeSymbol: Record<string, string> = {
    TEN: "0700.HK",
    AIA: "1299.HK",
};

export default function PredictionsPage() {
    const { theme } = useTheme();
    const { toast } = useToast();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTicker, setSelectedTicker] = useState("TEN");
    const [selectedModel, setSelectedModel] = useState("lr");
    const [predictionData, setPredictionData] = useState<PredictionData | null>(
        null
    );
    const [historicalData, setHistoricalData] = useState<StockResponse | null>(
        null
    );
    const serverURLRef = useRef("http://0.0.0.0:8000/");

    // Track chart instance state to avoid accessing disposed objects
    const [chartCreated, setChartCreated] = useState(false);

    // Create a ref for the HTTP manager to ensure it's stable
    const httpManagerRef = useRef<HTTPRequestManager | null>(null);

    // Initialize HTTP manager only once
    useEffect(() => {
        if (!httpManagerRef.current) {
            httpManagerRef.current = HTTPRequestManager.getInstance();
            httpManagerRef.current.addServer("ml-server", serverURLRef.current);
        }

        // No cleanup function here - we want the manager to persist
    }, []);

    // Function to fetch historical stock data
    const fetchHistoricalData = async (symbol: string) => {
        if (!httpManagerRef.current) {
            toast({
                title: "Error",
                description: "HTTP manager not initialized",
                variant: "destructive",
            });
            return;
        }

        try {
            const exchangeSymbol = tickerToExchangeSymbol[symbol] || symbol;
            const data = await httpManagerRef.current.handleRequest(
                `stock-price/${exchangeSymbol}?period=2y`,
                Methods.GET,
                null,
                "ml-server"
            );

            setHistoricalData(data);
            console.log("Historical data loaded for", symbol);
        } catch (error) {
            console.error("Failed to fetch historical data:", error);
            toast({
                title: "Error loading historical data",
                description:
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred",
                variant: "destructive",
            });
        }
    };

    const fetchPredictions = async () => {
        // Make sure HTTP manager is available
        if (!httpManagerRef.current) {
            toast({
                title: "Error",
                description: "HTTP manager not initialized",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        // Safely clean up existing chart before fetching new data
        cleanupExistingChart();

        // If we don't have historical data for this ticker or it's different from current, fetch it
        if (!historicalData || historicalData.symbol !== selectedTicker) {
            await fetchHistoricalData(selectedTicker);
        }

        try {
            const data = await httpManagerRef.current.handleRequest(
                `ml/${selectedTicker}/${selectedModel}`,
                Methods.GET,
                null,
                "ml-server"
            );

            setPredictionData(data);
            toast({
                title: "Predictions loaded",
                description: `Successfully loaded ${selectedModel.toUpperCase()} predictions for ${selectedTicker}`,
            });
        } catch (error) {
            console.error("Failed to fetch predictions:", error);
            toast({
                title: "Error loading predictions",
                description:
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Separate function to safely clean up chart
    const cleanupExistingChart = () => {
        if (chartRef.current) {
            try {
                chartRef.current.remove();
                console.log("Successfully removed previous chart");
            } catch (e) {
                console.log("Chart was already removed or disposed");
            }
            chartRef.current = null;
            setChartCreated(false);
        }
    };

    // Effect for initial fetch
    useEffect(() => {
        // Don't automatically fetch on mount to avoid race conditions
        // User will need to click "Generate Predictions"

        // Clean up chart when component unmounts
        return () => {
            cleanupExistingChart();
        };
    }, []);

    // Separate effect for chart creation
    useEffect(() => {
        // Skip if no container, no data, or if we're loading new data
        if (
            !chartContainerRef.current ||
            !predictionData ||
            predictionData.entries.length === 0 ||
            isLoading ||
            chartCreated
        ) {
            return;
        }

        const currentContainer = chartContainerRef.current;

        // Create the chart
        const isDarkTheme = theme === "dark";

        try {
            const chart = createChart(currentContainer, {
                layout: {
                    background: {
                        type: ColorType.Solid,
                        color: isDarkTheme ? "#1e1e2d" : "#ffffff",
                    },
                    textColor: isDarkTheme ? "#d1d4dc" : "#333",
                },
                grid: {
                    vertLines: {
                        color: isDarkTheme
                            ? "rgba(42, 46, 57, 0.5)"
                            : "rgba(220, 220, 220, 0.8)",
                    },
                    horzLines: {
                        color: isDarkTheme
                            ? "rgba(42, 46, 57, 0.5)"
                            : "rgba(220, 220, 220, 0.8)",
                    },
                },
                width: currentContainer.clientWidth,
                height: 400,
                timeScale: {
                    timeVisible: true,
                    borderColor: isDarkTheme ? "#2b2b43" : "#d6dcde",
                },
                watermark: {
                    visible: false,
                },
                crosshair: {
                    horzLine: {
                        visible: true,
                        labelVisible: true,
                    },
                    vertLine: {
                        visible: true,
                        labelVisible: true,
                    },
                },
            });

            // Add historical data series if available
            if (historicalData && historicalData.entries.length > 0) {
                // Format historical data
                const formattedHistorical = historicalData.entries.map(
                    (entry) => ({
                        time: entry.date.split(" ")[0], // Extract date part only
                        value: entry.close,
                    })
                );

                // Add historical data line series
                const historicalSeries = chart.addLineSeries({
                    color: "#8884d8", // Purple color for historical data
                    lineWidth: 1,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    priceFormat: {
                        type: "price",
                        precision: 2,
                        minMove: 0.01,
                    },
                    title: "Historical Prices",
                });

                historicalSeries.setData(formattedHistorical);
            }

            // Format and set prediction data
            const formattedData = predictionData.entries.map((entry) => ({
                time: entry.date,
                value: entry.predictedClose,
            }));

            const predictionSeries = chart.addLineSeries({
                color: "#0063cc", // Blue color for predictions
                lineWidth: 2,
                lineStyle: 1, // Solid line
                priceLineVisible: true,
                lastValueVisible: true,
                priceFormat: {
                    type: "price",
                    precision: 2,
                    minMove: 0.01,
                },
                title: "Predicted Prices",
            });

            predictionSeries.setData(formattedData);
            chart.timeScale().fitContent();

            // Store chart in ref
            chartRef.current = chart;
            setChartCreated(true);
            console.log("Created new chart");

            // Remove TradingView logo
            const removeTradingViewLogo = () => {
                // Find and remove the logo element
                const logoElement = document.getElementById("tv-attr-logo");
                if (logoElement) {
                    logoElement.remove();
                }
            };

            // Call once immediately after chart creation
            removeTradingViewLogo();

            // Also set up a MutationObserver to catch if the logo gets added later
            const observer = new MutationObserver(() => {
                removeTradingViewLogo();
            });

            // Start observing the chart container
            observer.observe(currentContainer, {
                childList: true,
                subtree: true,
            });

            // Handle resize
            const handleResize = () => {
                if (currentContainer && chart) {
                    try {
                        chart.applyOptions({
                            width: currentContainer.clientWidth,
                        });
                    } catch (e) {
                        console.error("Error resizing chart:", e);
                    }
                }
            };

            window.addEventListener("resize", handleResize);

            // Return cleanup function
            return () => {
                window.removeEventListener("resize", handleResize);
                observer.disconnect(); // Disconnect the observer
                // We don't clean up the chart here - we do it before fetching new data
                // or when the component unmounts
            };
        } catch (e) {
            console.error("Error creating chart:", e);
            return () => {};
        }
    }, [theme, predictionData, historicalData, isLoading, chartCreated]);

    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-3xl font-bold">Stock Price Predictions</h1>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Model Selection</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Stock
                                </label>
                                <Select
                                    value={selectedTicker}
                                    onValueChange={setSelectedTicker}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select stock" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tickerOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label} ({option.value})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Model Type
                                </label>
                                <Select
                                    value={selectedModel}
                                    onValueChange={setSelectedModel}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {modelOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={fetchPredictions}
                                disabled={isLoading || !httpManagerRef.current}
                                className="mt-2"
                            >
                                {isLoading
                                    ? "Loading..."
                                    : "Generate Predictions"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {predictionData && (
                    <Card className="flex-1">
                        <CardHeader className="pb-2">
                            <CardTitle>
                                Summary for {predictionData.symbol}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-sm">
                                    <span className="font-medium">Model:</span>{" "}
                                    {selectedModel === "lr"
                                        ? "Linear Regression"
                                        : selectedModel === "xgb"
                                        ? "XGBoost"
                                        : "LightGBM"}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">
                                        Prediction Range:
                                    </span>{" "}
                                    {predictionData.entries.length > 0
                                        ? `${
                                              predictionData.entries[0].date
                                          } to ${
                                              predictionData.entries[
                                                  predictionData.entries
                                                      .length - 1
                                              ].date
                                          }`
                                        : "No data"}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">
                                        Data Points:
                                    </span>{" "}
                                    {predictionData.entries.length}
                                </p>
                                {predictionData.entries.length > 0 && (
                                    <p className="text-sm">
                                        <span className="font-medium">
                                            Predicted Direction:
                                        </span>{" "}
                                        {predictionData.entries[0]
                                            .predictedClose <
                                        predictionData.entries[
                                            predictionData.entries.length - 1
                                        ].predictedClose ? (
                                            <span className="text-green-500">
                                                Upward
                                            </span>
                                        ) : (
                                            <span className="text-red-500">
                                                Downward
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {predictionData && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>
                            {predictionData.symbol} Price Prediction
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <div className="mb-4">
                            <p className="text-sm text-muted-foreground">
                                Showing historical prices (purple) and predicted
                                closing prices (blue) for the next{" "}
                                {predictionData.entries.length} trading days
                            </p>
                        </div>
                        <div
                            ref={chartContainerRef}
                            className="w-full h-[400px] rounded-md"
                        />
                    </CardContent>
                </Card>
            )}

            {!predictionData && !isLoading && (
                <Card>
                    <CardContent className="flex items-center justify-center h-[400px]">
                        <p className="text-muted-foreground">
                            Select a stock and model, then click "Generate
                            Predictions" to view forecasts.
                        </p>
                    </CardContent>
                </Card>
            )}

            {isLoading && (
                <Card>
                    <CardContent className="flex items-center justify-center h-[400px]">
                        <p className="text-muted-foreground">
                            Loading predictions...
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
