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
import { Loader2 } from "lucide-react";

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

interface ActiveOrdersTableProps {
    orders: Order[];
    onCancelOrder: (orderId: string) => void;
}

export function ActiveOrdersTable({
    orders,
    onCancelOrder,
}: ActiveOrdersTableProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SUBMITTED":
                return <Badge className="bg-green-500">Active</Badge>;
            case "SUBMITTING":
                return (
                    <Badge className="bg-blue-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Submitting
                    </Badge>
                );
            case "FILLED_PART":
                return (
                    <Badge className="bg-indigo-500">Partially Filled</Badge>
                );
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
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No active orders. Place a trade to get started.
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
                                    {order.dealt_qty ? (
                                        <span>
                                            {order.dealt_qty} / {order.qty}
                                        </span>
                                    ) : (
                                        order.qty
                                    )}
                                </TableCell>
                                <TableCell>${order.price.toFixed(2)}</TableCell>
                                <TableCell>
                                    {getStatusBadge(order.order_status)}
                                </TableCell>
                                <TableCell>
                                    {order.create_time
                                        ? new Date(
                                              order.create_time
                                          ).toLocaleTimeString()
                                        : order.timestamp
                                        ? new Date(
                                              order.timestamp
                                          ).toLocaleTimeString()
                                        : "Just now"}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            onCancelOrder(order.order_id)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
