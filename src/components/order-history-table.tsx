import React from "react";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Order {
    id: string;
    action: "Buy" | "Sell";
    type: "Market" | "Limit" | "Stop";
    details: string;
    quantity: number;
    fillPrice: number | null;
    status: "Pending" | "Filled" | "Cancelled";
    timestamp: Date;
}

interface OrderHistoryTableProps {
    orders: Order[];
    onCancelOrder: (orderId: string) => void;
}

export function OrderHistoryTable({
    orders,
    onCancelOrder,
}: OrderHistoryTableProps) {
    return (
        <Table>
            <TableCaption>Your order history</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Fill Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.length === 0 ? (
                    <TableRow>
                        <TableCell
                            colSpan={8}
                            className="text-center text-muted-foreground"
                        >
                            No orders placed yet
                        </TableCell>
                    </TableRow>
                ) : (
                    orders.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                                {order.timestamp.toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={
                                        order.action === "Buy"
                                            ? "default"
                                            : "destructive"
                                    }
                                >
                                    {order.action}
                                </Badge>
                            </TableCell>
                            <TableCell>{order.type}</TableCell>
                            <TableCell>{order.details}</TableCell>
                            <TableCell className="text-right">
                                {order.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                                {order.fillPrice
                                    ? `$${order.fillPrice.toFixed(2)}`
                                    : "-"}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={
                                        order.status === "Filled"
                                            ? "success"
                                            : order.status === "Cancelled"
                                            ? "outline"
                                            : "secondary"
                                    }
                                >
                                    {order.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {order.status === "Pending" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onCancelOrder(order.id)}
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
    );
}
