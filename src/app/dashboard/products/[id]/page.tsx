'use client';

import { useGetProductsQuery } from '@/lib/features/products/products-api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import QRCode from 'react-qr-code';
import { useParams } from 'next/navigation';
import { formatBaht } from '@/lib/utils';
import { DialogHeader, DialogFooter, Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
const preQrProp =[{
  size:144,
  fontSize:24,
  padding:34,
},{
  size:213,
  fontSize:36,
  padding:44,
},{
  size:288,
  fontSize:50,
  padding:60,
}];

export default function Page() {
  const params = useParams();
  const [open, setOpen] = useState(false);
  const [qrSize, setQrSize] = useState(144); 
  const id = params.id as string;
  const { data: products, isLoading, isError } = useGetProductsQuery();

  const product = products?.find((p) => p.code === id);

  const handleDownload = (qrProps: { size: number, fontSize: number, padding: number }) => {
    setQrSize(qrProps.size);
    setOpen(false);
    if (!product) return;

    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    // Convert SVG to string
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Constants for layout
      const qrSize = qrProps.size;
      const padding = qrProps.padding;
      const textHeight = 30;

      canvas.width = qrSize + padding * 2;
      canvas.height = qrSize + padding * 2 + textHeight;

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR Code
      ctx.drawImage(img, padding, padding, qrSize, qrSize);

      // Draw Product Code Text
      ctx.fillStyle = 'black';
      ctx.font = 'bold '+qrProps.fontSize+'pt "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText( product.code, canvas.width / 2, qrSize + padding + qrProps.padding);

      // Trigger download
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qrcode-${product.code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Card>
          <CardContent className='p-4'>
            <Skeleton className='h-8 w-1/4 mb-2' />
            <Skeleton className='h-4 w-1/2' />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-1/3' />
          </CardHeader>
          <CardContent className='flex items-center justify-center p-6'>
            <Skeleton className='h-48 w-48' />
          </CardContent>
          <CardFooter>
            <Skeleton className='h-10 w-full' />
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-1/2' />
          </CardHeader>
          <CardContent className='space-y-4'>
            {[...Array(5)].map((_, i) => (
              <div key={i} className='flex justify-between items-center'>
                <Skeleton className='h-5 w-1/4' />
                <Skeleton className='h-5 w-1/2' />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className='flex flex-col items-center justify-center text-center py-10'>
        <h2 className='text-xl font-semibold'>
          {isError ? 'เกิดข้อผิดพลาด' : 'ไม่พบสินค้า'}
        </h2>
        <p className='text-muted-foreground mb-4'>
          {isError
            ? 'ไม่สามารถโหลดข้อมูลสินค้าได้'
            : 'เราไม่พบสินค้าที่คุณกำลังมองหา'}
        </p>
        <Button asChild>
          <Link href='/dashboard/products'>
            <ArrowLeft className='mr-2' />
            กลับไปหน้ารายการสินค้า
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardContent className='p-4'>
          <Button variant='ghost' size='sm' asChild className='mb-2 -ml-4'>
            <Link href='/dashboard/products'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              กลับ
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>{product.name}</h1>
          <p className='text-sm text-muted-foreground'>
            รหัสสินค้า: {product.code}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center p-6 gap-2'>
          <div className='rounded-lg border bg-white p-4'>
            <QRCode
              id='qr-code-svg'
              size={192}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              value={product.code}
              viewBox={`0 0 256 256`}
            />
          </div>
          <p className='text-[26px] text-muted-foreground pt-1 font-bold'>
            {product.code}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setOpen(true)}className='w-full'>
            <Download className='mr-2 h-4 w-4' />
            ดาวน์โหลด QR Code
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดสินค้า</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>ข้อมูลสินค้า</span>
            <span>{product.name}</span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>ราคาขาย</span>
            <span className='font-semibold text-lg'>
              {formatBaht(product.price)}
            </span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>หน่วยนับ</span>
            <span>{product.unit || 'N/A'}</span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>หมวดหมู่</span>
            <Badge variant='outline'>{product.category}</Badge>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>แบรนด์</span>
            <Badge variant='outline'>{product.brand || 'N/A'}</Badge>
          </div>
        </CardContent>
      </Card>
       <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เลือกขนาด QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Button variant={qrSize === 144 ? "default" : "outline"} onClick={() => handleDownload(preQrProp[0])}>
              144 x 144 px (203 DPI)
            </Button>
            <Button variant={qrSize === 213 ? "default" : "outline"} onClick={() => handleDownload(preQrProp[1])}>
              213 x 213 px (300 DPI)
            </Button>
            <Button variant={qrSize === 288 ? "default" : "outline"} onClick={() => handleDownload(preQrProp[2])}>
              288 x 288 px (600 DPI)
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
