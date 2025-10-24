'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  useGetTransactionsQuery,
  useSyncTransactionsMutation,
} from '@/lib/features/transactions/transactions-api';
import { Button } from '../ui/button';
import { RefreshCw, AlertCircle, Search, ChevronRight } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn, formatBaht } from '@/lib/utils';
import { Input } from '../ui/input';
import { SmartPagination } from '../ui/SmartPagination';

const LAST_SYNCED_KEY = 'transactions_last_synced';
const SELLER_STORAGE_KEY = 'selectedSeller';

/**
 * Parses a date string which could be in ISO format.
 * The flow should already convert it to ISO.
 * @param dateString The date string from the data.
 * @returns A Date object or null if the format is invalid.
 */
const parseDate = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;

  const date = parseISO(dateString);
  if (isValid(date)) return date;

  return null;
};

export function RecentTransactions() {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { toast } = useToast();

  useEffect(() => {
    const savedTime = localStorage.getItem(LAST_SYNCED_KEY);
    if (savedTime) {
      setLastSynced(savedTime);
    }
  }, []);

  const { data: transactions, isLoading, isError } = useGetTransactionsQuery();
  const [
    syncTransactions,
    { isLoading: isSyncing, isSuccess: isSyncSuccess, isError: isSyncError },
  ] = useSyncTransactionsMutation();

  useEffect(() => {
    if (isSyncSuccess) {
      const newTime = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, newTime);
      setLastSynced(newTime);
      toast({
        title: 'ซิงค์ยอดขายสำเร็จ',
        description: 'ข้อมูลยอดขายล่าสุดเป็นปัจจุบันแล้ว',
      });
    }
    if (isSyncError) {
      toast({
        variant: 'destructive',
        title: 'ซิงค์ยอดขายไม่สำเร็จ',
        description: 'กรุณาตรวจสอบการเชื่อมต่อและลองอีกครั้ง',
      });
    }
  }, [isSyncSuccess, isSyncError, toast]);

  const handleManualSync = async () => {
    const sellerId = localStorage.getItem(SELLER_STORAGE_KEY);
    if (!sellerId) {
      toast({
        variant: 'destructive',
        title: 'ไม่พบผู้ขาย',
        description: 'กรุณาเลือกผู้ขายในหน้าขายก่อนซิงค์ข้อมูล',
      });
      return;
    }
    await syncTransactions({ sellerId });
  };

  const renderLastSynced = () => {
    if (!lastSynced) {
      return 'ยังไม่เคยซิงค์';
    }
    return `ซิงค์ล่าสุดเมื่อ ${formatDistanceToNow(new Date(lastSynced), {
      addSuffix: true,
      locale: th,
      includeSeconds: true,
    })}`;
  };

  const renderTransactionDate = (dateString: string) => {
    const date = parseDate(dateString);
    if (!date) {
      return (
        <span className='text-destructive'>
          {dateString || 'เวลาไม่ถูกต้อง'}
        </span>
      );
    }
    // Display only the date, without time. Format: 'd MMM yyyy'
    return format(date, 'd MMM yyyy', { locale: th });
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    // First, filter by search term
    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = transactions.filter((transaction) =>
      transaction.id.toLowerCase().includes(lowercasedTerm)
    );

    // Then, sort by date descending
    return filtered.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (dateB && dateA) {
        return dateB.getTime() - dateA.getTime();
      }
      return b.id.localeCompare(a.id, undefined, { numeric: true });
    });
  }, [transactions, searchTerm]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className='space-y-3'>
          {[...Array(itemsPerPage)].map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between rounded-lg bg-muted/50 p-3'
            >
              <div className='flex flex-col space-y-2'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-40' />
              </div>
              <Skeleton className='h-6 w-24 rounded-full' />
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className='p-2 text-center text-destructive'>
          <AlertCircle className='mx-auto mb-2 h-8 w-8' />
          <p>ไม่สามารถโหลดข้อมูลได้</p>
          <p className='text-sm'>โปรดลองซิงค์ข้อมูลอีกครั้ง</p>
        </div>
      );
    }

    if (transactions?.length === 0) {
      return (
        <div className='p-2 text-center text-muted-foreground'>
          <p>ไม่พบข้อมูลยอดขายล่าสุดสำหรับผู้ขายนี้</p>
          <p className='text-sm'>ลองกดซิงค์เพื่อดึงข้อมูล</p>
        </div>
      );
    }

    if (paginatedTransactions.length === 0 && searchTerm) {
      return (
        <div className='p-2 text-center text-muted-foreground'>
          <p>ไม่พบ Order No. ที่ค้นหา</p>
          <p className='text-sm'>ลองตรวจสอบหมายเลขอีกครั้ง</p>
        </div>
      );
    }

    return (
      <div className='space-y-3'>
        {paginatedTransactions.map((transaction) => {
          const isCancelled = transaction.status === 'ยกเลิก';
          return (
            <Link
              href={`/dashboard/transactions/${transaction.id}`}
              key={transaction.id}
              className='block'
            >
              <div
                className={cn(
                  'flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors',
                  isCancelled ? 'bg-gray-100 dark:bg-gray-800' : 'bg-muted/50'
                )}
              >
                <div className='flex flex-col'>
                  <p className='font-semibold'>{transaction.customerName}</p>
                  <p className='text-xs text-gray-500'>
                    Order No: {transaction.id}
                  </p>
                  <div className='text-sm text-muted-foreground mt-1 flex items-center gap-2'>
                    <span>{transaction.itemsCount} รายการ</span>•
                    <span>{renderTransactionDate(transaction.date)}</span>
                    {isCancelled && <Badge variant='destructive'>ยกเลิก</Badge>}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge
                    variant={isCancelled ? 'secondary' : 'outline'}
                    className={cn(
                      isCancelled
                        ? 'line-through'
                        : 'border-green-500 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                    )}
                  >
                    {formatBaht(transaction.total)}
                  </Badge>
                  <ChevronRight className='h-5 w-5 text-muted-foreground' />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between gap-2'>
            <div>
              <CardTitle>ยอดขายล่าสุด</CardTitle>
              <CardDescription className='text-xs text-muted-foreground mt-1'>
                {renderLastSynced()}
              </CardDescription>
            </div>
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              size='sm'
              variant='outline'
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')}
              />
              {isSyncing ? '...' : 'ซิงค์'}
            </Button>
          </div>
          <div className='relative pt-2'>
            <Search className='absolute left-2.5 top-6 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              placeholder='ค้นหาด้วย Order No...'
              className='w-full rounded-lg bg-background pl-8'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
      <Card className='mt-2'>
        <CardContent className='p-2 flex items-center justify-between'>
          <SmartPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            itemsPerPageOptions={[5, 10, 20, 50]}
          />
        </CardContent>
      </Card>
    </>
  );
}
