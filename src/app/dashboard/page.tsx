"use client";

import React, { useEffect, useState } from "react";
import Highcharts from "highcharts/highstock";
import { ResizableBox } from 'react-resizable';
import { emitTo, listen } from "@tauri-apps/api/event";
import './style.css';

const serverURL = "http://127.0.0.1:8000";

const Dashboard: React.FC = () => {
    const [tickers, setTickers] = useState<Set<string>>(new Set());
    const [charts, setCharts] = useState<Map<string, Highcharts.Chart>>(new Map());
    const [newsData, setNewsData] = useState<Map<string, any[]>>(new Map());
    const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
    const [tickerDimensions, setTickerDimensions] = useState<Map<string, {height: number, widthChart: number, widthNews: number}>>(new Map());

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
        fetchWatchlist();
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
            const dataPoints = data.entries.map((entry: { date: string; open: number; high: number; low: number; close: number; volume: number }) => [
                new Date(entry.date).getTime(), entry.open, entry.high, entry.low, entry.close, entry.volume
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
                yAxis: [
                {
                    title: { text: 'Volume', style: { color: '#e0e0e0' } },
                    labels: { style: { color: '#e0e0e0' } },
                    opposite: false,
                }, 
                {
                    title: { text: 'Price', style: { color: '#e0e0e0' } },
                    labels: { style: { color: '#e0e0e0' } },
                    opposite: true,
                }],
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
                series: [
                {
                    type: 'column',
                    name: 'Volume',
                    data: data.map((entry: any[]) => [entry[0], entry[5]]),
                    tooltip: {
                        valueDecimals: 0
                    },
                    color: '#808080',
                    opacity: 0.5
                },
                {
                    type: 'candlestick',
                    name: `${ticker} Stock Price`,
                    data: data.map((entry: any[]) => [entry[0], entry[1], entry[2], entry[3], entry[4]]),
                    yAxis: 1,
                    tooltip: {
                        valueDecimals: 3
                    }
                }],

            });

            setCharts((prev) => new Map(prev).set(ticker, newChart));
        }
    };

    const toSciNotation = (num: number) => {
        return (
                num >= 1e12 ? (num / 1e12).toFixed(2) + 'T' :
                (num >= 1e9 ? (num / 1e9).toFixed(2) + 'B' :
                (num >= 1e6 ? (num / 1e6).toFixed(2) + 'M' :
                (num >= 1e3 ? (num / 1e3).toFixed(2) + 'K' :
                num.toFixed(2)
            ))));
    };

    const fetchWatchlist = async () => {
        const watchlistBody = document.getElementById("watchlist-body");
        if (!watchlistBody) return;
        watchlistBody.innerHTML = "";

        try {
            const response = await fetch(`${serverURL}/watchlist`);
            if (response.ok) {
                const watchlist = await response.json();
                watchlist.forEach((item: any) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${item.ticker}</td>
                        <td>${item.last}</td>
                        <td style="background-color: ${item.change >= 0 ? '#006401;' : '#8B0001;'}">${item.change}</td>
                        <td style="background-color: ${item.change >= 0 ? '#006401;' : '#8B0001;'}">${(item.changePer * 100).toFixed(2)}%</td>
                        <td>${toSciNotation(item.volume)}</td>
                        <td>${toSciNotation(item.avgVolume)}</td>
                        <td>${'$'+toSciNotation(item.marketCapacity)}</td>
                    `;
                    watchlistBody.appendChild(row);
                });
            } else {
                console.error("Failed to fetch watchlist");
            }
        } catch (error) {
            console.error("Error fetching watchlist:", error);
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

    const handleResize = (ticker: string, height: number, widthChart: number, widthNews: number) => {
        setTickerDimensions((prev) => new Map(prev).set(ticker, {height, widthChart, widthNews}));
    }

    return (
        <div 
            className="dashboard-container"
            style={{ paddingBottom: document.getElementById('footer')?.clientHeight || 50 }}
        >
            {Array.from(tickers).map((ticker) => {
                const height = tickerDimensions.get(ticker)?.height || 400;
                const widthChart = tickerDimensions.get(ticker)?.widthChart || 600;
                const widthNews = tickerDimensions.get(ticker)?.widthNews || 600;
                return (
                    <div 
                        key={ticker} 
                        className="ticker-container"
                        onMouseEnter={() => setHoveredTicker(ticker)} 
                        onMouseLeave={() => setHoveredTicker(null)}
                    >
                    <ResizableBox
                        width={widthChart}
                        height={height}
                        resizeHandles={["se"]}
                        minConstraints={[200, 200]}
                        onResizeStop={(e: any, data: any) => {
                            handleResize(ticker, data.size.height, data.size.width, document.getElementById(`news-${ticker}`)?.clientWidth || 600);
                            const chartContainer = document.getElementById(`chart-${ticker}`);
                            if (chartContainer) {
                                chartContainer.style.width = `${data.size.width}px`;
                                const chart = charts.get(ticker);
                                if (chart) {
                                    chart.reflow();
                                }
                            }
                        }}
                    >
                        <div className="chart-container">
                            <div id={`chart-${ticker}`} className="chart"></div>
                            {hoveredTicker === ticker && (
                                <button 
                                    onClick={() => handleClose(ticker)} 
                                    className="close-button"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </ResizableBox>
                    <ResizableBox
                        width={widthNews}
                        height={height}
                        resizeHandles={["se"]}
                        minConstraints={[200, 200]}
                        onResizeStop={(e: any, data: any) => {
                            handleResize(ticker, data.size.height, document.getElementById(`chart-${ticker}`)?.clientWidth || 600, data.size.width);
                            const newsContainer = document.getElementById(`news-${ticker}`);
                            if (newsContainer) {
                                newsContainer.style.width = `${data.size.width}px`;
                            }
                        }}
                    >
                        <div className="news-container" id={`news-${ticker}`}>
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
                    </ResizableBox>
                    </div>
                );
            })}
            <footer id="footer">
            <ResizableBox
                width={document.body.clientWidth}
                height={50}
                resizeHandles={["n"]}> 
                    <table id="watchlist-table">
                        <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Last</th>
                                <th>Change</th>
                                <th>Change %</th>
                                <th>Volume</th>
                                <th>Avg Volume</th>
                                <th>Market Cap</th>
                            </tr>
                        </thead>
                        <tbody id="watchlist-body">
                        </tbody>
                    </table>
            </ResizableBox>
            </footer>
        </div>
    );
};

export default Dashboard;