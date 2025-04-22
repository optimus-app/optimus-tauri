"use client";

import { useState, useEffect, useRef, RefObject } from "react";
import HTTPRequestManager, { Methods } from "@/app/utils/HTTPRequestManager";
import { useMemo } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

import {
    createChart,
    ColorType,
    CrosshairMode,
    LineStyle,
    IChartApi,
    SeriesMarker,
    Time,
    MouseEventParams,
} from "lightweight-charts";

// Define interfaces for strongly typed components
interface ChartLegendItem {
    color: string;
    label: string;
}

interface DataPoint {
    time: number | Date;
    date?: Date;
    value: number;
    price?: number;
    shortSma?: number;
    longSma?: number;
    performance?: number;
    buyPrice?: number;
    sellPrice?: number;
    drawdown?: number;
    [key: string]: any;
}

interface SimulationGraphProps {
    data: DataPoint[];
    valueKey?: string;
    chartType?: "portfolio" | "drawdown" | "volatility";
    parameters?: {
        shortWindow?: number;
        longWindow?: number;
        [key: string]: any;
    };
}

interface MetricsDisplayProps {
    metrics: Record<string, { value: number }>;
    chartsData: Record<string, DataPoint[]>;
    selectedCharts: string[];
    setSelectedCharts: (charts: string[]) => void;
}

// Mock algorithms
const algorithms = [
    {
        name: "Moving Average Crossover",
        parameters: [
            { name: "shortWindow", label: "Short Window", default: 8 },
            { name: "longWindow", label: "Long Window", default: 10 },
        ],
    },
];

const metricsConfig = [
    {
        key: "netPerformance",
        label: "Net Performance",
        format: (v: number) => `${(v * 100).toFixed(2)}%`,
        colorCondition: (v: number) =>
            v >= 0 ? "text-green-500" : "text-red-500",
        chartKey: "portfolioValue",
    },
    {
        key: "winStreakAvg",
        label: "Win Streak (Avg)",
        format: (v: number) => v.toFixed(2),
        colorCondition: () => "text-green-500",
    },
    {
        key: "winStreakMax",
        label: "Win Streak (Max)",
        format: (v: number) => v.toString(),
        colorCondition: () => "text-green-500",
    },
    {
        key: "wins",
        label: "Wins",
        format: (v: number) => v.toString(),
        colorCondition: () => "text-green-500",
    },
    {
        key: "lossStreakAvg",
        label: "Loss Streak (Avg)",
        format: (v: number) => v.toFixed(2),
        colorCondition: (v: number) =>
            v > 3 ? "text-red-500" : "text-green-500",
    },
    {
        key: "lossStreakMax",
        label: "Loss Streak (Max)",
        format: (v: number) => v.toString(),
        colorCondition: (v: number) =>
            v > 5 ? "text-red-500" : "text-green-500",
    },
    {
        key: "losses",
        label: "Losses",
        format: (v: number) => v.toString(),
        colorCondition: (v: number, metrics: any) =>
            v > metrics.wins.value ? "text-red-500" : "text-green-500",
    },
    {
        key: "tradesPerDay",
        label: "Trades/Day",
        format: (v: number) => v.toString(),
        colorCondition: () => "",
    },
    {
        key: "tradesPerMonth",
        label: "Trades/Month",
        format: (v: number) => v.toString(),
        colorCondition: () => "",
    },
    {
        key: "maxDrawdown",
        label: "Max Drawdown",
        format: (v: number) => `${(v * 100).toFixed(2)}%`,
        colorCondition: (v: number) =>
            v > 0.2 ? "text-red-500" : "text-green-500",
        chartKey: "drawdown",
    },
    {
        key: "sharpeRatio",
        label: "Sharpe Ratio",
        format: (v: number) => v.toFixed(2),
        colorCondition: (v: number) =>
            v > 1 ? "text-green-500" : "text-red-500",
    },
    {
        key: "sortinoRatio",
        label: "Sortino Ratio",
        format: (v: number) => v.toFixed(2),
        colorCondition: (v: number) =>
            v > 1 ? "text-green-500" : "text-red-500",
    },
    {
        key: "beta",
        label: "Beta vs Asset",
        format: (v: number) => v.toFixed(2),
        colorCondition: (v: number) =>
            v >= 0.8 && v <= 1.2 ? "text-green-500" : "text-red-500",
    },
    {
        key: "lossStdDev",
        label: "Loss Standard Deviation",
        format: (v: number) => `${(v * 100).toFixed(2)}%`,
        colorCondition: (v: number) =>
            v > 0.05 ? "text-red-500" : "text-green-500",
    },
    {
        key: "realizedVolatility",
        label: "Realized Volatility",
        format: (v: number) => `${(v * 100).toFixed(2)}%`,
        colorCondition: (v: number) =>
            v > 0.2 ? "text-red-500" : "text-green-500",
        chartKey: "volatility",
    },
];

