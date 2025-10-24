'use server';
/**
 * @fileOverview Flow for interacting with Google Sheets to get sellers.
 *
 * - getSellersData - A function to retrieve seller data from a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { Seller } from '@/lib/types';
import { SheetNames } from '@/lib/types';

// Define input schema for the flow
const GetSheetDataInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  range: z.string().describe('The A1 notation of the range to retrieve.'),
  userEmail: z.string().optional().describe('The email of the user to filter sellers.'),
});

export async function getSellersData(
  spreadsheetId: string,
  userEmail?: string
): Promise<Seller[]> {
  return getSellersDataFlow({ spreadsheetId, range: SheetNames.SELLERS, userEmail });
}

const getSellersDataFlow = ai.defineFlow(
  {
    name: 'getSellersDataFlow',
    inputSchema: GetSheetDataInputSchema,
  },
  async ({ spreadsheetId, range, userEmail }) => {
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
        console.log('No seller data found.');
        return [];
      }

      // Map data based on column position: A: id, B: name, C: email
      const mapping = {
        id: 0,   // Column A
        name: 1, // Column B
        email: 2,// Column C
      };

      // Skip header row
      const dataRows = rows.slice(1);

      let sellers: Seller[] = dataRows.map((row) => ({
        id: row[mapping.id],
        name: row[mapping.name],
        email: row[mapping.email],
      })).filter(s => s.id && s.name); // Filter out rows without id or name

      // If userEmail is provided, filter sellers by it
      if (userEmail) {
        sellers = sellers.filter(s => s.email === userEmail);
      }

      return sellers;
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error('Failed to retrieve seller data from Google Sheets.');
    }
  }
);
