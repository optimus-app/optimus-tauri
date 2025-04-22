"use client";

import React, { useEffect, useState, useRef, memo } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import {
    AdvancedRealTimeChart,
    CopyrightStyles,
    TickerTape,
    TechnicalAnalysis,
} from "react-ts-tradingview-widgets";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Input } from "@/components/ui/input"; // Import shadcn Input
import { Button } from "@/components/ui/button"; // Import shadcn Button
import "./style.css";

const serverURL = "http://127.0.0.1:8000";

// Define copyright styles outside component to prevent recreation
const copyrightStyles: CopyrightStyles = {
    parent: {
        display: "none",
    },
};

// Constant ticker symbols for TickerTape
const TICKER_SYMBOLS = [
    { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
    { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
    { proName: "NASDAQ:AAPL", title: "Apple" },
    { proName: "NASDAQ:MSFT", title: "Microsoft" },
    { proName: "NASDAQ:NVDA", title: "NVIDIA" },
    { proName: "NASDAQ:TSLA", title: "Tesla" },
    { proName: "NYSE:JPM", title: "JPMorgan" },
    { proName: "NYSE:GS", title: "Goldman Sachs" },
    { proName: "NYSE:MS", title: "Morgan Stanley" },
    { proName: "NASDAQ:META", title: "Meta" },
    { proName: "NASDAQ:GOOGL", title: "Google" },
    { proName: "NASDAQ:AMZN", title: "Amazon" },
];

// Improved memoized TradingView chart component with ref to prevent re-renders
const MemoizedTradingViewChart = memo(
    ({ symbol }: { symbol: string }) => {
        const chartRef = useRef<HTMLDivElement>(null);
        const chartId = `tv-chart-${symbol}`;

        return (
            <div
                ref={chartRef}
                style={{ width: "100%", height: "100%" }}
                id={chartId}
            >
                <AdvancedRealTimeChart
                    theme="dark"
                    symbol={symbol}
                    autosize
                    interval="D"
                    timezone="Etc/UTC"
                    style="1"
                    copyrightStyles={copyrightStyles}
                    save_image={false}
                    hide_side_toolbar={false}
                    allow_symbol_change={true}
                    container_id={chartId}
                    disabled_features={[
                        "use_localstorage_for_settings",
                        "header_widget",
                        "header_symbol_search",
                        "header_resolutions",
                        "header_compare",
                        "header_undo_redo",
                        "header_screenshot",
                        "header_settings",
                        "header_fullscreen_button",
                    ]}
                />
            </div>
        );
    },
    (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);

// Memoized Technical Analysis component - now with overflow handling for larger scaling
const MemoizedTechnicalAnalysis = memo(
    ({ symbol }: { symbol: string }) => (
        <div
            style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                minWidth: "100%",
                minHeight: "100%",
                backgroundColor: "#131722", // TradingView dark theme background color
            }}
        >
            <TechnicalAnalysis
                colorTheme="dark"
                symbol={symbol}
                width="100%"
                height="100%"
                isTransparent={false} // Changed from true to false
            />
        </div>
    ),
    (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);

// News panel component to display stock news
const NewsPanel = ({
    ticker,
    newsData,
}: {
    ticker: string;
    newsData: any[];
}) => {
    return (
        <div className="news-container" id={`news-${ticker}`}>
            <h3 className="news-title">Latest {ticker} News</h3>
            {newsData?.slice(0, 5).map((news, index) => (
                <div key={news.id} className="news-item">
                    <h4>
                        {index + 1}. {news.title}
                    </h4>
                    <p>{news.description}</p>
                    <p>
                        <strong>Sentiment:</strong>{" "}
                        {news.insights[0]?.sentiment || "N/A"}
                    </p>
                    <p>
                        <strong>Reasoning:</strong>{" "}
                        {news.insights[0]?.sentiment_reasoning || "N/A"}
                    </p>
                </div>
            ))}
        </div>
    );
};

// Combined chart and news container with shadcn/ui resizable components
const ChartWithNewsContainer = memo(
    ({
        ticker,
        onClose,
        containerHeight,
        newsData,
    }: {
        ticker: string;
        onClose: (ticker: string) => void;
        containerHeight: number;
        newsData: any[];
    }) => {
        const [isHovered, setIsHovered] = useState(false);
        const [layout, setLayout] = useState([60, 40]); // Increased main chart size even more
        const [verticalLayout, setVerticalLayout] = useState([40, 60]); // Default vertical split

        // Handle layout changes
        const handleLayoutChange = (sizes: number[]) => {
            setLayout(sizes);
        };

        const handleVerticalLayoutChange = (sizes: number[]) => {
            setVerticalLayout(sizes);
        };

        return (
            <div
                className="ticker-container-wrapper mb-6" // Increased margin for better spacing
                key={ticker}
                style={{ width: "100%", height: `${containerHeight}px` }}
            >
                <ResizablePanelGroup
                    direction="horizontal"
                    className="rounded-lg border border-gray-700 bg-black"
                    onLayout={handleLayoutChange}
                >
                    {/* Main Chart Panel */}
                    <ResizablePanel defaultSize={60} minSize={50}>
                        <div
                            className="relative h-full"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <MemoizedTradingViewChart symbol={ticker} />
                            {isHovered && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose(ticker);
                                    }}
                                    className="close-button"
                                    style={{
                                        position: "absolute",
                                        top: "5px",
                                        right: "5px",
                                        zIndex: 999,
                                        background: "rgba(0,0,0,0.6)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "3px",
                                        padding: "2px 8px",
                                        cursor: "pointer",
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right side panel with Technical Analysis and News */}
                    <ResizablePanel defaultSize={40} minSize={30}>
                        <ResizablePanelGroup
                            direction="vertical"
                            onLayout={handleVerticalLayoutChange}
                        >
                            {/* Technical Analysis Panel */}
                            <ResizablePanel defaultSize={60} minSize={20}>
                                <div className="h-full p-1 overflow-hidden">
                                    <MemoizedTechnicalAnalysis
                                        symbol={ticker}
                                    />
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            {/* News Panel */}
                            <ResizablePanel defaultSize={50} minSize={20}>
                                <div className="h-full overflow-auto p-2">
                                    <NewsPanel
                                        ticker={ticker}
                                        newsData={newsData}
                                    />
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        );
    }
);

// Main Dashboard Component
const Dashboard: React.FC = () => {
    const [tickers, setTickers] = useState<Set<string>>(new Set());
    const [newsData, setNewsData] = useState<Map<string, any[]>>(new Map());
    const [containerHeights, setContainerHeights] = useState<
        Map<string, number>
    >(new Map());
    const dashboardRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial setup - listen for external commands and fetch watchlist
    useEffect(() => {
        const setupListener = async () => {
            await emitTo("main", "window_created", "from dashboard");
            const unlisten = await listen<any>("targetfield", (event) => {
                const ticker: string = event.payload.args.toUpperCase();
                if (ticker && !tickers.has(ticker)) {
                    setTickers((prev) => new Set(prev).add(ticker));
                    fetchNewsData(ticker);
                }
            });

            return () => {
                unlisten();
            };
        };

        setupListener();
    }, []);

    // Set initial heights for new tickers - INCREASED to 700px
    useEffect(() => {
        Array.from(tickers).forEach((ticker) => {
            if (!containerHeights.has(ticker)) {
                setContainerHeights((prev) => new Map(prev).set(ticker, 700));
            }
        });
    }, [tickers]);

    // Fetch news data for a ticker
    const fetchNewsData = async (ticker: string) => {
        try {
            const response = await fetch(`${serverURL}/stock-news-polygon`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    symbol: ticker,
                    order: "desc",
                    limit: "5",
                }),
            });

            if (response.ok) {
                const news = await response.json();
                setNewsData((prev) => new Map(prev).set(ticker, news.results));
            } else {
                console.error("Failed to fetch news data");
                // Still add empty news array to avoid errors
                setNewsData((prev) => new Map(prev).set(ticker, []));
            }
        } catch (error) {
            console.error("Error fetching news data:", error);
            // Still add empty news array in case of errors
            setNewsData((prev) => new Map(prev).set(ticker, []));
        }
    };

    // Handle closing a chart
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

        setContainerHeights((prev) => {
            const newHeights = new Map(prev);
            newHeights.delete(ticker);
            return newHeights;
        });
    };

    // Handle resizing container height
    const handleHeightChange = (ticker: string, height: number) => {
        setContainerHeights((prev) => new Map(prev).set(ticker, height));
    };

    // Add a new ticker to the dashboard
    const addTicker = (ticker: string) => {
        if (!ticker || tickers.has(ticker)) return;

        setTickers((prev) => new Set(prev).add(ticker.toUpperCase()));
        fetchNewsData(ticker.toUpperCase());
    };

    return (
        <div
            className="dashboard-container"
            ref={dashboardRef}
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                overflow: "hidden",
                padding: "0", // Removed padding here
                margin: "0", // Added margin: 0
                boxSizing: "border-box",
                width: "100%",
            }}
        >
            {/* Search bar for adding new tickers - moved to top with no margin */}
            <div
                className="dashboard-header"
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "8px 20px",
                    backgroundColor: "#1a1a1a",
                    borderBottom: "1px solid #333",
                    width: "100%",
                }}
            >
                <div className="flex w-full max-w-md items-center space-x-2">
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Add ticker (e.g., AAPL)"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                addTicker(e.currentTarget.value);
                                e.currentTarget.value = "";
                            }
                        }}
                        className="flex-1"
                    />
                    <Button
                        onClick={() => {
                            if (inputRef.current) {
                                addTicker(inputRef.current.value);
                                inputRef.current.value = "";
                            }
                        }}
                    >
                        Add
                    </Button>
                </div>
            </div>

            {/* Main content area with charts and news - make it take remaining space */}
            <div
                className="dashboard-content"
                style={{
                    width: "100%",
                    overflowY: "auto",
                    flex: 1,
                    padding: "0 20px", // Moved padding here from container
                }}
            >
                {Array.from(tickers).map((ticker) => {
                    const containerHeight = containerHeights.get(ticker) || 700;

                    return (
                        <ChartWithNewsContainer
                            key={ticker}
                            ticker={ticker}
                            onClose={handleClose}
                            containerHeight={containerHeight}
                            newsData={newsData.get(ticker) || []}
                        />
                    );
                })}
            </div>

            {/* Fixed ticker tape at the bottom */}
            <div className="ticker-tape-container">
                <TickerTape
                    colorTheme="dark"
                    symbols={TICKER_SYMBOLS}
                    showSymbolLogo={true}
                    copyrightStyles={copyrightStyles}
                />
            </div>
        </div>
    );
};

export default Dashboard;