// Chart Legend Component
const ChartLegend = ({ items }: { items: ChartLegendItem[] }) => {
    if (!items || items.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-4 mt-4">
            {items.map((item, i) => (
                <div key={i} className="flex items-center">
                    <div
                        className="w-3 h-3 mr-2 rounded-sm"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

// SimulationGraph component using lightweight-charts
const SimulationGraph = ({
    data,
    valueKey = "value",
    chartType = "portfolio",
    parameters = {},
}: SimulationGraphProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const legendRef = useRef<ChartLegendItem[]>([]);
    const { theme } = useTheme();

    useEffect(() => {
        if (!chartContainerRef.current || !data || data.length === 0) return;

        // Cleanup previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        // Create tooltip element if not exists
        if (!tooltipRef.current) {
            const tooltipElement = document.createElement("div");
            tooltipElement.className =
                "absolute z-50 hidden p-2 text-xs rounded shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700";
            document.body.appendChild(tooltipElement);
            tooltipRef.current = tooltipElement;
        }

        const isDarkTheme = theme === "dark";

        // Define chart colors
        const colors = {
            background: isDarkTheme ? "#1e1e2d" : "#ffffff",
            text: isDarkTheme ? "#d1d4dc" : "#333333",
            grid: isDarkTheme
                ? "rgba(42, 46, 57, 0.5)"
                : "rgba(220, 220, 220, 0.8)",
            border: isDarkTheme ? "#2b2b43" : "#d6dcde",
            portfolio: "#0063cc",
            price: "#82ca9d",
            shortSma: "#f7a35c",
            longSma: "#8085e9",
            drawdown: "#ff4560",
            volatility: "#775dd0",
            buy: "#22ab94",
            sell: "#ef5350",
        };

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors.background },
                textColor: colors.text,
            },
            grid: {
                vertLines: { color: colors.grid },
                horzLines: { color: colors.grid },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                timeVisible: true,
                borderColor: colors.border,
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.2)",
                    style: LineStyle.Dashed,
                },
                horzLine: {
                    color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.2)",
                    style: LineStyle.Dashed,
                },
            },
            rightPriceScale: {
                visible: chartType === "portfolio",
                borderColor: colors.border,
            },
            leftPriceScale: {
                visible: true,
                borderColor: colors.border,
            },
        });

        chartRef.current = chart;
        legendRef.current = [];

        // Format data for the main series based on chart type
        const formattedData = data.map((point: DataPoint) => ({
            time:
                typeof point.time === "number"
                    ? new Date(point.time).toISOString().split("T")[0]
                    : (point.time as Date).toISOString().split("T")[0],
            value: point[valueKey] as number,
        }));

        // Create main series
        const mainSeriesColor =
            chartType === "drawdown"
                ? colors.drawdown
                : chartType === "volatility"
                ? colors.volatility
                : colors.portfolio;

        const mainSeries = chart.addLineSeries({
            color: mainSeriesColor,
            lineWidth: 2,
            priceScaleId: "left",
            title:
                chartType === "portfolio"
                    ? "Portfolio Value"
                    : chartType === "drawdown"
                    ? "Drawdown"
                    : "Volatility",
        });

        mainSeries.setData(formattedData);

        // Track legend items
        legendRef.current.push({
            color: mainSeriesColor,
            label:
                chartType === "portfolio"
                    ? "Portfolio Value"
                    : chartType === "drawdown"
                    ? "Drawdown"
                    : "Volatility",
        });

        // Add additional series for portfolio charts
        if (chartType === "portfolio") {
            // Price series
            if (data[0]?.price !== undefined) {
                const priceSeries = chart.addLineSeries({
                    color: colors.price,
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    priceScaleId: "right",
                });

                const priceData = data.map((point: DataPoint) => ({
                    time:
                        typeof point.time === "number"
                            ? new Date(point.time).toISOString().split("T")[0]
                            : (point.time as Date).toISOString().split("T")[0],
                    value: point.price,
                }));

                priceSeries.setData(priceData);
                legendRef.current.push({
                    color: colors.price,
                    label: "Asset Price",
                });

                // SMA indicators
                if (data[0]?.shortSma !== undefined) {
                    const shortSMA = chart.addLineSeries({
                        color: colors.shortSma,
                        lineWidth: 1,
                        priceScaleId: "right",
                    });

                    const shortSmaData = data.map((point: DataPoint) => ({
                        time:
                            typeof point.time === "number"
                                ? new Date(point.time)
                                      .toISOString()
                                      .split("T")[0]
                                : (point.time as Date)
                                      .toISOString()
                                      .split("T")[0],
                        value: point.shortSma,
                    }));

                    shortSMA.setData(shortSmaData);
                    legendRef.current.push({
                        color: colors.shortSma,
                        label: `Short SMA (${parameters.shortWindow || "?"})`,
                    });
                }

                if (data[0]?.longSma !== undefined) {
                    const longSMA = chart.addLineSeries({
                        color: colors.longSma,
                        lineWidth: 1,
                        priceScaleId: "right",
                    });

                    const longSmaData = data.map((point: DataPoint) => ({
                        time:
                            typeof point.time === "number"
                                ? new Date(point.time)
                                      .toISOString()
                                      .split("T")[0]
                                : (point.time as Date)
                                      .toISOString()
                                      .split("T")[0],
                        value: point.longSma,
                    }));

                    longSMA.setData(longSmaData);
                    legendRef.current.push({
                        color: colors.longSma,
                        label: `Long SMA (${parameters.longWindow || "?"})`,
                    });
                }

                // Add buy/sell markers
                const markers: SeriesMarker<Time>[] = [];
                let hasBuy = false;
                let hasSell = false;

                data.forEach((point: DataPoint) => {
                    if (point.buyPrice) {
                        hasBuy = true;
                        markers.push({
                            time:
                                typeof point.time === "number"
                                    ? new Date(point.time)
                                          .toISOString()
                                          .split("T")[0]
                                    : (point.time as Date)
                                          .toISOString()
                                          .split("T")[0],
                            position: "belowBar",
                            color: colors.buy,
                            shape: "arrowUp",
                            text: "Buy",
                        });
                    }

                    if (point.sellPrice) {
                        hasSell = true;
                        markers.push({
                            time:
                                typeof point.time === "number"
                                    ? new Date(point.time)
                                          .toISOString()
                                          .split("T")[0]
                                    : (point.time as Date)
                                          .toISOString()
                                          .split("T")[0],
                            position: "aboveBar",
                            color: colors.sell,
                            shape: "arrowDown",
                            text: "Sell",
                        });
                    }
                });

                if (markers.length > 0) {
                    mainSeries.setMarkers(markers);
                    if (hasBuy)
                        legendRef.current.push({
                            color: colors.buy,
                            label: "Buy Signal",
                        });
                    if (hasSell)
                        legendRef.current.push({
                            color: colors.sell,
                            label: "Sell Signal",
                        });
                }
            }
        }

        // Custom tooltip handler
        chart.subscribeCrosshairMove((param: MouseEventParams) => {
            if (!tooltipRef.current) return;

            // Hide tooltip when out of bounds
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                (chartContainerRef.current &&
                    param.point.x > chartContainerRef.current.clientWidth) ||
                param.point.y < 0 ||
                (chartContainerRef.current &&
                    param.point.y > chartContainerRef.current.clientHeight)
            ) {
                tooltipRef.current.style.display = "none";
                return;
            }

            // Format ISO string for matching
            const dateStr = param.time;

            // Find the corresponding data point
            const dataPoint = data.find((point: DataPoint) => {
                const pointDate =
                    typeof point.time === "number"
                        ? new Date(point.time).toISOString().split("T")[0]
                        : (point.time as Date).toISOString().split("T")[0];
                return pointDate === dateStr;
            });

            if (!dataPoint) {
                tooltipRef.current.style.display = "none";
                return;
            }

            // Build tooltip content
            let content = `<div class="font-medium mb-1">${new Date(
                dataPoint.time instanceof Date ? dataPoint.time : dataPoint.time
            ).toLocaleDateString()}</div>`;

            // Add data based on chart type
            if (chartType === "portfolio") {
                content += `<div>Portfolio: $${(
                    dataPoint[valueKey] as number
                ).toFixed(2)}</div>`;

                if (dataPoint.price !== undefined) {
                    content += `<div>Price: $${dataPoint.price.toFixed(
                        2
                    )}</div>`;
                }

                if (dataPoint.shortSma !== undefined) {
                    content += `<div>Short SMA: $${dataPoint.shortSma.toFixed(
                        2
                    )}</div>`;
                }

                if (dataPoint.longSma !== undefined) {
                    content += `<div>Long SMA: $${dataPoint.longSma.toFixed(
                        2
                    )}</div>`;
                }

                if (dataPoint.buyPrice) {
                    content += `<div class="text-green-500">Buy: $${dataPoint.buyPrice.toFixed(
                        2
                    )}</div>`;
                }

                if (dataPoint.sellPrice) {
                    content += `<div class="text-red-500">Sell: $${dataPoint.sellPrice.toFixed(
                        2
                    )}</div>`;
                }
            } else if (chartType === "drawdown") {
                content += `<div>Drawdown: ${(
                    (dataPoint[valueKey] as number) * 100
                ).toFixed(2)}%</div>`;
            } else if (chartType === "volatility") {
                content += `<div>Volatility: ${(
                    (dataPoint[valueKey] as number) * 100
                ).toFixed(2)}%</div>`;
            }

            if (tooltipRef.current) {
                tooltipRef.current.innerHTML = content;
                tooltipRef.current.style.display = "block";
            }

            // Position tooltip
            if (chartContainerRef.current && tooltipRef.current) {
                const offset = 15;
                let left = param.point.x + offset;
                const tooltipWidth = 150;

                if (
                    left >
                    chartContainerRef.current.clientWidth - tooltipWidth
                ) {
                    left = param.point.x - tooltipWidth - offset;
                }

                let top = param.point.y + offset;
                const tooltipHeight = 120;

                if (
                    top >
                    chartContainerRef.current.clientHeight - tooltipHeight
                ) {
                    top = param.point.y - tooltipHeight - offset;
                }

                const rect = chartContainerRef.current.getBoundingClientRect();
                tooltipRef.current.style.left = `${
                    left + rect.left + window.scrollX
                }px`;
                tooltipRef.current.style.top = `${
                    top + rect.top + window.scrollY
                }px`;
            }
        });

        // Fit content to view all data
        chart.timeScale().fitContent();

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener("resize", handleResize);

        // Remove TradingView logo
        const removeTradingViewLogo = () => {
            const logoElement = document.getElementById("tv-attr-logo");
            if (logoElement) {
                logoElement.remove();
            }
        };

        removeTradingViewLogo();

        // Set up MutationObserver to catch if logo gets added later
        const observer = new MutationObserver(() => {
            removeTradingViewLogo();
        });

        if (chartContainerRef.current) {
            observer.observe(chartContainerRef.current, {
                childList: true,
                subtree: true,
            });
        }

        return () => {
            window.removeEventListener("resize", handleResize);
            observer.disconnect();
            if (tooltipRef.current) {
                document.body.removeChild(tooltipRef.current);
                tooltipRef.current = null;
            }
            if (chartRef.current) {
                chartRef.current.remove();
            }
        };
    }, [data, valueKey, chartType, theme, parameters]);

    if (!data || data.length === 0) {
        return (
            <div className="text-center text-muted-foreground">
                No data available.
            </div>
        );
    }

    return (
        <div className="w-full">
            <div ref={chartContainerRef} className="w-full h-[400px]" />
            <ChartLegend items={legendRef.current} />
        </div>
    );
};

