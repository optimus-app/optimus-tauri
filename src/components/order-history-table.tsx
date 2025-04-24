import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";

interface Order {
    order_id: string;
    code: string;
    stock_name?: string;
    trd_side: "BUY" | "SELL";
    order_type?: string;
    order_status: string;
    qty: number;
    price: number;
    create_time?: string;
    updated_time?: string;
    dealt_qty?: number;
    dealt_avg_price?: number;
    currency?: string;
    timestamp?: Date;
}

interface OrderHistoryTableProps {
    orders: Order[];
    onCancelOrder?: (orderId: string) => void;
}

export function OrderHistoryTable({
    orders,
    onCancelOrder,
}: OrderHistoryTableProps) {
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Calculate pagination values
    const totalItems = orders.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const currentOrders = orders.slice(startIndex, endIndex);

    // Get status badge based on order status
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "FILLED_ALL":
                return <Badge className="bg-green-500">Filled</Badge>;
            case "SUBMITTED":
                return <Badge className="bg-blue-500">Active</Badge>;
            case "SUBMITTING":
                return <Badge className="bg-blue-500">Submitting</Badge>;
            case "CANCELLED_ALL":
            case "CANCELLED_PART":
                return <Badge className="bg-amber-500">Cancelled</Badge>;
            case "FAILED":
                return <Badge className="bg-red-500">Failed</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    // Define terminal statuses
    const isTerminalStatus = (status: string) =>
        ["FILLED_ALL", "CANCELLED_ALL", "FAILED"].includes(status);

    // Page change handlers
    const goToPage = (page: number) => {
        setCurrentPage(Math.min(Math.max(1, page), totalPages));
    };

    const goToFirstPage = () => goToPage(1);
    const goToPreviousPage = () => goToPage(currentPage - 1);
    const goToNextPage = () => goToPage(currentPage + 1);
    const goToLastPage = () => goToPage(totalPages);

    // Handle page size change
    const handlePageSizeChange = (value: string) => {
        const newPageSize = parseInt(value, 10);
        setPageSize(newPageSize);

        // Reset to first page when changing page size to avoid empty pages
        const newTotalPages = Math.ceil(totalItems / newPageSize);
        if (currentPage > newTotalPages) {
            setCurrentPage(1);
        }
    };

    // Get page numbers to show (always show current, first, last, and 1-2 adjacent pages)
    const getPageNumbers = () => {
        const pageNumbers = [];

        // Always include first page
        pageNumbers.push(1);

        // Add ellipsis if needed
        if (currentPage > 3) {
            pageNumbers.push("ellipsis-start");
        }

        // Add adjacent pages
        for (
            let i = Math.max(2, currentPage - 1);
            i <= Math.min(totalPages - 1, currentPage + 1);
            i++
        ) {
            if (i !== 1 && i !== totalPages) {
                pageNumbers.push(i);
            }
        }

        // Add ellipsis if needed
        if (currentPage < totalPages - 2) {
            pageNumbers.push("ellipsis-end");
        }

        // Always include last page if there's more than one page
        if (totalPages > 1) {
            pageNumbers.push(totalPages);
        }

        return pageNumbers;
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Stock</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            {onCancelOrder && <TableHead>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={onCancelOrder ? 8 : 7}
                                    className="h-24 text-center"
                                >
                                    No orders found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentOrders.map((order) => (
                                <TableRow key={order.order_id}>
                                    <TableCell>
                                        {order.stock_name || order.code}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={
                                                order.trd_side === "BUY"
                                                    ? "text-green-500"
                                                    : "text-red-500"
                                            }
                                        >
                                            {order.trd_side}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {order.order_type || "Limit"}
                                    </TableCell>
                                    <TableCell>{order.qty}</TableCell>
                                    <TableCell>
                                        ${order.price.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(order.order_status)}
                                    </TableCell>
                                    <TableCell>
                                        {order.create_time ||
                                            (order.timestamp &&
                                                new Date(
                                                    order.timestamp
                                                ).toLocaleString())}
                                    </TableCell>
                                    {onCancelOrder && (
                                        <TableCell>
                                            {!isTerminalStatus(
                                                order.order_status
                                            ) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        onCancelOrder(
                                                            order.order_id
                                                        )
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination controls - only show if we have orders */}
            {orders.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}-{endIndex} of {totalItems}{" "}
                        orders
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Page size selector */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                                Rows per page
                            </span>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={handlePageSizeChange}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue
                                        placeholder={pageSize.toString()}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pagination buttons */}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={goToFirstPage}
                                disabled={currentPage === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            {/* Page numbers */}
                            <div className="flex items-center">
                                {getPageNumbers().map((pageNumber, index) => {
                                    if (
                                        pageNumber === "ellipsis-start" ||
                                        pageNumber === "ellipsis-end"
                                    ) {
                                        return (
                                            <span
                                                key={pageNumber}
                                                className="px-2"
                                            >
                                                ...
                                            </span>
                                        );
                                    }

                                    const page = pageNumber as number;
                                    return (
                                        <Button
                                            key={page}
                                            variant={
                                                page === currentPage
                                                    ? "default"
                                                    : "outline"
                                            }
                                            size="icon"
                                            className="h-8 w-8 mx-0.5"
                                            onClick={() => goToPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={goToLastPage}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
