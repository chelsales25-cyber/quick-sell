'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, Package } from "lucide-react";
import { useGetTransactionsQuery } from "@/lib/features/transactions/transactions-api";
import { Skeleton } from "../ui/skeleton";

export function SalesSummary() {
    const { data: transactions, isLoading } = useGetTransactionsQuery();

    const stats = React.useMemo(() => {
        if (!transactions) {
            return {
                totalRevenue: 0,
                totalSales: 0,
                uniqueCustomers: 0,
            };
        }

        const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0);
        const totalSales = transactions.length;
        const uniqueCustomers = new Set(transactions.map(t => t.customerName)).size;

        return {
            totalRevenue,
            totalSales,
            uniqueCustomers,
        }
    }, [transactions]);


    if (isLoading) {
        return (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24"/>
                            <Skeleton className="h-4 w-4"/>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-7 w-36 mb-1"/>
                            <Skeleton className="h-3 w-48"/>
                        </CardContent>
                    </Card>
                ))}
             </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">รายรับรวม</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">฿{stats.totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground">
                        จากยอดขายทั้งหมด
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">ยอดขาย</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalSales.toLocaleString('th-TH')}</div>
                    <p className="text-xs text-muted-foreground">
                        จำนวนใบเสร็จทั้งหมด
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
