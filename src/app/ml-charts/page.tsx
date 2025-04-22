"use client";

import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";

interface PredictionData {
    symbol: string;
    entries: {
        date: string;
        predictedClose: number;
    }[];
}

export default function PredictionsPage() {
    const { theme } = useTheme();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    // Sample data (in real app, this would come from an API call or props)
    const predictionData: PredictionData = {
        symbol: "HSBC",
        entries: [
            {
                date: "2024-07-06",
                predictedClose: 63.67426681518555,
            },
            {
                date: "2024-07-09",
                predictedClose: 63.113407135009766,
            },
            {
                date: "2024-07-10",
                predictedClose: 62.66779708862305,
            },
            {
                date: "2024-07-11",
                predictedClose: 62.34788131713867,
            },
            {
                date: "2024-07-12",
                predictedClose: 62.21936798095703,
            },
            {
                date: "2024-07-13",
                predictedClose: 62.562007904052734,
            },
            {
                date: "2024-07-16",
                predictedClose: 62.788150787353516,
            },
        ],
    };

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Clean up previous chart if it exists
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        // Check if we have a container and data to display
        if (chartContainerRef.current && predictionData.entries.length > 0) {
            // Create the chart
            const isDarkTheme = theme === "dark";

            const chart = createChart(chartContainerRef.current, {
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
                width: chartContainerRef.current.clientWidth,
                height: 400,
                timeScale: {
                    timeVisible: true,
                    borderColor: isDarkTheme ? "#2b2b43" : "#d6dcde",
                },
                watermark: {
                    visible: false,
                },
            });

            // Store the chart reference for cleanup
            chartRef.current = chart;

            // Format data for the chart
            const formattedData = predictionData.entries.map((entry) => ({
                time: entry.date, // Lightweight charts can handle 'YYYY-MM-DD' format
                value: entry.predictedClose,
            }));

            // Create and style the line series
            const lineSeries = chart.addLineSeries({
                color: "#0063cc",
                lineWidth: 2,
                priceLineVisible: true,
                lastValueVisible: true,
                priceFormat: {
                    type: "price",
                    precision: 2,
                    minMove: 0.01,
                },
            });

            // Set the data
            lineSeries.setData(formattedData);

            // Fit the chart to show all data
            chart.timeScale().fitContent();

            // Remove TradingView logo
            const removeTradingViewLogo = () => {
                // Find and remove the logo element (which has id 'tv-attr-logo')
                const logoElement = document.getElementById("tv-attr-logo");
                if (logoElement) {
                    logoElement.remove();
                }
            };

            // Call once immediately after chart creation
            removeTradingViewLogo();

            // Also set up a MutationObserver to catch if the logo gets added later
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(() => {
                    removeTradingViewLogo();
                });
            });

            // Start observing the chart container
            if (chartContainerRef.current) {
                observer.observe(chartContainerRef.current, {
                    childList: true,
                    subtree: true,
                });
            }

            // Handle window resize
            const handleResize = () => {
                if (chartContainerRef.current && chart) {
                    chart.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                    });
                }
            };

            window.addEventListener("resize", handleResize);

            // Return a cleanup function
            return () => {
                window.removeEventListener("resize", handleResize);
                observer.disconnect(); // Disconnect the observer
                if (chart) {
                    chart.remove();
                }
            };
        }
    }, [theme, predictionData]);

    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-3xl font-bold">Price Predictions</h1>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {predictionData.symbol} Price Predictions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <p className="text-sm text-muted-foreground">
                            Showing predicted closing prices for the next 7
                            trading days
                        </p>
                    </div>
                    <div
                        ref={chartContainerRef}
                        className="w-full h-[400px] rounded-md"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
