'use server';
/**
 * @fileOverview Flow for interacting with Google Sheets to get and add customer data.
 *
 * - getCustomersData - A function to retrieve customer data from the 'AR' sheet.
 * - addCustomer - A function to add a new customer to the 'AR' sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { Customer } from '@/lib/types';
import { SheetNames } from '@/lib/types';
import { getGoogleAuth } from '@/lib/google-auth';

const GetSheetDataInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  range: z.string().describe('The A1 notation of the range to retrieve.'),
});

// Remove 'id' from the input schema as it will be auto-generated.
const AddCustomerInputSchema = z.object({
  name: z.string(),
  phone: z.string(),
  address: z.string(),
});
export type AddCustomerInput = z.infer<typeof AddCustomerInputSchema>;

export async function getCustomersData(
  spreadsheetId: string
): Promise<Customer[]> {
  return getCustomersDataFlow({ spreadsheetId, range: SheetNames.CUSTOMERS });
}

export async function addCustomer(
  input: AddCustomerInput
): Promise<{ success: boolean; newCustomerId: string }> {
  return addCustomerFlow(input);
}

const getCustomersDataFlow = ai.defineFlow(
  {
    name: 'getCustomersDataFlow',
    inputSchema: GetSheetDataInputSchema,
  },
  async ({ spreadsheetId, range }) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        console.log('No customer data found.');
        return [];
      }

      // Mapping for AR sheet: A:รหัสลูกค้า, B:ชื่อลูกค้า, C:เบอร์โทร, D:ที่อยู่
      const mapping = {
        id: 0,
        name: 1,
        phone: 2,
        address: 3,
      };

      // Skip header row
      const dataRows = rows.slice(1);

      const customers: Customer[] = dataRows
        .map((row) => ({
          id: row[mapping.id],
          name: row[mapping.name],
          phone: row[mapping.phone] || '',
          address: row[mapping.address] || '',
        }))
        .filter((c) => c.id && c.name); // Filter out incomplete rows

      return customers;
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error('Failed to retrieve customer data from Google Sheets.');
    }
  }
);

const addCustomerFlow = ai.defineFlow(
  {
    name: 'addCustomerFlow',
    inputSchema: AddCustomerInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      newCustomerId: z.string(),
    }),
  },
  async (customerData) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
      const range = SheetNames.CUSTOMERS; // e.g., 'AR!A:D'

      // 1. Get all customer data to determine the next ID
      const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'AR!A:A', // Only need the ID column
      });

      const rows = getResponse.data.values;
      let lastIdNumber = 0;
      if (rows && rows.length > 1) {
        // Find the last valid customer ID
        const lastRow = rows[rows.length - 1];
        if (lastRow && lastRow[0]) {
          const lastId = lastRow[0]; // e.g., "CUS-0050"
          const match = lastId.match(/CUS-(\d+)/);
          if (match && match[1]) {
            lastIdNumber = parseInt(match[1], 10);
          }
        }
      }

      const newIdNumber = lastIdNumber + 1;
      const newCustomerId = `CS${String(newIdNumber).padStart(4, '0')}`;

      // 2. Prepare the new row with the generated ID
      const values = [
        [
          newCustomerId,
          customerData.name,
          customerData.phone,
          customerData.address,
        ],
      ];

      // 3. Append the new row to the sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });

      return { success: true, newCustomerId: newCustomerId };
    } catch (err) {
      console.error('The API returned an error while adding customer: ' + err);
      throw new Error('Failed to save customer data to Google Sheets.');
    }
  }
);