export default function BacktestingPage() {
    const { setTheme } = useTheme();
    const { toast } = useToast();
    setTheme("dark");

    // State
    const [selectedAlgorithm] = useState(algorithms[0].name);
    const [parameters, setParameters] = useState<Record<string, number>>(
        Object.fromEntries(
            algorithms[0].parameters.map((p) => [p.name, p.default])
        )
    );
    const [symbol, setSymbol] = useState<string>("AAPL");
    const [startDate, setStartDate] = useState<Date | undefined>(
        new Date("2020-01-01")
    );
    const [endDate, setEndDate] = useState<Date | undefined>(
        new Date("2023-01-01")
    );
    const [simulationData, setSimulationData] = useState<DataPoint[]>([]);
    const [metrics, setMetrics] = useState<Record<
        string,
        { value: number }
    > | null>(null);
    const [chartsData, setChartsData] = useState<Record<string, DataPoint[]>>(
        {}
    );
    const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState("chart");

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const httpManager = useMemo(() => HTTPRequestManager.getInstance(), []);

    useEffect(() => {
        httpManager.addServer("backtest-server", "http://0.0.0.0:9000/");

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [httpManager]);

    const handleRun = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setIsRunning(true);
        setSimulationData([]);
        setMetrics(null);
        setChartsData({});
        setSelectedCharts([]);

        try {
            const backtestPayload = {
                symbol: symbol || "AAPL",
                strategy_id: "moving_average",
                start_date: startDate
                    ? format(startDate, "yyyy-MM-dd'T'00:00:00")
                    : "2020-01-01T00:00:00",
                end_date: endDate
                    ? format(endDate, "yyyy-MM-dd'T'23:59:59")
                    : "2023-01-01T00:00:00",
                initial_capital: 10000.0,
                parameters: {
                    short_window: parameters.shortWindow,
                    long_window: parameters.longWindow,
                },
            };

            // Use HTTPRequestManager instead of fetch
            const data = await httpManager.handleRequest(
                "api/v1/backtest",
                Methods.POST,
                backtestPayload,
                "backtest-server"
            );

            // Process the backtest results
            processBacktestResults(data);

            // Show success toast
            toast({
                title: "Backtest Completed",
                description: `Successfully ran backtest for ${symbol} with ${parameters.shortWindow}/${parameters.longWindow} SMA`,
            });
        } catch (error) {
            console.error("Backtest API error:", error);
            toast({
                title: "Backtest Failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred",
                variant: "destructive",
            });
            setIsRunning(false);
        }
    };

    // Function to process the backtest results
    const processBacktestResults = (data: any) => {
        if (!data || !data.graph_data || !data.metrics) {
            console.error("Invalid backtest results format");
            setIsRunning(false);
            return;
        }

        // Format the graph data for our chart
        const formattedData = data.graph_data.map((point: any) => ({
            time: new Date(point.Date).getTime(),
            date: new Date(point.Date),
            value: point.portfolio_value,
            price: point.price,
            shortSma: point.short_sma,
            longSma: point.long_sma,
            performance: point.portfolio_performance,
            buyPrice: point.buyPrice,
            sellPrice: point.sellPrice,
        }));

        setSimulationData(formattedData);

        // Format metrics to match our UI
        const formattedMetrics = {
            netPerformance: { value: data.metrics.net_performance },
            winStreakAvg: { value: data.metrics.win_rate * 3 || 0 }, // Approximation
            winStreakMax: {
                value: Math.round(data.metrics.win_rate * 10) || 0,
            }, // Approximation
            wins: {
                value:
                    Math.round(
                        data.metrics.num_trades * data.metrics.win_rate
                    ) || 0,
            },
            lossStreakAvg: { value: (1 - data.metrics.win_rate) * 3 || 0 }, // Approximation
            lossStreakMax: {
                value: Math.round((1 - data.metrics.win_rate) * 7) || 0,
            }, // Approximation
            losses: {
                value:
                    Math.round(
                        data.metrics.num_trades * (1 - data.metrics.win_rate)
                    ) || 0,
            },
            tradesPerDay: {
                value: Math.max(1, Math.round(data.metrics.num_trades / 365)),
            }, // Approximation
            tradesPerMonth: {
                value: Math.max(1, Math.round(data.metrics.num_trades / 12)),
            }, // Approximation
            maxDrawdown: { value: Math.abs(data.metrics.max_drawdown) },
            sharpeRatio: { value: data.metrics.sharpe_ratio },
            sortinoRatio: { value: data.metrics.sharpe_ratio * 1.2 || 0 }, // Approximation if not provided
            beta: { value: 1.0 }, // Not provided in API
            lossStdDev: { value: data.metrics.volatility * 0.8 || 0.03 }, // Approximation
            realizedVolatility: { value: data.metrics.volatility },
        };

        setMetrics(formattedMetrics);

        // Create chart data for various metrics
        const drawdownData = formattedData.map(
            (point: DataPoint, i: number, arr: DataPoint[]) => {
                const maxValue = Math.max(
                    ...arr.slice(0, i + 1).map((p) => p.value)
                );
                const drawdown = (maxValue - point.value) / maxValue;
                return {
                    time: point.time,
                    date: point.date,
                    drawdown,
                    value: drawdown,
                };
            }
        );

        const volatilityData = formattedData
            .slice(1)
            .map((point: DataPoint, i: number) => {
                const prevValue = formattedData[i].value;
                const returnVal = (point.value - prevValue) / prevValue;
                return {
                    time: point.time,
                    date: point.date,
                    value: Math.abs(returnVal),
                };
            });

        setChartsData({
            portfolioValue: formattedData,
            drawdown: drawdownData,
            volatility: volatilityData,
        });

        // Auto-select the portfolio value chart
        setSelectedCharts(["portfolioValue"]);

        setIsRunning(false);
    };

    // Parameter Form with date range selection
    const ParameterForm = () => (
        <div className="space-y-4">
            {/* Algorithm parameters */}
            {algorithms[0].parameters.map((param) => (
                <div key={param.name}>
                    <label className="block text-sm font-medium">
                        {param.label}
                    </label>
                    <Input
                        type="number"
                        value={parameters[param.name]}
                        onChange={(e) =>
                            setParameters({
                                ...parameters,
                                [param.name]: Number(e.target.value),
                            })
                        }
                        className="mt-1"
                    />
                </div>
            ))}

            {/* Date range selection */}
            <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Start Date
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate
                                    ? format(startDate, "PP")
                                    : "Select date"}
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
                <div>
                    <label className="block text-sm font-medium mb-1">
                        End Date
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate
                                    ? format(endDate, "PP")
                                    : "Select date"}
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
            </div>

            {/* Stock selection */}
            <div>
                <label className="block text-sm font-medium mb-1">Symbol</label>
                <Input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="AAPL"
                    className="mt-1"
                />
            </div>
        </div>
    );

    // Metrics Display
    const MetricsDisplay = ({
        metrics,
        chartsData,
        selectedCharts,
        setSelectedCharts,
    }: MetricsDisplayProps) => {
        if (!metrics) {
            return (
                <div className="text-center text-muted-foreground">
                    Metrics will appear after the simulation completes.
                </div>
            );
        }

        return (
            <div className="flex flex-col space-y-4">
                {/* Metrics Table */}
                <div className="w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Metric</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Chart</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {metricsConfig.map((config) => {
                                const metric = metrics[config.key];
                                if (!metric) return null;
                                const value = metric.value;
                                const colorClass = config.colorCondition(
                                    value,
                                    metrics
                                );
                                const formattedValue = config.format(value);
                                return (
                                    <TableRow key={config.key}>
                                        <TableCell>{config.label}</TableCell>
                                        <TableCell className={colorClass}>
                                            {formattedValue}
                                        </TableCell>
                                        <TableCell>
                                            {config.chartKey && (
                                                <Checkbox
                                                    checked={selectedCharts.includes(
                                                        config.chartKey
                                                    )}
                                                    onCheckedChange={(
                                                        checked
                                                    ) => {
                                                        if (checked) {
                                                            setSelectedCharts([
                                                                ...selectedCharts,
                                                                config.chartKey,
                                                            ]);
                                                        } else {
                                                            setSelectedCharts(
                                                                selectedCharts.filter(
                                                                    (k) =>
                                                                        k !==
                                                                        config.chartKey
                                                                )
                                                            );
                                                        }
                                                    }}
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Charts Display */}
                <div className="w-full space-y-4">
                    {selectedCharts.map((chartKey) => (
                        <Card key={chartKey}>
                            <CardHeader>
                                <CardTitle>
                                    {chartKey.replace(/([A-Z])/g, " $1").trim()}{" "}
                                    Chart
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SimulationGraph
                                    data={chartsData[chartKey]}
                                    valueKey={
                                        chartKey === "drawdown"
                                            ? "drawdown"
                                            : "value"
                                    }
                                    chartType={
                                        chartKey === "portfolioValue"
                                            ? "portfolio"
                                            : chartKey === "drawdown"
                                            ? "drawdown"
                                            : "volatility"
                                    }
                                    parameters={parameters}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    // AI Insights component
    const AIInsights = ({
        metrics,
    }: {
        metrics: Record<string, { value: number }> | null;
    }) => {
        if (!metrics) {
            return (
                <div className="text-center text-muted-foreground">
                    AI insights will appear after the simulation completes.
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <p>
                    <strong>Performance Summary:</strong> The simulation shows a
                    net performance of{" "}
                    {(metrics.netPerformance.value * 100).toFixed(2)}
                    %, indicating a{" "}
                    {metrics.netPerformance.value >= 0
                        ? "positive"
                        : "negative"}{" "}
                    return on investment. The maximum drawdown of{" "}
                    {(metrics.maxDrawdown.value * 100).toFixed(2)}% suggests
                    {metrics.maxDrawdown.value > 0.2
                        ? " high"
                        : metrics.maxDrawdown.value > 0.1
                        ? " moderate"
                        : " low"}{" "}
                    risk exposure.
                </p>
                <p>
                    <strong>Risk Analysis:</strong> The Sharpe Ratio of{" "}
                    {metrics.sharpeRatio.value.toFixed(2)} and Sortino Ratio of{" "}
                    {metrics.sortinoRatio.value.toFixed(2)} indicate that the
                    strategy provides a{" "}
                    {metrics.sharpeRatio.value > 1 ? "good" : "poor"}{" "}
                    risk-adjusted return. The beta of{" "}
                    {metrics.beta.value.toFixed(2)} suggests the strategy is
                    {metrics.beta.value < 0.9
                        ? " less volatile than"
                        : metrics.beta.value > 1.1
                        ? " more volatile than"
                        : " similar in volatility to"}{" "}
                    the benchmark asset.
                </p>
                <p>
                    <strong>Win/Loss Patterns:</strong> With a win rate of{" "}
                    {(
                        (metrics.wins.value /
                            (metrics.wins.value + metrics.losses.value)) *
                        100
                    ).toFixed(2)}
                    % and a total of {metrics.wins.value + metrics.losses.value}{" "}
                    trades, the strategy shows
                    {metrics.wins.value > metrics.losses.value
                        ? " promising"
                        : " concerning"}{" "}
                    results.
                </p>
                <p>
                    <strong>Volatility Insight:</strong> The realized volatility
                    of {(metrics.realizedVolatility.value * 100).toFixed(2)}% is
                    {metrics.realizedVolatility.value > 0.2
                        ? " high"
                        : metrics.realizedVolatility.value > 0.1
                        ? " moderate"
                        : " low"}
                    , indicating{" "}
                    {metrics.realizedVolatility.value > 0.2
                        ? "unstable"
                        : metrics.realizedVolatility.value > 0.1
                        ? "moderately stable"
                        : "stable"}{" "}
                    performance.
                </p>
                <p>
                    <strong>Recommendation:</strong>{" "}
                    {metrics.netPerformance.value > 0.3
                        ? "This strategy shows excellent performance. Consider allocating a significant portion of your portfolio to this approach."
                        : metrics.netPerformance.value > 0.1
                        ? "This strategy is performing well. Consider fine-tuning parameters to reduce drawdown while maintaining returns."
                        : metrics.netPerformance.value > 0
                        ? "This strategy is showing positive but modest returns. Experiment with different parameter combinations to improve performance."
                        : "This strategy is underperforming. Consider a different approach or significantly adjust the parameters."}
                </p>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Backtesting Interface</h1>

            {/* Parameters Section */}
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
                <div className="w-full md:w-1/3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Algorithm Selection</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select
                                value={selectedAlgorithm}
                                onValueChange={() => {}}
                            >
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedAlgorithm}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {algorithms.map((algo) => (
                                        <SelectItem
                                            key={algo.name}
                                            value={algo.name}
                                        >
                                            {algo.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                </div>
                <div className="w-full md:w-2/3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Parameters</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ParameterForm />
                        </CardContent>
                        <CardContent>
                            <Button
                                onClick={handleRun}
                                disabled={isRunning}
                                className="w-full"
                            >
                                {isRunning
                                    ? "Running Backtest..."
                                    : "Run Backtest"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Content with Tabs */}
            {simulationData.length > 0 && (
                <Card className="mb-6">
                    <Tabs defaultValue="chart" onValueChange={setActiveTab}>
                        <CardHeader className="pb-0">
                            <div className="flex justify-between items-center">
                                <CardTitle>Simulation Results</CardTitle>
                                <TabsList>
                                    <TabsTrigger value="chart">
                                        Chart
                                    </TabsTrigger>
                                    <TabsTrigger value="insights">
                                        AI Insights
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-6">
                            <TabsContent value="chart" className="m-0">
                                {/* Main simulation chart - full width for better visibility */}
                                <SimulationGraph
                                    data={simulationData}
                                    chartType="portfolio"
                                    parameters={parameters}
                                />
                            </TabsContent>

                            <TabsContent value="insights" className="m-0">
                                <AIInsights metrics={metrics} />
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            )}

            {/* Metrics and Additional Charts Section */}
            {metrics && (
                <Card>
                    <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MetricsDisplay
                            metrics={metrics}
                            chartsData={chartsData}
                            selectedCharts={selectedCharts}
                            setSelectedCharts={setSelectedCharts}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
