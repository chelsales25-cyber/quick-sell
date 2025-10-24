
'use server';
/**
 * @fileOverview Flow for interacting with Google Sheets to get transaction data.
 *
 * - getTransactionsData - A function to retrieve and process transaction data from ARTRN sheet.
 * - getTransactionDetails - A function to retrieve detailed items for a single order.
 * - updateTransactionStatus - A function to update the status of an existing order.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { Transaction, TransactionDetail, TransactionDetailItem } from '@/lib/types';
import { SheetNames } from '@/lib/types';
import { parse, isValid, formatISO } from 'date-fns';

// Define input schema for the flow
const GetTransactionsInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  sellerId: z
    .string()
    .optional()
    .describe('The ID of the seller to filter transactions for.'),
});

const GetTransactionDetailsInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  orderNo: z.string().describe('The order number to retrieve details for.'),
});

const UpdateTransactionStatusInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  orderNo: z.string().describe('The order number to update.'),
  status: z.string().describe('The new status for the order.'),
  note: z
    .string()
    .optional()
    .describe('An optional note for the status change.'),
});

export async function getTransactionsData(
  spreadsheetId: string,
  sellerId?: string
): Promise<Transaction[]> {
  return getTransactionsDataFlow({ spreadsheetId, sellerId });
}

export async function getTransactionDetails(
  spreadsheetId: string,
  orderNo: string
): Promise<TransactionDetail | null> {
  return getTransactionDetailsFlow({ spreadsheetId, orderNo });
}

export async function updateTransactionStatus(
  spreadsheetId: string,
  orderNo: string,
  status: string,
  note?: string
): Promise<{ success: boolean }> {
  return updateTransactionStatusFlow({ spreadsheetId, orderNo, status, note });
}

interface RawTransactionRow {
  parentCode: string;
  date: string;
  customerId: string;
  customerName: string;
  orderNo: string;
  sellerId: string;
  sellerName: string;
  warehouseId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  promo: string;
  address: string;
  phone: string;
  paymentMethod: string;
  status: string;
  cancellationNote: string;
}

const mapping = {
  legacyParentCode: 0, // A: Legacy Parent item code (now unused)
  orderNo: 1, // B: อ้างอิง (orderNo)
  date: 2, // C: วันที่
  customerId: 3, // D: รหัสลูกค้า
  sellerId: 4, // E: รหัสพนักงาน (seller id)
  warehouseId: 5, // F: รหัสคลังสินค้า
  productId: 6, // G: รหัสสินค้า
  quantity: 7, // H: จำนวน
  unit: 8, // I: หน่วยนับ
  price: 9, // J: ราคาต่อหน่วย
  discount: 10, // K: ส่วนลด
  fullPrice: 11, // L: ราคาเต็ม
  vat: 12, // M: vat
  total: 13, // N: รวมทั้งสิ้น
  promo: 14, // O: รหัสโปรโมชั่น
  next: 15, // P: NEXT
  sellerName: 16, // Q: ชื่อพนักงาน
  customerName: 17, // R: ชื่อลูกค้า
  phone: 18, // S: เบอร์โทร
  address: 19, // T: ที่อยู่ลูกค้า
  paymentMethod: 20, // U: ช่องทางการชำระเงิน
  status: 21, // V: สถานะ
  cancellationNote: 22, // W: หมายเหตุ
  productName: 23, // X: ชื่อสินค้า
  // Column Y is empty (index 24)
  parentCode: 25, // Z: Parent item code for sub-items
};


/**
 * Parses a dd/MM/yy date string from Google Sheets into a standard ISO string.
 * @param dateString The date string from the sheet.
 * @returns An ISO formatted date string (e.g., "2023-12-25T00:00:00.000Z") or the original string if parsing fails.
 */
