import React from "react";
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
    onCancelOrder: (orderId: string) => void;
}

export function OrderHistoryTable({
    orders,
    onCancelOrder,
}: OrderHistoryTableProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "FILLED":
            case "SUBMITTED":
                return <Badge className="bg-green-500">Active</Badge>;
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

    return (
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
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                No orders found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        orders.map((order) => (
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
                                <TableCell>${order.price.toFixed(2)}</TableCell>
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
                                <TableCell>
                                    {order.order_status !== "CANCELLED_ALL" &&
                                        order.order_status !== "FILLED" && (
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
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
