import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Seller } from '@/lib/types';
import { getSellersData } from '@/ai/flows/sellers-flow';
import { getDbPromise, SELLERS_STORE } from '@/lib/indexed-db';

const LAST_SYNCED_KEY = 'sellers_last_synced';

export const sellersApi = createApi({
  reducerPath: 'sellersApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Sellers'],
  endpoints: (builder) => ({
    getSellers: builder.query<Seller[], void>({
      async queryFn() {
        try {
          const db = await getDbPromise();
          const cachedSellers = await db.getAll(SELLERS_STORE);
          return { data: cachedSellers || [] };
        } catch (error: any) {
          console.error('Failed to get sellers from IndexedDB:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch from IndexedDB',
            },
          };
        }
      },
      providesTags: ['Sellers'],
    }),

    // Make the argument optional for syncSellers
    syncSellers: builder.mutation<Seller[], { userEmail?: string } | void>({
      async queryFn(arg) {
        // Correctly get userEmail if it exists
        const userEmail = (arg && 'userEmail' in arg) ? arg.userEmail : undefined;
        try {
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          // Pass userEmail (which can be undefined) to the flow
          const freshSellers = await getSellersData(spreadsheetId, userEmail);

          const db = await getDbPromise();
          const tx = db.transaction(SELLERS_STORE, 'readwrite');
          await Promise.all([
            tx.store.clear(),
            ...freshSellers.map((seller) => tx.store.put(seller)),
            tx.done,
          ]);
          
          localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());

          return { data: freshSellers };
        } catch (error: any) {
          console.error('Failed to sync sellers:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to sync sellers',
            },
          };
        }
      },
      invalidatesTags: ['Sellers'],
    }),
  }),
});

export const { useGetSellersQuery, useSyncSellersMutation } = sellersApi;
