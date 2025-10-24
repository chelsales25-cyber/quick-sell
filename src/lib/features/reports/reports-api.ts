import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ReportItem } from '@/lib/types';
import { getReportsData } from '@/ai/flows/reports-flow';
import { getDbPromise, REPORTS_STORE } from '@/lib/indexed-db';

const LAST_SYNCED_KEY = 'reports_last_synced';

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Reports'],
  endpoints: (builder) => ({
    getReports: builder.query<ReportItem[], void>({
      async queryFn() {
        try {
          const db = await getDbPromise();
          const cachedReports = await db.getAll(REPORTS_STORE);
          return { data: cachedReports || [] };
        } catch (error: any) {
          console.error('Failed to get reports from IndexedDB:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch from IndexedDB',
            },
          };
        }
      },
      providesTags: ['Reports'],
    }),

    syncReports: builder.mutation<ReportItem[], void>({
      async queryFn() {
        try {
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          const freshReports = await getReportsData(spreadsheetId);

          const db = await getDbPromise();
          const tx = db.transaction(REPORTS_STORE, 'readwrite');
          await Promise.all([
            tx.store.clear(),
            ...freshReports.map((report) => tx.store.put(report)),
            tx.done,
          ]);
          
          localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());

          return { data: freshReports };
        } catch (error: any) {
          console.error('Failed to sync reports:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to sync reports',
            },
          };
        }
      },
      invalidatesTags: ['Reports'],
    }),
  }),
});

export const { useGetReportsQuery, useSyncReportsMutation } = reportsApi;
