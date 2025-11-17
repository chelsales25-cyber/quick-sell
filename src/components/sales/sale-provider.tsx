'use client';

import React, {
  createContext,
  useState,
  useMemo,
  useContext,
  useCallback,
} from 'react';
import { useToast } from '@/hooks/use-toast';
import type { SaleItem, Product, SaveSaleInput } from '@/lib/types';
import { useGetProductsQuery } from '@/lib/features/products/products-api';
import { useSaveSaleMutation } from '@/lib/features/sales/sales-api';
import { useSyncTransactionsMutation } from '@/lib/features/transactions/transactions-api';

// Define the shape of the sale details managed by the form
interface SaleDetails {
  warehouse: string;
  seller: string;
  customer: {
    id?: string;
    name: string;
    phone: string;
    address: string;
  };
  transactionDate: string;
}

// Define the shape of payment data passed on completion
interface PaymentData {
  paymentMethod: string;
}

interface SaleContextType {
  saleItems: SaleItem[];
  isSaving: boolean;
  addProductToSale: (productId: string) => void;
  removeItem: (id: string, parentCode?: string) => void;
  // Item modification handlers
  handleQuantityChange: (
    id: string,
    quantity: number,
    parentCode?: string
  ) => void;
  handlePriceChange: (id: string, price: number, parentCode?: string) => void;
  handleDiscountChange: (
    id: string,
    discount: number,
    parentCode?: string
  ) => void;
  handlePromoCodeChange: (
    id: string,
    promoCode: string,
    parentCode?: string
  ) => void;
  // Sub-item handlers
  addSubItem: (parentProductCode: string, freebieProduct: Product) => void;

  // Payment Sheet State
  isPaymentSheetOpen: boolean;
  openPaymentSheet: () => void;
  closePaymentSheet: () => void;

  // New state and setter for sale details
  saleDetails: SaleDetails;
  setSaleDetails: (details: SaleDetails) => void;

  // Transaction Date state
  transactionDate: Date;
  setTransactionDate: (date: Date) => void;

  // Sale Completion
  completeSale: (paymentData: PaymentData) => void;
  total: number;
}

const SaleContext = createContext<SaleContextType | null>(null);

