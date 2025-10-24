import { z } from 'zod';

// Enum for sheet names
export const SheetNames = {
  PRODUCTS: 'STMAS!A:H',
  TRANSACTIONS: 'ARTRN!A:Z', // Updated to include parentCode in column Z
  WAREHOUSES: 'ST!A:D', // Updated to include customer id column
  SELLERS: 'SELLER!A:C', // Include column C for email
  REPORT: 'REPORT!A:D',
  BANKS: 'BANK!A:C',
  CUSTOMERS: 'AR!A:D', // รหัสลูกค้า, ชื่อลูกค้า, เบอร์โทร, ที่อยู่
  PROMOTIONS: 'PROMOTION!A:B', // name, code
} as const;

export type SheetName = (typeof SheetNames)[keyof typeof SheetNames];

export interface Warehouse {
  id: string;
  name: string;
  customerId?: string; // Column D
}

export interface Seller {
  id: string;
  name: string;
  email: string;
}

export interface ReportItem {
  title: string;
  value: string;
  description: string;
  icon: string; // lucide-react icon name
}

export interface Product {
  /**
   * Column A
   */
  code: string;
  /**
   * Column B
   */
  name: string;
  /**
   * Column C
   */
  price: number;
  /**
   * Column D
   */
  category: string;
  /**
   * Column E
   */
  unit: string;
  /**
   * Column F
   */
  brand: string;
}

export interface SaleItem extends Product {
  id: string; // Unique identifier for the item in the cart, especially for sub-items
  quantity: number;
  discount?: number;
  promoCode?: string;
  subItems?: SaleItem[]; // For freebies or sub-items
  parentCode?: string; // To link a sub-item to its parent
}

// Represents the summarized data for a single invoice, which is what we store in IndexedDB and display on the dashboard.
export interface Transaction {
  id: string; // invoice no (TRN_ID from sheet)
  customerName: string;
  itemsCount: number;
  date: string;
  total: number;
  status: string;
}

// Represents a single item within a detailed transaction view
export interface TransactionDetailItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  subItems?: TransactionDetailItem[]; // For displaying sub-items
  parentCode?: string; // To link back to a parent
}

// Represents the full details of a single transaction/order
export interface TransactionDetail {
  id: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  items: TransactionDetailItem[];
  total: number;
  paymentMethod: string;
  sellerId: string;
  warehouseId: string;
  status: string;
  cancellationNote?: string;
}

// Define the structure for a bank
export interface Bank {
  code: string;
  name: string;
  bank_no: string;
}

// Define the structure for a customer from the AR sheet
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

// Define the structure for a promotion from the PROMOTION sheet
export interface Promotion {
  code: string;
  name: string;
}

// Define the structure of the customer and other details
const CustomerInfoSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Define the input schema for saving a sale
export const SaveSaleInputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
      unit: z.string().optional(),
      discount: z.number().optional(),
      promoCode: z.string().optional(),
      parentCode: z.string().optional(), // Add parentCode to schema
    })
  ),
  total: z.number(),
  warehouse: z.string(),
  seller: z.string(),
  customer: CustomerInfoSchema,
  paymentMethod: z.string(),
  transactionDate: z
    .string()
    .describe('The date of the transaction in ISO format.'),
});
export type SaveSaleInput = z.infer<typeof SaveSaleInputSchema>;
