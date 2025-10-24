'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useGetTransactionDetailsQuery,
  useUpdateTransactionStatusMutation,
  useSyncTransactionsMutation,
} from '@/lib/features/transactions/transactions-api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  UserCircle,
  Phone,
  Home,
  Banknote,
  Calendar,
  Tag,
  Warehouse as WarehouseIcon,
  FileWarning,
  Edit,
  Loader2,
  Gift,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { formatBaht } from '@/lib/utils';
import type { TransactionDetailItem } from '@/lib/types';
import React from 'react';
import { cn } from '@/lib/utils';

const renderDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, 'd MMM yyyy', { locale: th });
};

const TransactionItemRow = ({
  item,
  isSubItem = false,
}: {
  item: TransactionDetailItem;
  isSubItem?: boolean;
}) => {
  const subtotal = item.price * item.quantity - item.discount;
  return (
    <TableRow className={cn(isSubItem && 'bg-muted/50')}>
      <TableCell className={cn(isSubItem && 'pl-8')}>
        <div className='flex items-center gap-2'>
          {isSubItem && <Gift className='h-4 w-4 text-muted-foreground' />}
          <div className='flex flex-col'>
            <p className='font-medium'>
              {item.name} {isSubItem && '(ของแถม)'}
            </p>
            <p className='text-xs text-muted-foreground'>รหัส: {item.id}</p>
            <p className='text-xs text-muted-foreground'>
              @{item.price.toFixed(2)}
              {item.discount > 0 && (
                <span className='text-red-500'>
                  {' '}
                  -{item.discount.toFixed(2)}
                </span>
              )}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className='text-center'>{item.quantity}</TableCell>
      <TableCell className='text-right font-medium'>
        {formatBaht(subtotal)}
      </TableCell>
    </TableRow>
  );
};

