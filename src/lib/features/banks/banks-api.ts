import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Bank } from '@/lib/types';
import { getBanksData } from '@/ai/flows/banks-flow';
import { getDbPromise, BANKS_STORE } from '@/lib/indexed-db';

export const banksApi = createApi({
  reducerPath: 'banksApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Banks'],
  endpoints: (builder) => ({
    getBanks: builder.query<Bank[], void>({
      async queryFn() {
        try {
          const db = await getDbPromise();
          const cachedBanks = await db.getAll(BANKS_STORE);
          return { data: cachedBanks || [] };
        } catch (error: any) {
          console.error('Failed to get banks from IndexedDB:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch from IndexedDB',
            },
          };
        }
      },
      providesTags: ['Banks'],
    }),

    syncBanks: builder.mutation<Bank[], void>({
      async queryFn() {
        try {
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          const freshBanks = await getBanksData(spreadsheetId);

          const db = await getDbPromise();
          const tx = db.transaction(BANKS_STORE, 'readwrite');
          await Promise.all([
            tx.store.clear(),
            ...freshBanks.map((bank) => tx.store.put(bank)),
            tx.done,
          ]);

          return { data: freshBanks };
        } catch (error: any) {
          console.error('Failed to sync banks:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to sync banks',
            },
          };
        }
      },
      invalidatesTags: ['Banks'],
    }),
  }),
});

export const { useGetBanksQuery, useSyncBanksMutation } = banksApi;
