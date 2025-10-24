'use server';
/**
 * @fileOverview Flow for interacting with Google Sheets to get report data.
 *
 * - getReportsData - A function to retrieve report data from a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { ReportItem } from '@/lib/types';
import { SheetNames, type SheetName } from '@/lib/types';
import { iconMap } from '@/components/icons';
import { getGoogleAuth } from '@/lib/google-auth';

// Define input schema for the flow
const GetSheetDataInputSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the Google Sheet.'),
  range: z.string().describe('The A1 notation of the range to retrieve.'),
});

export async function getReportsData(
  spreadsheetId: string
): Promise<ReportItem[]> {
  return getReportsDataFlow({ spreadsheetId, range: SheetNames.REPORT });
}

const getReportsDataFlow = ai.defineFlow(
  {
    name: 'getReportsDataFlow',
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
        console.log('No report data found.');
        return [];
      }

      // Map data based on column position
      const mapping = {
        title: 0, // Column A
        value: 1, // Column B
        description: 2, // Column C
        icon: 3, // Column D
      };

      const validIconNames = Object.keys(iconMap);

      // Skip header row
      const dataRows = rows.slice(1);

      const reports: ReportItem[] = dataRows
        .map((row) => {
          const iconName = row[mapping.icon] || 'DollarSign'; // Default icon
          return {
            title: row[mapping.title],
            value: row[mapping.value],
            description: row[mapping.description],
            // Ensure the icon name from the sheet is a valid one we can render
            icon: validIconNames.includes(iconName) ? iconName : 'DollarSign',
          };
        })
        .filter((r) => r.title && r.value); // Filter out empty rows

      return reports;
    } catch (err) {
      console.error('The API returned an error: ' + err);
      throw new Error('Failed to retrieve report data from Google Sheets.');
    }
  }
);
