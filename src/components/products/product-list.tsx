'use client';

import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Search, PackageSearch, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  useGetProductsQuery,
  useSyncProductsMutation,
} from '@/lib/features/products/products-api';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { SmartPagination } from '../ui/SmartPagination';
import { formatBaht } from '@/lib/utils';

const LAST_SYNCED_KEY = 'products_last_synced';

export function ProductList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Read last synced time from localStorage on component mount
    const savedTime = localStorage.getItem(LAST_SYNCED_KEY);
    setLastSynced(savedTime);
  }, []);

  // Hook for getting products from IndexedDB
  const { data: products, isLoading, isError } = useGetProductsQuery();

  // Hook for triggering manual sync
  const [
    syncProducts,
    { isLoading: isSyncing, isSuccess: isSyncSuccess, isError: isSyncError },
  ] = useSyncProductsMutation();

  useEffect(() => {
    if (isSyncSuccess) {
      const newTime = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, newTime); // Also save to localStorage
      setLastSynced(newTime); // Update state to re-render time
      toast({
        title: 'ซิงค์ข้อมูลสำเร็จ',
        description: 'รายการสินค้าอัปเดตเป็นล่าสุดแล้ว',
      });
    }
    if (isSyncError) {
      toast({
        variant: 'destructive',
        title: 'ซิงค์ข้อมูลไม่สำเร็จ',
        description: 'กรุณาตรวจสอบการเชื่อมต่อและลองอีกครั้ง',
      });
    }
  }, [isSyncSuccess, isSyncError, toast]);

  const handleManualSync = async () => {
    await syncProducts();
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowercasedTerm) ||
        product.code.toLowerCase().includes(lowercasedTerm)
    );
  }, [products, searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
  };

  const renderLastSynced = () => {
    if (!lastSynced) {
      return 'ยังไม่เคยซิงค์ข้อมูล';
    }
    return `ซิงค์ล่าสุดเมื่อ ${formatDistanceToNow(new Date(lastSynced), {
      addSuffix: true,
      locale: th,
    })}`;
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardContent className='p-4 space-y-4'>
          <div className='relative'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              placeholder='ค้นหาสินค้าด้วยชื่อ หรือ รหัส...'
              className='w-full rounded-lg bg-background pl-8'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on new search
              }}
            />
          </div>
          <div className='flex items-center justify-between'>
            <p className='text-xs text-muted-foreground'>
              {renderLastSynced()}
            </p>
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              size='sm'
              variant='outline'
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
              {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='p-4 space-y-4'>
          {isLoading && (
            <div className='space-y-3'>
              {[...Array(itemsPerPage)].map((_, i) => (
                <div key={i} className='p-3 border rounded-md'>
                  <div className='flex items-center gap-4'>
                    <Skeleton className='h-12 w-12' />
                    <div className='flex-1 space-y-2'>
                      <Skeleton className='h-4 w-3/4' />
                      <Skeleton className='h-4 w-1/2' />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && paginatedProducts.length > 0 ? (
            <div className='space-y-3'>
              {paginatedProducts.map((product) => (
                <Link
                  href={`/dashboard/products/${product.code}`}
                  key={product.code}
                  className='block'
                >
                  <div className='p-3 border rounded-md hover:bg-muted/50 transition-colors'>
                    <div className='flex items-center gap-4'>
                      <div className='flex-shrink-0 rounded-md border bg-white p-1 h-12 w-12'>
                        <QRCode
                          value={product.code}
                          size={40}
                          style={{
                            height: 'auto',
                            maxWidth: '100%',
                            width: '100%',
                          }}
                          viewBox={`0 0 40 40`}
                          level='L'
                        />
                      </div>
                      <div className='flex-1'>
                        <p className='font-semibold'>{product.name}</p>
                        <p className='text-sm text-muted-foreground'>
                          รหัส: {product.code}
                        </p>
                        <div className='mt-2 flex flex-wrap items-center gap-2'>
                          <Badge variant='secondary'>{product.category}</Badge>
                          {product.brand && (
                            <Badge variant='outline'>{product.brand}</Badge>
                          )}
                          <Badge
                            variant='outline'
                            className='border-green-500 text-green-600'
                          >
                            {formatBaht(product.price)}                            
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className='h-5 w-5 text-muted-foreground' />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}

          {!isLoading && (isError || paginatedProducts.length === 0) && (
            <div className='text-center py-10'>
              <PackageSearch className='mx-auto h-12 w-12 text-muted-foreground' />
              <p className='mt-4 text-muted-foreground'>
                {isError
                  ? 'ไม่สามารถโหลดข้อมูลจากฐานข้อมูลในเครื่องได้'
                  : 'ไม่พบสินค้า'}
              </p>
              {products?.length === 0 && !isError && (
                <p className='text-sm text-muted-foreground'>
                  ลองกด "ซิงค์ข้อมูล" เพื่อดึงข้อมูลล่าสุด
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className='p-4 flex items-center justify-between'>
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
    </div>
  );
}
