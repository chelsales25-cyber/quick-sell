'use server';
/**
 * @fileOverview Flow for interacting with Google Sheets to get promotion data.
 *
 * - getPromotionsData - A function to retrieve promotion data from a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { Promotion } from '@/lib/types';
import { SheetNames } from '@/lib/types';

// Define input schema for the flow
const GetSheetDataInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  range: z.string().describe('The A1 notation of the range to retrieve.'),
});

export async function getPromotionsData(
  spreadsheetId: string
): Promise<Promotion[]> {
  return getPromotionsDataFlow({
    spreadsheetId,
    range: SheetNames.PROMOTIONS,
  });
}

const getPromotionsDataFlow = ai.defineFlow(
  {
    name: 'getPromotionsDataFlow',
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
        console.log('No promotion data found.');
        return [];
      }

      // Map data based on column position: A: name, B: code
      const mapping = {
        name: 0,
        code: 1,
      };

      // Skip header row
      const dataRows = rows.slice(1);

      const promotions: Promotion[] = dataRows
        .map((row) => ({
          name: row[mapping.name],
          code: row[mapping.code],
        }))
        .filter((p) => p.name && p.code); // Filter out incomplete rows

      return promotions;
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error('Failed to retrieve promotion data from Google Sheets.');
    }
  }
);
