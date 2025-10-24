'use server';
/**
 * @fileOverview Flow for interacting with Google Sheets.
 *
 * - getSheetData - A function to retrieve data from a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { Product } from '@/lib/types';
import { SheetNames } from '@/lib/types';

// Define input schema for the flow
const GetProductDataInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  range: z.string().describe('The A1 notation of the range to retrieve.'),
});

export async function getProductData(
  spreadsheetId: string,
  range: string = SheetNames.PRODUCTS
): Promise<Product[]> {
  return getProductDataFlow({ spreadsheetId, range });
}

const getProductDataFlow = ai.defineFlow(
  {
    name: 'getProductDataFlow',
    inputSchema: GetProductDataInputSchema,
    // We will manually transform the output, so we don't define an output schema here.
  },
  async ({ spreadsheetId, range }) => {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        console.log('No data found.');
        return [];
      }

      // แมพข้อมูลตามตำแหน่งคอลัมน์ (A, B, C, ...)
      // กำหนด mapping ตำแหน่งคอลัมน์ให้ตรงกับ Product
      const mapping = {
        code: 0, // คอลัมน์ A
        name: 1, // คอลัมน์ B
        price: 2, // คอลัมน์ C
        category: 3, // คอลัมน์ D
        unit: 4, // คอลัมน์ E
        brand: 5, // คอลัมน์ F
      };

      // ข้ามหัวตารางภาษาไทย
      const dataRows = rows.slice(1);

      const products: Product[] = dataRows
        // Filter out any products that do not have a valid 'code'
        .filter((row) => row && row[mapping.code])
        .map(
          (row) =>
            ({
              code: row[mapping.code] || '',
              name: row[mapping.name] || '',
              price: parseFloat(row[mapping.price]) || 0,
              category: row[mapping.category] || '',
              unit: row[mapping.unit] ? String(row[mapping.unit]) : '',
              brand: row[mapping.brand] || '',
            } as Product)
        );

      return products;
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error('Failed to retrieve data from Google Sheets.');
    }
  }
);
