'use server';
/**
 * @fileOverview Flow for interacting with Google Sheets to get warehouses.
 *
 * - getWarehousesData - A function to retrieve warehouse data from a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { Warehouse } from '@/lib/types';
import { SheetNames } from '@/lib/types';

// Define input schema for the flow
const GetSheetDataInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  range: z.string().describe('The A1 notation of the range to retrieve.'),
});

export async function getWarehousesData(
  spreadsheetId: string
): Promise<Warehouse[]> {
  return getWarehousesDataFlow({ spreadsheetId, range: SheetNames.WAREHOUSES });
}

const getWarehousesDataFlow = ai.defineFlow(
  {
    name: 'getWarehousesDataFlow',
    inputSchema: GetSheetDataInputSchema,
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
        console.log('No warehouse data found.');
        return [];
      }

      // Map data based on column position: A: id, B: name, D: customerId
      const mapping = {
        id: 0, // Column A
        name: 1, // Column B
        customerId: 3, // Column D
      };

      // Skip header row
      const dataRows = rows.slice(1);

      const warehouses: Warehouse[] = dataRows
        .map((row) => ({
          id: row[mapping.id],
          name: row[mapping.name],
          customerId: row[mapping.customerId] || undefined, // Store as undefined if blank
        }))
        .filter((w) => w.id && w.name); // Filter out empty rows

      return warehouses;
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error('Failed to retrieve warehouse data from Google Sheets.');
    }
  }
);
