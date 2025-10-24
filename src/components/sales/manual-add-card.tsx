'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search } from 'lucide-react';
import { useSale } from './sale-provider';
import { useToast } from '@/hooks/use-toast';
import { useGetProductsQuery } from '@/lib/features/products/products-api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Product } from '@/lib/types';

export function ManualAddCard() {
  const { addProductToSale } = useSale();
  const { data: products, isLoading } = useGetProductsQuery();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products || !searchTerm) {
      return [];
    }
    return products
      .filter((p) => p.code.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5); // Limit to 5 suggestions
  }, [products, searchTerm]);

  const handleAddProduct = (productId: string) => {
    const product = products?.find((p) => p.code === productId);
    if (product) {
      addProductToSale(product.code);
      setSearchTerm(''); // Clear input after adding
      setIsPopoverOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'ไม่พบสินค้า',
        description: `ไม่พบสินค้าสำหรับรหัส: ${productId}`,
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    handleAddProduct(searchTerm);
  };

  const handleSuggestionClick = (product: Product) => {
    setSearchTerm(product.code);
    handleAddProduct(product.code);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>เพิ่มสินค้าด้วยตนเอง</CardTitle>
        <CardDescription>
          ค้นหาสินค้าด้วยรหัสเพื่อเพิ่มลงในรายการขาย
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className='flex items-start gap-2'>
          <Popover
            open={isPopoverOpen && filteredProducts.length > 0}
            onOpenChange={setIsPopoverOpen}
          >
            <PopoverTrigger asChild>
              <div className='relative flex-grow'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  id='product-search'
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!isPopoverOpen) setIsPopoverOpen(true);
                  }}
                  placeholder='กรอกรหัสสินค้า...'
                  className='pl-8'
                  disabled={isLoading}
                  autoComplete='off'
                />
              </div>
            </PopoverTrigger>
            <PopoverContent
              className='w-[--radix-popover-trigger-width] p-0'
              align='start'
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className='flex flex-col space-y-1 p-1'>
                {filteredProducts.map((product) => (
                  <button
                    key={product.code}
                    type='button'
                    onClick={() => handleSuggestionClick(product)}
                    className='flex flex-col text-left p-2 rounded-md hover:bg-accent'
                  >
                    <p className='font-semibold'>{product.name}</p>
                    <p className='text-sm text-muted-foreground'>
                      {product.code}
                    </p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button type='submit' disabled={!searchTerm || isLoading}>
            <PlusCircle className='mr-2 h-4 w-4' />
            เพิ่ม
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