export default function TransactionDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const id = typeof params.id === 'string' ? params.id : '';

  const [cancellationNote, setCancellationNote] = useState('');

  const {
    data: transaction,
    isLoading,
    isError,
    refetch: refetchDetails,
  } = useGetTransactionDetailsQuery(id, {
    skip: !id, // Skip query if id is not available
  });

  const [updateStatus, { isLoading: isUpdatingStatus }] =
    useUpdateTransactionStatusMutation();
  const [syncTransactions] = useSyncTransactionsMutation();

  const handleCancelTransaction = async () => {
    if (!transaction) return;

    try {
      await updateStatus({
        orderNo: transaction.id,
        status: 'ยกเลิก',
        note: cancellationNote,
      }).unwrap();

      // Also trigger a general sync to update the local DB
      if (transaction.sellerId) {
        await syncTransactions({ sellerId: transaction.sellerId }).unwrap();
      } else {
        await syncTransactions().unwrap();
      }

      await refetchDetails(); // Refetch the details for this page

      toast({
        title: 'อัปเดตสำเร็จ',
        description: 'สถานะคำสั่งซื้อถูกเปลี่ยนเป็น "ยกเลิก"',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตสถานะคำสั่งซื้อได้',
      });
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Card>
          <CardContent className='p-4'>
            <Skeleton className='h-8 w-24 mb-4' />
          </CardContent>
        </Card>
        <div className='grid gap-4 md:grid-cols-2'>
          <Card>
            <CardContent className='p-4 space-y-3'>
              <Skeleton className='h-5 w-1/3' />
              <Skeleton className='h-4 w-2/3' />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4 space-y-3'>
              <Skeleton className='h-5 w-1/3' />
              <Skeleton className='h-4 w-2/3' />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-1/4' />
          </CardHeader>
          <CardContent className='space-y-4'>
            <Skeleton className='h-5 w-full' />
            <Skeleton className='h-5 w-full' />
            <Skeleton className='h-5 w-full' />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-1/4' />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Skeleton className='h-5 w-1/2' />
                  </TableHead>
                  <TableHead className='text-center'>
                    <Skeleton className='h-5 w-1/4 mx-auto' />
                  </TableHead>
                  <TableHead className='text-right'>
                    <Skeleton className='h-5 w-1/4 ml-auto' />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !transaction) {
    return (
      <div className='flex flex-col items-center justify-center text-center py-10'>
        <Alert variant='destructive' className='max-w-md'>
          <AlertTitle>{isError ? 'เกิดข้อผิดพลาด' : 'ไม่พบข้อมูล'}</AlertTitle>
          <AlertDescription>
            {isError
              ? 'ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้'
              : 'เราไม่พบข้อมูลสำหรับคำสั่งซื้อนี้'}
          </AlertDescription>
        </Alert>
        <Button asChild variant='outline' className='mt-4'>
          <Link href='/dashboard'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            กลับไปหน้าแดชบอร์ด
          </Link>
        </Button>
      </div>
    );
  }

  const isCancelled = transaction.status === 'ยกเลิก';

  return (
    <div className='space-y-4 pb-4'>
      <Card>
        <CardContent className='p-4 pb-0'>
          <Button variant='ghost' size='sm' asChild className='-ml-4'>
            <Link href='/dashboard'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              กลับ
            </Link>
          </Button>
        </CardContent>
        <CardHeader>
          <div className='flex justify-between items-start'>
            <div>
              <CardTitle>รายละเอียดคำสั่งซื้อ</CardTitle>
              <CardDescription>Order No: {transaction.id}</CardDescription>
            </div>
            {isCancelled && (
              <Badge variant='destructive' className='text-sm'>
                ยกเลิกแล้ว
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2'>
          <div className='flex items-center gap-3'>
            <Calendar className='h-5 w-5 text-muted-foreground' />
            <div className='text-sm'>
              <p className='text-muted-foreground'>วันที่</p>
              <p className='font-medium'>{renderDate(transaction.date)}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Banknote className='h-5 w-5 text-muted-foreground' />
            <div className='text-sm'>
              <p className='text-muted-foreground'>การชำระเงิน</p>
              <p className='font-medium'>{transaction.paymentMethod}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Tag className='h-5 w-5 text-muted-foreground' />
            <div className='text-sm'>
              <p className='text-muted-foreground'>ผู้ขาย</p>
              <p className='font-medium'>{transaction.sellerId}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <WarehouseIcon className='h-5 w-5 text-muted-foreground' />
            <div className='text-sm'>
              <p className='text-muted-foreground'>คลัง</p>
              <p className='font-medium'>{transaction.warehouseId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base flex items-center'>
              <UserCircle className='mr-2' />
              ข้อมูลลูกค้า
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <p className='font-semibold'>{transaction.customer.name}</p>
            {transaction.customer.phone && (
              <p className='text-muted-foreground flex items-center gap-2'>
                <Phone className='h-4 w-4' /> {transaction.customer.phone}
              </p>
            )}
            {transaction.customer.address && (
              <p className='text-muted-foreground flex items-start gap-2'>
                <Home className='h-4 w-4 mt-1' /> {transaction.customer.address}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สินค้า</TableHead>
                <TableHead className='text-center'>จำนวน</TableHead>
                <TableHead className='text-right'>ราคารวม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items.map((item) => (
                <React.Fragment key={item.id}>
                  <TransactionItemRow item={item} />
                  {(item.subItems || []).map((subItem, index) => (
                    <TransactionItemRow
                      key={`sub-${subItem.id}-${index}`}
                      item={subItem}
                      isSubItem={true}
                    />
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className='text-right font-bold text-lg'>
                  ยอดรวมสุทธิ
                </TableCell>
                <TableCell className='text-right font-bold text-lg'>
                  {formatBaht(transaction.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {isCancelled && transaction.cancellationNote && (
        <Card className='border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'>
          <CardHeader>
            <CardTitle className='text-base flex items-center text-yellow-700 dark:text-yellow-400'>
              <FileWarning className='mr-2' />
              หมายเหตุการยกเลิก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-yellow-800 dark:text-yellow-300'>
              {transaction.cancellationNote}
            </p>
          </CardContent>
        </Card>
      )}
      {/* 
      {!isCancelled && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>จัดการคำสั่งซื้อ</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant='destructive' className='w-full'>
                  <Edit className='mr-2 h-4 w-4' />
                  ยกเลิก / คืนสินค้า
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    ยืนยันการยกเลิกคำสั่งซื้อ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    การกระทำนี้จะเปลี่ยนสถานะคำสั่งซื้อเป็น "ยกเลิก"
                    และไม่สามารถย้อนกลับได้
                    กรุณาระบุเหตุผลสำหรับการยกเลิกด้านล่าง (ถ้ามี)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className='py-4'>
                  <Label htmlFor='cancellation-note'>เหตุผล/หมายเหตุ</Label>
                  <Textarea
                    id='cancellation-note'
                    placeholder='เช่น สินค้าชำรุด, ลูกค้าเปลี่ยนใจ...'
                    value={cancellationNote}
                    onChange={(e) => setCancellationNote(e.target.value)}
                    className='mt-2'
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isUpdatingStatus}>
                    ย้อนกลับ
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelTransaction}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    ยืนยันการยกเลิก
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )} */}
    </div>
  );
}
