'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSale } from '@/components/sales/sale-provider';
import {
  ShoppingCart,
  Trash2,
  User,
  Warehouse,
  UserCircle,
  Phone,
  RefreshCw,
  Calendar as CalendarIcon,
  PlusCircle,
  Home,
  Loader2,
  Tag,
  ChevronDown,
  Gift,
  Search,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import {
  useGetWarehousesQuery,
  useSyncWarehousesMutation,
} from '@/lib/features/warehouses/warehouses-api';
import {
  useGetSellersQuery,
  useSyncSellersMutation,
} from '@/lib/features/sellers/sellers-api';
import {
  useGetCustomersQuery,
  useSyncCustomersMutation,
  useAddCustomerMutation,
} from '@/lib/features/customers/customers-api';
import {
  useGetPromotionsQuery,
  useSyncPromotionsMutation,
} from '@/lib/features/promotions/promotions-api';
import { useGetProductsQuery } from '@/lib/features/products/products-api';
import { useToast } from '@/hooks/use-toast';
import { cn, formatBaht } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import dayjs from 'dayjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '../ui/scroll-area';
import type { SaleItem, Product } from '@/lib/types';

const WAREHOUSE_STORAGE_KEY = 'selectedWarehouse';
const SELLER_STORAGE_KEY = 'selectedSeller';
const CUSTOMER_STORAGE_KEY = 'selectedCustomer';
const WAREHOUSE_LAST_SYNCED_KEY = 'warehouses_last_synced';
const SELLERS_LAST_SYNCED_KEY = 'sellers_last_synced';
const CUSTOMERS_LAST_SYNCED_KEY = 'customers_last_synced';
const PROMOTIONS_LAST_SYNCED_KEY = 'promotions_last_synced';

// --- Product Picker Dialog for Freebies ---
const ProductPickerDialog = ({
  onSelectProduct,
  children,
}: {
  onSelectProduct: (product: Product) => void;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: products, isLoading } = useGetProductsQuery();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products;
    const lowercasedTerm = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowercasedTerm) ||
        p.code.toLowerCase().includes(lowercasedTerm)
    );
  }, [products, searchTerm]);

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='max-w-md w-full flex flex-col h-[80vh]'>
        <DialogHeader>
          <DialogTitle>เลือกสินค้าของแถม</DialogTitle>
          <DialogDescription>
            ค้นหาและเลือกสินค้าที่คุณต้องการเพิ่มเป็นของแถม
          </DialogDescription>
        </DialogHeader>
        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='ค้นหาด้วยชื่อ หรือ รหัสสินค้า...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-8'
          />
        </div>
        <ScrollArea className='flex-grow border rounded-md'>
          <div className='p-2 space-y-1'>
            {isLoading && <p>กำลังโหลดสินค้า...</p>}
            {filteredProducts.map((product) => (
              <Button
                key={product.code}
                variant='ghost'
                className='w-full justify-start h-auto'
                onClick={() => handleSelect(product)}
              >
                <div className='flex flex-col text-left'>
                  <p className='font-semibold'>{product.name}</p>
                  <p className='text-xs text-muted-foreground'>
                    รหัส: {product.code}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>ยกเลิก</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SaleItemCard = ({
  item,
  isSubItem = false,
}: {
  item: SaleItem;
  isSubItem?: boolean;
}) => {
  const {
    handleQuantityChange,
    handlePriceChange,
    handleDiscountChange,
    handlePromoCodeChange,
    removeItem,
    addSubItem,
  } = useSale();
  const { data: promotions, isLoading: isLoadingPromotions } =
    useGetPromotionsQuery();

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) =>
    event.target.select();

  return (
    <Card className={cn('p-3', isSubItem && 'ml-4 bg-muted/50')}>
      <div className='flex items-start justify-between'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            {isSubItem && <Gift className='h-4 w-4 text-muted-foreground' />}
            <h4 className='flex-1 font-semibold text-sm break-words pr-2'>
              {item.name} {isSubItem && '(ของแถม)'}
            </h4>
          </div>
          <p className='text-sm text-muted-foreground'>รหัส: {item.code}</p>
        </div>
        <div className='flex items-center'>
          {!isSubItem && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 flex-shrink-0'
                >
                  <Gift className='h-4 w-4 text-blue-500' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => addSubItem(item.code, item)}>
                  เพิ่มสินค้าเดียวกัน (1 แถม 1)
                </DropdownMenuItem>
                <ProductPickerDialog
                  onSelectProduct={(product) => addSubItem(item.code, product)}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    เลือกสินค้าอื่น...
                  </DropdownMenuItem>
                </ProductPickerDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 flex-shrink-0'
            onClick={() => removeItem(item.id, item.parentCode)}
          >
            <Trash2 className='h-4 w-4 text-destructive' />
          </Button>
        </div>
      </div>
      <div className='mt-2 grid grid-cols-2 gap-3'>
        <div className='space-y-1'>
          <Label htmlFor={`quantity-${item.id}`} className='text-xs'>
            จำนวน
          </Label>
          <Input
            id={`quantity-${item.id}`}
            type='number'
            value={item.quantity}
            onFocus={handleFocus}
            onChange={(e) =>
              handleQuantityChange(
                item.id,
                parseInt(e.target.value, 10),
                item.parentCode
              )
            }
            className='h-8 text-sm'
            min='1'
          />
        </div>
        <div className='space-y-1'>
          <Label htmlFor={`price-${item.id}`} className='text-xs'>
            ราคา
          </Label>
          <Input
            id={`price-${item.id}`}
            type='number'
            value={item.price}
            onFocus={handleFocus}
            onChange={(e) =>
              handlePriceChange(
                item.id,
                parseFloat(e.target.value),
                item.parentCode
              )
            }
            className='h-8 text-sm'
            min='0'
            step='0.01'
          />
        </div>
      </div>
      <div className='mt-2 grid grid-cols-2 gap-3'>
        <div className='space-y-1'>
          <Label htmlFor={`discount-${item.id}`} className='text-xs'>
            ส่วนลด (บาท)
          </Label>
          <Input
            id={`discount-${item.id}`}
            type='number'
            placeholder='0.00'
            value={item.discount || ''}
            onFocus={handleFocus}
            onChange={(e) =>
              handleDiscountChange(
                item.id,
                parseFloat(e.target.value) || 0,
                item.parentCode
              )
            }
            className='h-8 text-sm'
            min='0'
            step='0.01'
          />
        </div>
        <div className='space-y-1'>
          <Label htmlFor={`promo-${item.id}`} className='text-xs'>
            โปรโมชัน
          </Label>
          <Select
            value={item.promoCode || 'no-promo'}
            onValueChange={(value) =>
              handlePromoCodeChange(
                item.id,
                value === 'no-promo' ? '' : value,
                item.parentCode
              )
            }
            disabled={isLoadingPromotions}
          >
            <SelectTrigger id={`promo-${item.id}`} className='h-8 text-sm'>
              <SelectValue
                placeholder={isLoadingPromotions ? 'โหลด...' : 'เลือกโปรโมชัน'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='no-promo'>- ไม่มี -</SelectItem>
              {promotions?.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  [{p.code}] - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};

export function CurrentSaleCard() {
  const {
    saleItems,
    isSaving,
    total,
    openPaymentSheet,
    setSaleDetails,
    transactionDate,
    setTransactionDate,
  } = useSale();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Data fetching hooks
  const { data: warehouses, isLoading: isLoadingWarehouses } =
    useGetWarehousesQuery();
  const { data: sellers, isLoading: isLoadingSellers } = useGetSellersQuery();
  const { data: customers, isLoading: isLoadingCustomers } =
    useGetCustomersQuery();

  // Sync mutation hooks
  const [
    syncWarehouses,
    { isLoading: isSyncingWarehouses, isSuccess: isSyncWarehousesSuccess },
  ] = useSyncWarehousesMutation();
  const [
    syncSellers,
    { isLoading: isSyncingSellers, isSuccess: isSyncSellersSuccess },
  ] = useSyncSellersMutation();
  const [
    syncCustomers,
    { isLoading: isSyncingCustomers, isSuccess: isSyncCustomersSuccess },
  ] = useSyncCustomersMutation();
  const [addCustomer, { isLoading: isAddingCustomer }] =
    useAddCustomerMutation();
  const [
    syncPromotions,
    { isLoading: isSyncingPromotions, isSuccess: isSyncPromotionsSuccess },
  ] = useSyncPromotionsMutation();

  // Last synced state
  const [lastSyncedWarehouse, setLastSyncedWarehouse] = useState<string | null>(
    null
  );
  const [lastSyncedSellers, setLastSyncedSellers] = useState<string | null>(
    null
  );
  const [lastSyncedCustomers, setLastSyncedCustomers] = useState<string | null>(
    null
  );
  const [lastSyncedPromotions, setLastSyncedPromotions] = useState<
    string | null
  >(null);

  // Form state
  const [warehouse, setWarehouse] = useState('');
  const [seller, setSeller] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('เงินสด');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isManualCustomer, setIsManualCustomer] = useState(true);

  // State for manual customer entry dialog
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  // const [isCustomerCardOpen, setIsCustomerCardOpen] = useState(true);

  const { toast } = useToast();

  // --- Effects for initialization and syncing ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (warehouse && warehouses && customers) {
      const warehouseDetails = warehouses.find((wh) => wh.id === warehouse);
      if (warehouseDetails?.customerId) {
        const customerExists = customers.some(
          (c) => c.id === warehouseDetails.customerId
        );
        if (customerExists) {
          setSelectedCustomerId(warehouseDetails.customerId);
        }
      }
    }
  }, [warehouse, warehouses, customers]);

  useEffect(() => {
    setLastSyncedWarehouse(localStorage.getItem(WAREHOUSE_LAST_SYNCED_KEY));
    setLastSyncedSellers(localStorage.getItem(SELLERS_LAST_SYNCED_KEY));
    setLastSyncedCustomers(localStorage.getItem(CUSTOMERS_LAST_SYNCED_KEY));
    setLastSyncedPromotions(localStorage.getItem(PROMOTIONS_LAST_SYNCED_KEY));
  }, []);

  useEffect(() => {
    const savedWarehouse = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    const savedSeller = localStorage.getItem(SELLER_STORAGE_KEY);
    const savedCustomer = localStorage.getItem(CUSTOMER_STORAGE_KEY);

    if (savedWarehouse) setWarehouse(savedWarehouse);
    if (savedSeller) setSeller(savedSeller);
    if (savedCustomer) setSelectedCustomerId(savedCustomer);
  }, []);

  useEffect(() => {
    if (isSyncWarehousesSuccess) {
      const newTime = new Date().toISOString();
      localStorage.setItem(WAREHOUSE_LAST_SYNCED_KEY, newTime);
      setLastSyncedWarehouse(newTime);
    }
  }, [isSyncWarehousesSuccess]);

  useEffect(() => {
    if (isSyncSellersSuccess) {
      const newTime = new Date().toISOString();
      localStorage.setItem(SELLERS_LAST_SYNCED_KEY, newTime);
      setLastSyncedSellers(newTime);
      if (seller && !sellers?.find((s) => s.id === seller)) setSeller('');
    }
  }, [isSyncSellersSuccess, seller, sellers]);

  useEffect(() => {
    if (isSyncCustomersSuccess) {
      const newTime = new Date().toISOString();
      localStorage.setItem(CUSTOMERS_LAST_SYNCED_KEY, newTime);
      setLastSyncedCustomers(newTime);
    }
  }, [isSyncCustomersSuccess]);

  useEffect(() => {
    if (isSyncPromotionsSuccess) {
      const newTime = new Date().toISOString();
      localStorage.setItem(PROMOTIONS_LAST_SYNCED_KEY, newTime);
      setLastSyncedPromotions(newTime);
    }
  }, [isSyncPromotionsSuccess]);

  // --- Effects for form logic ---

  // Update sale context when form details change
  useEffect(() => {
    setSaleDetails({
      warehouse,
      seller,
      customer: {
        id: selectedCustomerId === 'cash_customer' ? '' : selectedCustomerId,
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      },
      transactionDate: dayjs(transactionDate).format('DD/MM/YY'),
    });
    if (warehouse) localStorage.setItem(WAREHOUSE_STORAGE_KEY, warehouse);
    if (seller) localStorage.setItem(SELLER_STORAGE_KEY, seller);
    if (selectedCustomerId)
      localStorage.setItem(CUSTOMER_STORAGE_KEY, selectedCustomerId);
  }, [
    warehouse,
    seller,
    selectedCustomerId,
    customerName,
    customerPhone,
    customerAddress,
    transactionDate,
    setSaleDetails,
  ]);

  // Handle customer selection from dropdown
  useEffect(() => {
    if (selectedCustomerId === 'cash_customer') {
      setCustomerName('เงินสด');
      setCustomerPhone('');
      setCustomerAddress('');
      setIsManualCustomer(true);
      return;
    }

    const customer = customers?.find((c) => c.id === selectedCustomerId);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
      setCustomerAddress(customer.address);
      setIsManualCustomer(false);
    }
  }, [selectedCustomerId, customers]);

  // Filter warehouses based on selected customer
  const filteredWarehouses = useMemo(() => {
    if (!warehouses) return [];
    return warehouses; // Return all if no customer is selected
  }, [warehouses, selectedCustomerId, warehouse]);

  // --- Event Handlers ---

  const handleSyncWarehouses = async () => {
    try {
      await syncWarehouses().unwrap();
      toast({ title: 'ซิงค์คลังสินค้าสำเร็จ' });
    } catch {
      toast({ variant: 'destructive', title: 'ซิงค์คลังสินค้าไม่สำเร็จ' });
    }
  };

  const handleSyncSellers = async () => {
    if (!currentUser?.email) {
      toast({ variant: 'destructive', title: 'ไม่พบอีเมลผู้ใช้' });
      return;
    }
    try {
      await syncSellers({ userEmail: currentUser.email }).unwrap();
      toast({ title: 'ซิงค์พนักงานขายสำเร็จ' });
    } catch {
      toast({ variant: 'destructive', title: 'ซิงค์พนักงานขายไม่สำเร็จ' });
    }
  };

  const handleSyncCustomers = async () => {
    try {
      await syncCustomers().unwrap();
      toast({ title: 'ซิงค์ข้อมูลลูกค้าสำเร็จ' });
    } catch {
      toast({ variant: 'destructive', title: 'ซิงค์ข้อมูลลูกค้าไม่สำเร็จ' });
    }
  };

  const handleSyncPromotions = async () => {
    try {
      await syncPromotions().unwrap();
      toast({ title: 'ซิงค์โปรโมชันสำเร็จ' });
    } catch {
      toast({ variant: 'destructive', title: 'ซิงค์โปรโมชันไม่สำเร็จ' });
    }
  };

  const handleSaveManualCustomer = async () => {
    if (!manualName) {
      toast({
        variant: 'destructive',
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกชื่อลูกค้า',
      });
      return;
    }

    try {
      const result = await addCustomer({
        name: manualName,
        phone: manualPhone,
        address: manualAddress,
      }).unwrap();

      toast({
        title: 'เพิ่มลูกค้าสำเร็จ',
        description: `ลูกค้า "${manualName}" ถูกเพิ่มในระบบด้วยรหัส ${result.newCustomerId}`,
      });
      setIsAddCustomerOpen(false);

      // Sync customers to get the new list, which will then trigger selection
      await syncCustomers().unwrap();

      // After successfully adding and syncing, select the new customer in the dropdown
      if (result.newCustomerId) {
        setSelectedCustomerId(result.newCustomerId);
      }

      // Reset manual fields
      setManualName('');
      setManualPhone('');
      setManualAddress('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกลูกค้าใหม่ได้',
      });
    }
  };

  const renderLastSynced = (time: string | null) => {
    if (!time) return 'ยังไม่เคยซิงค์';
    return `ล่าสุดเมื่อ ${formatDistanceToNow(new Date(time), {
      addSuffix: true,
      locale: th,
    })}`;
  };

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader>
        <CardTitle>รายการขายปัจจุบัน</CardTitle>
        <CardDescription>สินค้า, ลูกค้า และข้อมูลการขายอื่นๆ</CardDescription>
      </CardHeader>
      <CardContent className='flex-grow space-y-4'>
        {/* --- Sale Details Section --- */}
        <Card className='p-4 space-y-4'>
          {/* Transaction Date */}
          <div className='space-y-2'>
            <Label htmlFor='transaction-date'>วันที่ทำรายการ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !transactionDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {transactionDate ? (
                    format(transactionDate, 'PPP', { locale: th })
                  ) : (
                    <span>เลือกวันที่</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0'>
                <Calendar
                  mode='single'
                  selected={transactionDate}
                  onSelect={(d) => d && setTransactionDate(d)}
                  initialFocus
                />
                <div className='p-3 border-t border-border'>
                  <Input
                    id='time'
                    type='date'
                    value={format(transactionDate, 'HH:mm')}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = dayjs(transactionDate)
                        .hour(Number(hours))
                        .minute(Number(minutes))
                        .toDate();
                      setTransactionDate(newDate);
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Warehouse */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label
                htmlFor='warehouse-select'
                className='flex items-center gap-2'
              >
                <Warehouse className='h-4 w-4' />
                <span>คลังสินค้า</span>
              </Label>
              <div className='flex items-center gap-2'>
                <p className='text-xs text-muted-foreground'>
                  {renderLastSynced(lastSyncedWarehouse)}
                </p>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6'
                  onClick={handleSyncWarehouses}
                  disabled={isSyncingWarehouses}
                  aria-label='ซิงค์คลังสินค้า'
                >
                  <RefreshCw
                    className={cn(
                      'h-4 w-4',
                      isSyncingWarehouses && 'animate-spin'
                    )}
                  />
                </Button>
              </div>
            </div>
            <Select
              onValueChange={setWarehouse}
              value={warehouse}
              disabled={isLoadingWarehouses || isSyncingWarehouses}
            >
              <SelectTrigger id='warehouse-select'>
                <SelectValue
                  placeholder={
                    isLoadingWarehouses ? 'กำลังโหลด...' : 'เลือกคลังสินค้า'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredWarehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    ({wh.id}) {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seller */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label
                htmlFor='seller-select'
                className='flex items-center gap-2'
              >
                <User className='h-4 w-4' />
                <span>พนักงานขาย</span>
              </Label>
              <div className='flex items-center gap-2'>
                <p className='text-xs text-muted-foreground'>
                  {renderLastSynced(lastSyncedSellers)}
                </p>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6'
                  onClick={handleSyncSellers}
                  disabled={isSyncingSellers}
                  aria-label='ซิงค์พนักงานขาย'
                >
                  <RefreshCw
                    className={cn(
                      'h-4 w-4',
                      isSyncingSellers && 'animate-spin'
                    )}
                  />
                </Button>
              </div>
            </div>
            <Select
              onValueChange={setSeller}
              value={seller}
              disabled={isLoadingSellers || isSyncingSellers}
            >
              <SelectTrigger id='seller-select'>
                <SelectValue
                  placeholder={
                    isLoadingSellers ? 'กำลังโหลด...' : 'เลือกพนักงานขาย'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sellers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    ({s.id}) {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Customer Card */}
        <Card>
          <div className='flex justify-between items-center w-full p-4  relative'>
            <CardTitle className='text-base flex items-start gap-2 '>
              <UserCircle className='h-5 w-5 ' />
              <div className='flex flex-col -mt-'>
                ข้อมูลลูกค้า:
                <span className='text-primary font-medium'>{customerName}</span>
              </div>
            </CardTitle>
            <div className='flex items-center'>
              <div className='text-xs text-muted-foreground mt-2 pr-2'>
                {renderLastSynced(lastSyncedCustomers)}
              </div>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={(e) => {
                  e.stopPropagation();
                  handleSyncCustomers();
                }}
                disabled={isSyncingCustomers}
                aria-label='ซิงค์ลูกค้า'
              >
                <RefreshCw
                  className={cn(
                    'h-4 w-4',
                    isSyncingCustomers && 'animate-spin'
                  )}
                />
              </Button>
            </div>
          </div>
          <CardContent className='p-4 pt-0 space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='customer-select'>เลือกลูกค้าที่มีอยู่</Label>
              <div className='flex items-center gap-2'>
                <Select
                  onValueChange={setSelectedCustomerId}
                  value={selectedCustomerId}
                  disabled={isLoadingCustomers || isSyncingCustomers}
                >
                  <SelectTrigger id='customer-select'>
                    <SelectValue
                      placeholder={
                        isLoadingCustomers ? 'กำลังโหลด...' : 'เลือกลูกค้า'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='cash_customer'>
                      -- ลูกค้าเงินสด --
                    </SelectItem>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        ({c.id}) {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog
                  open={isAddCustomerOpen}
                  onOpenChange={setIsAddCustomerOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant='outline' size='icon'>
                      <PlusCircle className='h-4 w-4' />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='bg-card'>
                    <DialogHeader>
                      <DialogTitle>เพิ่มลูกค้าใหม่</DialogTitle>
                      <DialogDescription>
                        กรอกข้อมูลเพื่อเพิ่มลูกค้าใหม่ลงใน Google Sheet
                        รหัสลูกค้าจะถูกสร้างขึ้นอัตโนมัติ
                      </DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4 py-4'>
                      <div className='space-y-2'>
                        <Label htmlFor='manual-name'>ชื่อลูกค้า</Label>
                        <Input
                          id='manual-name'
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder='ชื่อ-นามสกุล'
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label htmlFor='manual-phone'>เบอร์โทรศัพท์</Label>
                        <Input
                          id='manual-phone'
                          value={manualPhone}
                          onChange={(e) => setManualPhone(e.target.value)}
                          type='tel'
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label htmlFor='manual-address'>ที่อยู่</Label>
                        <Textarea
                          id='manual-address'
                          value={manualAddress}
                          onChange={(e) => setManualAddress(e.target.value)}
                          placeholder='ระบุที่อยู่...'
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button
                          type='button'
                          variant='outline'
                          disabled={isAddingCustomer}
                        >
                          ยกเลิก
                        </Button>
                      </DialogClose>
                      <Button
                        type='button'
                        onClick={handleSaveManualCustomer}
                        disabled={isAddingCustomer || isSyncingCustomers}
                      >
                        {(isAddingCustomer || isSyncingCustomers) && (
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        )}
                        บันทึกข้อมูล
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className='p-3 rounded-md border bg-muted/50 space-y-3'>
              <div className='space-y-2'>
                <Label
                  htmlFor='customer-name'
                  className='flex items-center gap-2'
                >
                  <UserCircle className='h-4 w-4 text-muted-foreground' /> ชื่อ
                  (ปัจจุบัน)
                </Label>
                <Input
                  id='customer-name'
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  readOnly={!isManualCustomer}
                />
              </div>
              <div className='space-y-2'>
                <Label
                  htmlFor='customer-phone'
                  className='flex items-center gap-2'
                >
                  <Phone className='h-4 w-4 text-muted-foreground' /> เบอร์โทร
                </Label>
                <Input
                  id='customer-phone'
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  readOnly={!isManualCustomer}
                  type='tel'
                />
              </div>
              <div className='space-y-2'>
                <Label
                  htmlFor='customer-address'
                  className='flex items-center gap-2'
                >
                  <Home className='h-4 w-4 text-muted-foreground' /> ที่อยู่
                </Label>
                <Textarea
                  id='customer-address'
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  readOnly={!isManualCustomer}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* --- Promotions Sync --- */}
        <Card>
          <CardContent className='p-3 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Tag className='h-4 w-4' />
              <p className='text-sm font-medium'>โปรโมชัน</p>
            </div>
            <div className='flex items-center gap-2'>
              <p className='text-xs text-muted-foreground'>
                {renderLastSynced(lastSyncedPromotions)}
              </p>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={handleSyncPromotions}
                disabled={isSyncingPromotions}
                aria-label='ซิงค์โปรโมชัน'
              >
                <RefreshCw
                  className={cn(
                    'h-4 w-4',
                    isSyncingPromotions && 'animate-spin'
                  )}
                />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- Sale Items Section --- */}
        <div className='min-h-[200px]'>
          {saleItems.length > 0 ? (
            <div className='space-y-3'>
              {saleItems.map((item) => (
                <Collapsible
                  key={item.id}
                  className='space-y-2'
                  defaultOpen={true}
                >
                  <SaleItemCard item={item} />
                  {item.subItems && item.subItems.length > 0 && (
                    <CollapsibleTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='w-full justify-start gap-2 text-muted-foreground'
                      >
                        <ChevronDown className='h-4 w-4' />
                        <span>ของแถม ({item.subItems.length})</span>
                      </Button>
                    </CollapsibleTrigger>
                  )}
                  <CollapsibleContent className='space-y-2'>
                    {(item.subItems || []).map((subItem) => (
                      <SaleItemCard
                        key={subItem.id}
                        item={subItem}
                        isSubItem={true}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className='flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground'>
              <ShoppingCart className='mb-4 h-10 w-10' />
              <h3 className='text-lg font-semibold'>ยังไม่มีสินค้าในตะกร้า</h3>
              <p className='text-sm'>เริ่มต้นโดยการสแกนสินค้า</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-xl font-bold'>รวม: {formatBaht(total)}</div>
        <Button
          onClick={openPaymentSheet}
          disabled={isSaving || saleItems.length === 0}
          size='lg'
          className='bg-accent hover:bg-accent/90'
        >
          {isSaving ? 'กำลังบันทึก...' : 'ชำระเงิน'}
        </Button>
      </CardFooter>
    </Card>
  );
}
