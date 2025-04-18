"use client";

import { useState, useEffect, useRef } from "react";
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
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

// Mock algorithms
const algorithms = [
    {
        name: "Moving Average Crossover",
        parameters: [
            { name: "shortWindow", label: "Short Window", default: 10 },
            { name: "longWindow", label: "Long Window", default: 20 },
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
    setTheme("dark");

    // State
    const [selectedAlgorithm] = useState(algorithms[0].name);
    const [parameters, setParameters] = useState(
        Object.fromEntries(
            algorithms[0].parameters.map((p) => [p.name, p.default])
        )
    );
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [chartsData, setChartsData] = useState<any>({});
    const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleRun = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setIsRunning(true);
        setSimulationData([]);
        setMetrics(null);
        setChartsData({});
        setSelectedCharts([]);

        let time = 0;
        let currentValue = 100;
        const localData: any[] = [];

        intervalRef.current = setInterval(() => {
            const newPoint = {
                time,
                value: currentValue + (Math.random() - 0.5) * 10,
            };
            localData.push(newPoint);
            setSimulationData([...localData]);
            currentValue = newPoint.value;
            time += 1;
        }, 500);

        timeoutRef.current = setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);

            if (localData.length < 2) {
                console.error("Not enough data points generated.");
                setIsRunning(false);
                return;
            }

            const finalValue = localData[localData.length - 1].value;
            const initialValue = localData[0].value;
            const totalReturn = (finalValue - initialValue) / initialValue;

            let maxValue = localData[0].value;
            const drawdownData = localData.map((point) => {
                if (point.value > maxValue) maxValue = point.value;
                const drawdown = (maxValue - point.value) / maxValue;
                return { time: point.time, drawdown };
            });
            const maxDrawdown = Math.max(
                ...drawdownData.map((d) => d.drawdown)
            );

            const returns = localData
                .slice(1)
                .map(
                    (point, i) =>
                        (point.value - localData[i].value) / localData[i].value
                );
            const volatility = Math.sqrt(
                returns.reduce((sum, r) => sum + r * r, 0) / returns.length
            );

            setMetrics({
                netPerformance: { value: totalReturn },
                winStreakAvg: { value: 2.5 },
                winStreakMax: { value: 5 },
                wins: { value: 60 },
                lossStreakAvg: { value: 1.8 },
                lossStreakMax: { value: 3 },
                losses: { value: 40 },
                tradesPerDay: { value: 10 },
                tradesPerMonth: { value: 200 },
                maxDrawdown: { value: maxDrawdown },
                sharpeRatio: { value: 1.2 },
                sortinoRatio: { value: 1.5 },
                beta: { value: 0.95 },
                lossStdDev: { value: 0.03 },
                realizedVolatility: { value: volatility },
            });

            setChartsData({
                portfolioValue: localData,
                drawdown: drawdownData,
                volatility: localData.slice(1).map((point, i) => ({
                    time: point.time,
                    value: Math.abs(returns[i]),
                })),
            });

            setIsRunning(false);
        }, 10000);
    };

    // Parameter Form
    const ParameterForm = () => (
        <div className="space-y-4">
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
        </div>
    );

    // Simulation Graph
    const SimulationGraph = ({
        data,
        valueKey = "value",
    }: {
        data: any[];
        valueKey?: string;
    }) => {
        if (data.length === 0) {
            return (
                <div className="text-center text-muted-foreground">
                    No data available.
                </div>
            );
        }
        return (
            <LineChart width={600} height={300} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey={valueKey} stroke="#8884d8" />
            </LineChart>
        );
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
            <div className="flex space-x-4">
                {/* Metrics Table (Left Column) */}
                <div className="flex-1">
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
                {/* Charts Display (Right Column) */}
                <div className="flex-1">
                    {selectedCharts.map((chartKey) => (
                        <Card key={chartKey} className="mb-4">
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
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    // Simulation Results with AI Insights
    const SimulationResults = () => (
        <div className="flex space-x-4">
            {/* Simulation Chart (Left Column) */}
            <div className="flex-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Simulation Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SimulationGraph data={simulationData} />
                    </CardContent>
                </Card>
            </div>
            {/* AI Insights Placeholder (Right Column) */}
            <div className="flex-1">
                <Card>
                    <CardHeader>
                        <CardTitle>AI Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>
                            <strong>Performance Summary:</strong> The simulation
                            shows a net performance of 4.49%, indicating a
                            positive return on investment. However, the maximum
                            drawdown of 3.44% suggests moderate risk exposure.
                        </p>
                        <p>
                            <strong>Risk Analysis:</strong> The Sharpe Ratio of
                            1.20 and Sortino Ratio of 1.50 indicate that the
                            strategy provides a good risk-adjusted return. The
                            beta of 0.95 suggests the strategy is slightly less
                            volatile than the benchmark asset.
                        </p>
                        <p>
                            <strong>Win/Loss Patterns:</strong> With a win
                            streak average of 2.50 and a loss streak average of
                            1.80, the strategy demonstrates consistent winning
                            patterns. The maximum loss streak of 3 is within
                            acceptable limits.
                        </p>
                        <p>
                            <strong>Volatility Insight:</strong> The realized
                            volatility of 1.72% is low, indicating stable
                            performance. However, the loss standard deviation of
                            3.00% suggests occasional larger losses.
                        </p>
                        <p>
                            <strong>Recommendation:</strong> Consider adjusting
                            the strategy to reduce the maximum drawdown further
                            while maintaining the current win/loss ratio.
                            Increasing the trade frequency could also enhance
                            overall performance.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Backtesting Interface</h1>
            <div className="flex space-x-4 mb-4">
                <div className="w-1/3">
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
                <div className="w-2/3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Parameters</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ParameterForm />
                        </CardContent>
                        <CardContent>
                            <Button onClick={handleRun} disabled={isRunning}>
                                {isRunning ? "Running..." : "Run Simulation"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Simulation Results Section */}
            <SimulationResults />
            {/* Metrics Section */}
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>Metrics</CardTitle>
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
        </div>
    );
}
