"use client";

import { useState, useEffect, useRef } from "react";
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

// Import Highcharts

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMore from "highcharts/highcharts-more";
import HighchartsExporting from "highcharts/modules/exporting";

// Initialize Highcharts modules in client side only
if (typeof Highcharts !== "object") {
    HighchartsExporting(Highcharts);
    HighchartsMore(Highcharts);
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

// Metrics configuration
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

export default function BacktestingPage() {
    const { setTheme } = useTheme();
    const { toast } = useToast();
    setTheme("dark");

    // State
    const [selectedAlgorithm] = useState(algorithms[0].name);
    const [parameters, setParameters] = useState(
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
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [chartsData, setChartsData] = useState<any>({});
    const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState("chart");

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const httpManager = useMemo(() => HTTPRequestManager.getInstance(), []);

    useEffect(() => {
        // Configure HTTP manager for the backtest server
        httpManager.addServer("backtest-server", "http://0.0.0.0:8000/");

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
            (point: any, i: number, arr: any[]) => {
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
            .map((point: any, i: number) => {
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

    // Enhanced Simulation Graph with Highcharts
    // Enhanced Simulation Graph with Highcharts
    const SimulationGraph = ({
        data,
        valueKey = "value",
        chartType = "portfolio",
    }: {
        data: any[];
        valueKey?: string;
        chartType?: string;
    }) => {
        if (data.length === 0) {
            return (
                <div className="text-center text-muted-foreground">
                    No data available.
                </div>
            );
        }

        // Prepare series data for Highcharts
        const series = [];
        const buySignals = [];
        const sellSignals = [];
        const buyLines = [];
        const sellLines = [];

        // Add portfolio value or selected metric series
        const mainSeriesData = data.map((point) => [
            point.time,
            point[valueKey],
        ]);
        series.push({
            name:
                chartType === "portfolio"
                    ? "Portfolio Value"
                    : chartType === "drawdown"
                    ? "Drawdown"
                    : "Volatility",
            data: mainSeriesData,
            tooltip: {
                valueDecimals: 2,
                valuePrefix: chartType === "portfolio" ? "$" : "",
                valueSuffix: chartType !== "portfolio" ? "%" : "",
            },
            zIndex: 1,
        });

        // Add price and SMA series if available and this is a portfolio chart
        if (chartType === "portfolio" && data[0]?.price !== undefined) {
            // Asset price series
            series.push({
                name: "Asset Price",
                data: data.map((point) => [point.time, point.price]),
                yAxis: 1,
                tooltip: {
                    valueDecimals: 2,
                    valuePrefix: "$",
                },
                dashStyle: "shortdot",
                zIndex: 1,
            });

            // SMA series if available
            if (data[0]?.shortSma !== undefined) {
                series.push({
                    name: `Short SMA (${parameters.shortWindow})`,
                    data: data.map((point) => [point.time, point.shortSma]),
                    yAxis: 1,
                    tooltip: {
                        valueDecimals: 2,
                        valuePrefix: "$",
                    },
                    zIndex: 1,
                });
            }

            if (data[0]?.longSma !== undefined) {
                series.push({
                    name: `Long SMA (${parameters.longWindow})`,
                    data: data.map((point) => [point.time, point.longSma]),
                    yAxis: 1,
                    tooltip: {
                        valueDecimals: 2,
                        valuePrefix: "$",
                    },
                    zIndex: 1,
                });
            }

            // Get max and min values for price axis to set vertical line heights
            let maxPrice = Math.max(...data.map((point) => point.price || 0));
            let minPrice = Math.min(...data.map((point) => point.price || 0));

            // Add a small buffer for visual clarity
            maxPrice = maxPrice * 1.02;
            minPrice = minPrice * 0.98;

            // Prepare buy/sell signals
            data.forEach((point) => {
                if (point.buyPrice) {
                    // Buy signal point
                    buySignals.push({
                        x: point.time,
                        y: point.buyPrice,
                        marker: {
                            enabled: true,
                            symbol: "circle",
                            fillColor: "green",
                            lineColor: "white",
                            lineWidth: 1,
                            radius: 3,
                        },
                        title: "Buy",
                        text: `Buy signal at $${point.buyPrice.toFixed(2)}`,
                    });

                    // Buy signal vertical line
                    buyLines.push({
                        x: point.time,
                        y: maxPrice - minPrice,
                        low: minPrice,
                        high: maxPrice,
                    });
                }
                if (point.sellPrice) {
                    // Sell signal point
                    sellSignals.push({
                        x: point.time,
                        y: point.sellPrice,
                        marker: {
                            enabled: true,
                            symbol: "circle",
                            fillColor: "red",
                            lineColor: "white",
                            lineWidth: 1,
                            radius: 3,
                        },
                        title: "Sell",
                        text: `Sell signal at $${point.sellPrice.toFixed(2)}`,
                    });

                    // Sell signal vertical line
                    sellLines.push({
                        x: point.time,
                        y: maxPrice - minPrice,
                        low: minPrice,
                        high: maxPrice,
                    });
                }
            });

            // Add buy/sell signals as series
            if (buySignals.length > 0) {
                series.push({
                    name: "Buy Signals",
                    type: "scatter",
                    data: buySignals,
                    yAxis: 1,
                    tooltip: {
                        pointFormat: "<b>Buy Signal</b>: ${point.y:.2f}",
                    },
                    showInLegend: true,
                    zIndex: 5,
                    marker: {
                        enabled: true,
                        symbol: "circle",
                        radius: 6,
                    },
                });
            }

            if (sellSignals.length > 0) {
                series.push({
                    name: "Sell Signals",
                    type: "scatter",
                    data: sellSignals,
                    yAxis: 1,
                    tooltip: {
                        pointFormat: "<b>Sell Signal</b>: ${point.y:.2f}",
                    },
                    showInLegend: true,
                    zIndex: 5,
                    marker: {
                        enabled: true,
                        symbol: "circle",
                        radius: 6,
                    },
                });
            }
        }

        // Configure chart options
        const options = {
            chart: {
                height: 500,
                zoomType: "x",
                backgroundColor: "transparent",
                style: {
                    fontFamily: "Inter, system-ui, sans-serif",
                },
            },
            time: {
                useUTC: false,
            },
            title: {
                text: null,
            },
            xAxis: {
                type: "datetime",
                lineColor: "#333",
                labels: {
                    style: {
                        color: "#888",
                    },
                },
                crosshair: true,
            },
            yAxis:
                chartType === "portfolio"
                    ? [
                          {
                              // Left y-axis for portfolio value
                              title: {
                                  text: "Portfolio Value ($)",
                                  style: {
                                      color: "#8884d8",
                                  },
                              },
                              labels: {
                                  style: {
                                      color: "#888",
                                  },
                              },
                              gridLineColor: "#222",
                          },
                          {
                              // Right y-axis for price and SMAs
                              title: {
                                  text: "Price ($)",
                                  style: {
                                      color: "#82ca9d",
                                  },
                              },
                              labels: {
                                  style: {
                                      color: "#888",
                                  },
                              },
                              opposite: true,
                              gridLineColor: "#222",
                          },
                      ]
                    : [
                          {
                              // Single axis for other charts
                              title: {
                                  text:
                                      chartType === "drawdown"
                                          ? "Drawdown (%)"
                                          : "Volatility (%)",
                                  style: {
                                      color: "#8884d8",
                                  },
                              },
                              labels: {
                                  style: {
                                      color: "#888",
                                  },
                                  formatter: function () {
                                      return (
                                          (this.value * 100).toFixed(2) + "%"
                                      );
                                  },
                              },
                              gridLineColor: "#222",
                          },
                      ],
            legend: {
                enabled: true,
                itemStyle: {
                    color: "#888",
                },
            },
            plotOptions: {
                series: {
                    animation: true,
                    marker: {
                        enabled: false,
                    },
                },
                scatter: {
                    marker: {
                        enabled: true,
                        radius: 6,
                    },
                    states: {
                        hover: {
                            enabled: true,
                            lineWidthPlus: 0,
                        },
                    },
                },
                columnrange: {
                    dataLabels: {
                        enabled: false,
                    },
                },
            },
            tooltip: {
                shared: true,
                crosshairs: true,
                backgroundColor: "rgba(40, 40, 40, 0.9)",
                borderColor: "#444",
                borderRadius: 6,
                borderWidth: 1,
                shadow: true,
                style: {
                    color: "#eee",
                },
            },
            series,
            responsive: {
                rules: [
                    {
                        condition: {
                            maxWidth: 500,
                        },
                        chartOptions: {
                            legend: {
                                layout: "horizontal",
                                align: "center",
                                verticalAlign: "bottom",
                            },
                        },
                    },
                ],
            },
            exporting: {
                enabled: false,
                buttons: {
                    contextButton: {
                        menuItems: [
                            "viewFullscreen",
                            "printChart",
                            "separator",
                            "downloadPNG",
                            "downloadJPEG",
                            "downloadPDF",
                            "downloadSVG",
                        ],
                    },
                },
            },
            credits: {
                enabled: false,
            },
        };

        return <HighchartsReact highcharts={Highcharts} options={options} />;
    };

    // Metrics Display
    const MetricsDisplay = ({
        metrics,
        chartsData,
        selectedCharts,
        setSelectedCharts,
    }: {
        metrics: any;
        chartsData: any;
        selectedCharts: string[];
        setSelectedCharts: (charts: string[]) => void;
    }) => {
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
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    // AI Insights component
    const AIInsights = ({ metrics }: { metrics: any }) => {
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