export function SaleProvider({ children }: { children: React.ReactNode }) {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [transactionDate, setTransactionDate] = useState(new Date());

  // New state to hold form data from CurrentSaleCard
  const [saleDetails, setSaleDetails] = useState<SaleDetails>({
    warehouse: '',
    seller: '',
    customer: { name: 'เงินสด', phone: '', address: '' },
    transactionDate: new Date().toISOString(),
  });

  const { toast } = useToast();

  // RTK Query Hooks
  const { data: products } = useGetProductsQuery();
  const [saveSale, { isLoading: isSaving }] = useSaveSaleMutation();
  const [syncTransactions] = useSyncTransactionsMutation();

  const productsMap = useMemo(() => {
    if (!products) return new Map<string, Product>();
    return new Map(products.map((p) => [p.code, p]));
  }, [products]);

  const total = useMemo(() => {
    return saleItems.reduce((acc, item) => {
      const itemTotal = item.price * item.quantity - (item.discount || 0);
      const subItemsTotal = (item.subItems || []).reduce((subAcc, subItem) => {
        return (
          subAcc + subItem.price * subItem.quantity - (subItem.discount || 0)
        );
      }, 0);
      return acc + itemTotal + subItemsTotal;
    }, 0);
  }, [saleItems]);

  const addProductToSale = useCallback(
    (productId: string) => {
      const product = productsMap.get(productId);

      if (!product) {
        toast({
          variant: 'destructive',
          title: 'ไม่พบสินค้า',
          description: `ไม่พบสินค้าสำหรับรหัส: ${productId} กรุณาซิงค์ข้อมูล`,
        });
      } else {
        setSaleItems((prevItems) => {
          const existingItem = prevItems.find(
            (item) => item.code === product!.code
          );
          if (existingItem) {
            return prevItems.map((item) =>
              item.code === product!.code
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          }
          return [
            ...prevItems,
            {
              id: product!.code, // Use 'id' consistently
              ...product!,
              quantity: 1,
              discount: 0,
              promoCode: '',
              unit: product.unit || '',
              subItems: [],
            },
          ];
        });
        toast({
          title: 'เพิ่มสินค้าแล้ว',
          description: `${product.name} ถูกเพิ่มในรายการขาย`,
        });
      }
    },
    [productsMap, toast]
  );

  const modifyItem = (
    items: SaleItem[],
    id: string,
    parentCode: string | undefined,
    modification: (item: SaleItem) => SaleItem
  ): SaleItem[] => {
    if (parentCode) {
      // It's a sub-item
      return items.map((parent) => {
        if (parent.id === parentCode) {
          return {
            ...parent,
            subItems: (parent.subItems || []).map((sub) =>
              sub.id === id ? modification(sub) : sub
            ),
          };
        }
        return parent;
      });
    } else {
      // It's a main item
      return items.map((item) => (item.id === id ? modification(item) : item));
    }
  };

  const handleQuantityChange = (
    id: string,
    quantity: number,
    parentCode?: string
  ) => {
    setSaleItems((prev) => {
      const newQuantity = isNaN(quantity) ? 0 : quantity;
      return modifyItem(prev, id, parentCode, (item) => {
        return newQuantity >= 0 ? { ...item, quantity: newQuantity } : item;
      });
    });
  };

  const handlePriceChange = (
    id: string,
    price: number,
    parentCode?: string
  ) => {
    setSaleItems((prev) => {
      const newPrice = isNaN(price) ? 0 : price;
      return modifyItem(prev, id, parentCode, (item) =>
        newPrice >= 0 ? { ...item, price: newPrice } : item
      );
    });
  };

  const handleDiscountChange = (
    id: string,
    discount: number,
    parentCode?: string
  ) => {
    setSaleItems((prev) =>
      modifyItem(prev, id, parentCode, (item) =>
        discount >= 0 ? { ...item, discount } : item
      )
    );
  };

  const handlePromoCodeChange = (
    id: string,
    promoCode: string,
    parentCode?: string
  ) => {
    setSaleItems((prev) =>
      modifyItem(prev, id, parentCode, (item) => ({ ...item, promoCode }))
    );
  };

  const removeItem = (id: string, parentCode?: string) => {
    if (parentCode) {
      // Removing a sub-item
      setSaleItems((prevItems) =>
        prevItems.map((item) => {
          if (item.id === parentCode) {
            return {
              ...item,
              subItems: (item.subItems || []).filter((sub) => sub.id !== id),
            };
          }
          return item;
        })
      );
    } else {
      // Removing a main item (and its sub-items)
      setSaleItems((prevItems) => prevItems.filter((item) => item.id !== id));
    }
  };

  const addSubItem = (parentProductCode: string, freebieProduct: Product) => {
    setSaleItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === parentProductCode) {
          const newSubItem: SaleItem = {
            ...freebieProduct,
            // Create a unique id for this sub-item instance to handle multiple same freebies
            id: `${freebieProduct.code}-sub-${Date.now()}`,
            parentCode: item.id,
            price: item.price,
            quantity: 1,
            discount: item.price,
            promoCode: item.promoCode || '', // Inherit promoCode from parent
            subItems: [], // Sub-items cannot have their own sub-items
          };
          return {
            ...item,
            subItems: [...(item.subItems || []), newSubItem],
          };
        }
        return item;
      })
    );
    toast({
      title: 'เพิ่มของแถมแล้ว',
      description: `${freebieProduct.name} ถูกเพิ่มเป็นของแถม`,
    });
  };

  const openPaymentSheet = () => {
    // validate each promotion in items is it null or not and show error when any is null
    const hasInvalidPromoCode = saleItems.some(
      (item) =>
        item.promoCode === null ||
        item.promoCode === undefined ||
        item.promoCode === ''
    );
    if (hasInvalidPromoCode) {
      toast({
        variant: 'destructive',
        title: 'ข้อมูลโปรโมชันไม่ถูกต้อง',
        description: 'โปรดตรวจสอบว่าสินค้าทุกชิ้นมีโปรโมชันที่ถูกต้อง',
      });
      return;
    }

    if (saleItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'รายการขายว่างเปล่า',
        description: 'โปรดเพิ่มสินค้าก่อนทำการชำระเงิน',
      });
      return;
    }
    if (!saleDetails.warehouse || !saleDetails.seller) {
      toast({
        variant: 'destructive',
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณาเลือกคลังสินค้าและผู้ขาย',
      });
      return;
    }
    setIsPaymentSheetOpen(true);
  };

  const closePaymentSheet = () => setIsPaymentSheetOpen(false);

  const completeSale = async (paymentData: PaymentData) => {
    // Flatten the items and sub-items into a single list for saving
    const flattenedItems = saleItems.flatMap((item) => {
      const mainItem = {
        id: item.code,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
        discount: item.discount,
        promoCode: item.promoCode,
        parentCode: undefined, // Main items have no parent
      };
      const subItems = (item.subItems || []).map((sub) => ({
        id: sub.code,
        name: sub.name,
        quantity: sub.quantity,
        price: sub.price,
        unit: sub.unit,
        discount: sub.discount,
        promoCode: sub.promoCode,
        parentCode: item.code, // Link sub-item to its parent
      }));
      return [mainItem, ...subItems];
    });

    const finalSaleData: SaveSaleInput = {
      ...saleDetails,
      paymentMethod: paymentData.paymentMethod,
      items: flattenedItems,
      total,
    };

    try {
      await saveSale(finalSaleData).unwrap();
      toast({
        title: 'บันทึกสำเร็จ!',
        description: 'บันทึกข้อมูลการขายเรียบร้อยแล้ว',
      });
      setSaleItems([]);
      // Reset transaction date to now for the next sale
      setTransactionDate(new Date());
      closePaymentSheet();

      // Automatically sync transactions after a successful sale
      if (finalSaleData.seller) {
        syncTransactions({ sellerId: finalSaleData.seller });
      }
    } catch (error) {
      console.error('Failed to save sale:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลการขายได้',
      });
    }
  };

  const contextValue = {
    saleItems,
    isSaving,
    addProductToSale,
    handleQuantityChange,
    handlePriceChange,
    handleDiscountChange,
    handlePromoCodeChange,
    removeItem,
    isPaymentSheetOpen,
    openPaymentSheet,
    closePaymentSheet,
    completeSale,
    total,
    saleDetails,
    setSaleDetails,
    transactionDate,
    setTransactionDate,
    addSubItem,
  };

  return (
    <SaleContext.Provider value={contextValue}>{children}</SaleContext.Provider>
  );
}

export const useSale = () => {
  const context = useContext(SaleContext);
  if (!context) {
    throw new Error('useSale must be used within a SaleProvider');
  }
  return context;
};
