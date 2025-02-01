"use client";

import React from "react";
import { ApexOptions } from "apexcharts";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
});

interface ChartState {
    options: ApexOptions;
    series: { name: string; data: { x: Date; y: number[] }[] }[];
}

export default function Dashboard() {
    const [chartState, setChartState] = useState<ChartState>({
        options: {
            chart: {
                type: "candlestick",
                height: 350,
                zoom: {
                    enabled: true,
                },
                background: "#000",
            },
            title: {
                text: "CandleStick Chart",
                align: "left",
                style: {
                    color: "#fff",
                },
            },
            xaxis: {
                type: "datetime",
                labels: {
                    style: {
                        colors: "#fff",
                    },
                },
            },
            yaxis: {
                tooltip: {
                    enabled: true,
                },
                labels: {
                    style: {
                        colors: "#fff",
                    },
                },
            },
            tooltip: {
                theme: "dark",
            },
            grid: {
                borderColor: "#444",
            },
        },
        series: [
            {
                name: "Price Data",
                data: [
                    {
                        x: new Date(1538778600000),
                        y: [6629.81, 6650.5, 6623.04, 6633.33],
                    },
                    {
                        x: new Date(1538780400000),
                        y: [6632.01, 6643.59, 6620, 6630.11],
                    },
                    {
                        x: new Date(1538782200000),
                        y: [6630.71, 6648.95, 6623.34, 6635.65],
                    },
                ],
            },
        ],
    });

    useEffect(() => {
        const fetchData = async () => {
            const simulatedData = [
                {
                    x: new Date(1538784000000),
                    y: [6635.65, 6651, 6629.67, 6638.24],
                },
                {
                    x: new Date(1538785800000),
                    y: [6638.24, 6640, 6620, 6624.47],
                },
                {
                    x: new Date(1538787600000),
                    y: [6624.53, 6636.03, 6621.68, 6624.31],
                },
            ];

            setChartState((prevState) => ({
                ...prevState,
                series: [
                    {
                        ...prevState.series[0],
                        data: [...prevState.series[0].data, ...simulatedData],
                    },
                ],
            }));
        };

        fetchData();
    }, []);

    return (
        <div className="font-[family-name:var(--font-geist-sans)]">
            <div id="chart">
                <ReactApexChart
                    options={chartState.options}
                    series={chartState.series}
                    type="candlestick"
                    height={350}
                />
            </div>
        </div>
    );
}
