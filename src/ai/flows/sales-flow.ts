'use server';
/**
 * @fileOverview Flow for saving sales transactions to Google Sheets.
 *
 * - saveSaleTransaction - A function to save a completed sale.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { SaveSaleInput, SaveSaleInputSchema, SheetNames } from '@/lib/types';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { getGoogleAuth } from '@/lib/google-auth';
export async function saveSaleTransaction(
  input: SaveSaleInput
): Promise<{ success: boolean }> {
  return saveSaleTransactionFlow(input);
}

const saveSaleTransactionFlow = ai.defineFlow(
  {
    name: 'saveSaleTransactionFlow',
    inputSchema: SaveSaleInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (saleData) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
      const range = SheetNames.TRANSACTIONS;

      const orderNo = `SALE-${String(Date.now()).slice(-10)}`; // Generate unique 10-digit order number

      const rows = saleData.items.map((item) => [
        '', // A: invoice no
        orderNo, // B: อ้างอิง
        `'${saleData.transactionDate}`, // C: วันที่
        saleData.customer.id || '', // D: รหัสลูกค้าCode Customer
        saleData.seller, // E: รหัสพนักงาน (seller id)
        saleData.warehouse, // F: รหัสคลังสินค้า
        item.id, // G: รหัสสินค้า
        item.quantity, // H: จำนวน
        '', // I: หน่วยนับ
        item.price, // J: ราคาต่อหน่วย
        item.discount || '', // K: ส่วนลด
        '', // L: ราคาเต็ม
        '', // M: vat
        '', // N: รวมทั้งสิ้น
        item.promoCode || '', // O: รหัสโปรโมชั่น
        '', // P: NEXT
        '', // Q: ชื่อพนักงาน
        saleData.customer.name || '', // R: ชื่อลูกค้า
        saleData.customer.phone || '', // S: เบอร์โทร
        saleData.customer.address || '', // T: ที่อยู่ลูกค้า
        saleData.paymentMethod, // U: ช่องทางการชำระเงิน
        'Completed', // V: สถานะ
        '', // W: หมายเหตุ
        item.name, // X: ชื่อสินค้า
        '', // Y: (ว่าง)
        item.parentCode || '', // Z: parent item code
      ]);
      const emptyRow = Array(rows[0].length).fill('-'); // สร้างแถวว่างที่มีจำนวนคอลัมน์เท่ากับ rows จริง
      const values = [emptyRow, ...rows]; // เพิ่มแถวว่างไว้ข้างบน

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      });

      return { success: true };
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error('Failed to save data to Google Sheets.');
    }
  }
);
