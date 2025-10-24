'use server';
/**
 * @fileOverview Flow for interacting with Google Sheets to get bank data.
 *
 * - getBanksData - A function to retrieve bank data from a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { Bank } from '@/lib/types';
import { SheetNames } from '@/lib/types';

// Define input schema for the flow
const GetSheetDataInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  range: z.string().describe('The A1 notation of the range to retrieve.'),
});

export async function getBanksData(spreadsheetId: string): Promise<Bank[]> {
  return getBanksDataFlow({ spreadsheetId, range: SheetNames.BANKS });
}

const getBanksDataFlow = ai.defineFlow(
  {
    name: 'getBanksDataFlow',
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
        console.log('No bank data found.');
        return [];
      }

      // Map data based on column position: A: code, B: name, C: bank_no
      const mapping = {
        code: 0,
        name: 1,
        bank_no: 2,
      };

      // Skip header row
      const dataRows = rows.slice(1);

      const banks: Bank[] = dataRows
        .map((row) => ({
          code: row[mapping.code],
          name: row[mapping.name],
          bank_no: row[mapping.bank_no],
        }))
        .filter((b) => b.code && b.name && b.bank_no); // Filter out incomplete rows

      return banks;
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error('Failed to retrieve bank data from Google Sheets.');
    }
  }
);
