"use client";

import React, { useEffect, useState } from "react";
import Highcharts from "highcharts/highstock";
import { emitTo, listen } from "@tauri-apps/api/event";
import './style.css';

const serverURL = "http://127.0.0.1:8000";

const Dashboard: React.FC = () => {
    const [tickers, setTickers] = useState<Set<string>>(new Set());
    const [charts, setCharts] = useState<Map<string, Highcharts.Chart>>(new Map());
    const [newsData, setNewsData] = useState<Map<string, any[]>>(new Map());
    const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);

    useEffect(() => {
        const setupListener = async () => {
            await emitTo("main", "window_created", "from dashboard");
            const unlisten = await listen<any>("targetfield", (event) => {
                const ticker: string = (event.payload.args).toUpperCase();
                if (ticker && !tickers.has(ticker)) {
                    setTickers((prev) => new Set(prev).add(ticker));
                    fetchChartData(ticker);
                }
            });

            return () => {
                unlisten();
            };
        };

        setupListener();
    }, []);

    const fetchChartData = async (ticker: string) => {
        try {
            const response = await fetch(
                `${serverURL}/stock-price/${ticker}?period=all`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    setTickers((prev) => {
                        const newTickers = new Set(prev);
                        newTickers.delete(ticker);
                        return newTickers;
                    });
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const dataPoints = data.entries.map((entry: { date: string; open: number; high: number; low: number; close: number }) => [
                new Date(entry.date).getTime(), entry.open, entry.high, entry.low, entry.close,
            ]);

            createChart(ticker, dataPoints);
            fetchNewsData(ticker);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const fetchNewsData = async (ticker: string) => {
        try {
            const response = await fetch(`${serverURL}/stock-news-polygon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    symbol: ticker,
                    order: "desc",
                    limit: "5"
                }),
            });

            if (response.ok) {
                const news = await response.json();
                setNewsData((prev) => new Map(prev).set(ticker, news.results));
            } else {
                console.error("Failed to fetch news data");
            }
        } catch (error) {
            console.error("Error fetching news data:", error);
        }
    };

    const createChart = (ticker: string, data: any) => {
        const existingChart = charts.get(ticker);
        if (existingChart) {
            existingChart.series[0].setData(data);
        } else {
            const newChart = Highcharts.stockChart(`chart-${ticker}`, {
                chart: { 
                    backgroundColor: '#1a1a1a'
                },
                title: { 
                    text: `${ticker} Stock Price`, 
                    style: { color: '#e0e0e0' } 
                },
                xAxis: { 
                    type: 'datetime', 
                    labels: { style: { color: '#e0e0e0' } },
                    title: { text: 'Date', style: { color: '#e0e0e0' } }
                },
                yAxis: { 
                    title: { text: 'Price', style: { color: '#e0e0e0' } },
                    labels: { style: { color: '#e0e0e0' } }
                },
                plotOptions: {
                    candlestick: {
                        color: '#ff4c4c',
                        upColor: '#4caf50',
                        lineColor: '#ff4c4c',
                        upLineColor: '#4caf50',
                        dataLabels: {
                            color: '#ffffff'
                        }
                    }
                },
                series: [{
                    type: 'candlestick',
                    name: `${ticker} Stock Price`,
                    data: data,
                    tooltip: {
                        valueDecimals: 3
                    }
                }],
            });

            setCharts((prev) => new Map(prev).set(ticker, newChart));
        }
    };

    const handleClose = (ticker: string) => {
        setTickers((prev) => {
            const newTickers = new Set(prev);
            newTickers.delete(ticker);
            return newTickers;
        });
        setNewsData((prev) => {
            const newNewsData = new Map(prev);
            newNewsData.delete(ticker);
            return newNewsData;
        });
    };

    return (
        <div className="dashboard-container">
            {Array.from(tickers).map((ticker) => (
                <div 
                    key={ticker} 
                    className="ticker-container"
                    onMouseEnter={() => setHoveredTicker(ticker)} 
                    onMouseLeave={() => setHoveredTicker(null)}
                >
                    <div className="chart-container">
                        <div
                            id={`chart-${ticker}`}
                        ></div>
                        {hoveredTicker === ticker && (
                            <button 
                                onClick={() => handleClose(ticker)} 
                                className="close-button"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <div className="news-container">
                        <h3 className="news-title">Latest {ticker} News</h3>
                        {newsData.get(ticker)?.slice(0, 5).map((news, index) => (
                            <div key={news.id} className="news-item">
                                <h4>{index + 1}. {news.title}</h4>
                                <p>{news.description}</p>
                                <p><strong>Sentiment:</strong> {news.insights[0]?.sentiment || 'N/A'}</p>
                                <p><strong>Reasoning:</strong> {news.insights[0]?.sentiment_reasoning || 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Dashboard;