const parseSheetDateToISO = (dateString: string): string => {
    if (!dateString) return '';
    // The format from the sheet is 'dd/MM/yy'
    const parsedDate = parse(dateString, 'dd/MM/yy', new Date());
    if (isValid(parsedDate)) {
        return formatISO(parsedDate);
    }
    // If parsing fails, return the original string to avoid data loss,
    // though it might cause issues downstream.
    return dateString;
};


const getTransactionDetailsFlow = ai.defineFlow(
  {
    name: 'getTransactionDetailsFlow',
    inputSchema: GetTransactionDetailsInputSchema,
  },
  async ({ spreadsheetId, orderNo }) => {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const range = SheetNames.TRANSACTIONS;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      let rows = response.data.values;

      if (!rows || rows.length <= 1) {
        return null;
      }

      const dataRows = rows
        .slice(1)
        .filter((row) => row[mapping.orderNo] === orderNo);

      if (dataRows.length === 0) {
        return null;
      }
      
      // Group sub-items under their parents
      const itemsMap = new Map<string, TransactionDetailItem>();
      const subItems: TransactionDetailItem[] = [];

      dataRows.forEach(row => {
        const item: TransactionDetailItem = {
          id: row[mapping.productId] || '',
          name: row[mapping.productName] || '',
          quantity: parseFloat(row[mapping.quantity]) || 0,
          price: parseFloat(row[mapping.price]) || 0,
          discount: parseFloat(row[mapping.discount]) || 0,
          parentCode: row[mapping.parentCode] || undefined,
          subItems: [],
        };

        if (item.parentCode) {
            subItems.push(item);
        } else {
            itemsMap.set(item.id, item);
        }
      });

      subItems.forEach(subItem => {
        if(subItem.parentCode) {
            const parent = itemsMap.get(subItem.parentCode);
            if (parent) {
                parent.subItems = parent.subItems || [];
                parent.subItems.push(subItem);
            }
        }
      });

      const items = Array.from(itemsMap.values());


      const total = items.reduce((acc, item) => {
        const itemTotal = item.price * item.quantity - item.discount;
        const subItemsTotal = (item.subItems || []).reduce(
          (subAcc, subItem) => subAcc + (subItem.price * subItem.quantity - subItem.discount),
          0
        );
        return acc + itemTotal + subItemsTotal;
      }, 0);


      const firstRow = dataRows[0];

      const details: TransactionDetail = {
        id: firstRow[mapping.orderNo],
        date: parseSheetDateToISO(firstRow[mapping.date]),
        customer: {
          name: firstRow[mapping.customerName] || 'ลูกค้าทั่วไป',
          phone: firstRow[mapping.phone] || '',
          address: firstRow[mapping.address] || '',
        },
        items,
        total: total,
        paymentMethod: firstRow[mapping.paymentMethod] || 'N/A',
        sellerId: firstRow[mapping.sellerId] || '',
        warehouseId: firstRow[mapping.warehouseId] || '',
        status: firstRow[mapping.status] || 'Completed',
        cancellationNote: firstRow[mapping.cancellationNote] || '',
      };

      return details;
    } catch (err) {
      console.error('The API returned an error fetching details: ' + err);
      throw new Error(
        'Failed to retrieve transaction details from Google Sheets.'
      );
    }
  }
);

