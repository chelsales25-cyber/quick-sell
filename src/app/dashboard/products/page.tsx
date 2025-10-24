import { ProductList } from '@/components/products/product-list';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ProductsPage() {
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>สินค้า</CardTitle>
          <CardDescription>จัดการสต็อกสินค้าและ QR code</CardDescription>
        </CardHeader>
      </Card>
      <ProductList />
    </div>
  );
}