const getTransactionsDataFlow = ai.defineFlow(
  {
    name: 'getTransactionsDataFlow',
    inputSchema: GetTransactionsInputSchema,
  },
  async ({ spreadsheetId, sellerId }) => {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const range = SheetNames.TRANSACTIONS; // Points to 'ARTRN!A:Z'

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      let rows = response.data.values;

      if (!rows || rows.length <= 1) {
        console.log('No transaction data found in ARTRN.');
        return [];
      }

      // Skip header row
      const header = rows[0];
      let dataRows = rows.slice(1);

      // Filter by sellerId if provided
      if (sellerId) {
        dataRows = dataRows.filter((row) => row[mapping.sellerId] === sellerId);
      }

      // If after filtering there are no rows, return empty
      if (dataRows.length === 0) {
        console.log(`No transaction data found for sellerId: ${sellerId}`);
        return [];
      }

      const rawTransactions: RawTransactionRow[] = dataRows
        .map((row) => ({
          parentCode: row[mapping.parentCode] || '', 
          date: parseSheetDateToISO(row[mapping.date] || ''),
          customerId: row[mapping.customerId] || '',
          customerName: row[mapping.customerName] || 'ลูกค้าทั่วไป',
          orderNo: row[mapping.orderNo] || '',
          sellerId: row[mapping.sellerId] || '',
          sellerName: row[mapping.sellerName] || '',
          warehouseId: row[mapping.warehouseId] || '',
          productId: row[mapping.productId] || '',
          productName: row[mapping.productName] || '',
          quantity: parseFloat(row[mapping.quantity]) || 0,
          price: parseFloat(row[mapping.price]) || 0,
          discount: parseFloat(row[mapping.discount]) || 0,
          promo: row[mapping.promo] || '',
          address: row[mapping.address] || '',
          phone: row[mapping.phone] || '',
          paymentMethod: row[mapping.paymentMethod] || '',
          status: row[mapping.status] || '',
          cancellationNote: row[mapping.cancellationNote] || '',
        }))
        .filter((t) => t.orderNo && t.date); // Filter out rows without essential data like orderNo

      // Group by orderNo since invoiceId can be blank
      const groupedByOrderNo = rawTransactions.reduce((acc, item) => {
        const key = item.orderNo;
        if (!acc[key]) {
          acc[key] = {
            id: item.orderNo, // Use orderNo as the unique ID for the transaction
            customerName: item.customerName,
            date: item.date,
            itemsCount: 0,
            total: 0,
            status: item.status || 'Completed',
            items: [],
          };
        }
        const itemTotal = item.quantity * item.price - item.discount;
        acc[key].itemsCount += item.quantity;
        // Don't add to total if cancelled
        if (acc[key].status !== 'ยกเลิก') {
          acc[key].total += itemTotal;
        }
        return acc;
      }, {} as { [key: string]: Transaction & { items: RawTransactionRow[] } });

      const summarizedTransactions: Transaction[] = Object.values(
        groupedByOrderNo
      ).map(({ items, ...rest }) => rest);

      // Sort by Order No descending
      const sortedTransactions = summarizedTransactions.sort(
        (a, b) => b.id.localeCompare(a.id, undefined, { numeric: true })
      );

      return sortedTransactions;
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error(
        'Failed to retrieve transaction data from Google Sheets.'
      );
    }
  }
);

const updateTransactionStatusFlow = ai.defineFlow(
  {
    name: 'updateTransactionStatusFlow',
    inputSchema: UpdateTransactionStatusInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async ({ spreadsheetId, orderNo, status, note }) => {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const sheetName = 'ARTRN';

      // 1. Get all data to find row indices
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:Z`, 
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No data found in the sheet.');
      }

      // Find all rows that match the orderNo
      const rowIndicesToUpdate = rows
        .map((row, index) =>
          row[mapping.orderNo] === orderNo ? index + 1 : -1
        )
        .filter((index) => index !== -1);

      if (rowIndicesToUpdate.length === 0) {
        console.warn(`Order number ${orderNo} not found.`);
        return { success: false }; // Or throw an error
      }

      // 2. Prepare batch update request
      const data = rowIndicesToUpdate.map((rowIndex) => ({
        range: `${sheetName}!V${rowIndex}:W${rowIndex}`, // Update Status (V) and Note (W) columns
        values: [[status, note || '']],
      }));

      const batchUpdateRequest = {
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data,
        },
      };

      // 3. Execute batch update
      await sheets.spreadsheets.values.batchUpdate(batchUpdateRequest);

      return { success: true };
    } catch (err) {
      console.error('The API returned an error during status update: ' + err);
      throw new Error('Failed to update transaction status in Google Sheets.');
    }
  }
);
