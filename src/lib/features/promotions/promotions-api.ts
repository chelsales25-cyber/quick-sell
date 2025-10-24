import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Promotion } from '@/lib/types';
import { getPromotionsData } from '@/ai/flows/promotions-flow';
import { getDbPromise, PROMOTIONS_STORE } from '@/lib/indexed-db';

export const promotionsApi = createApi({
  reducerPath: 'promotionsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Promotions'],
  endpoints: (builder) => ({
    getPromotions: builder.query<Promotion[], void>({
      async queryFn() {
        try {
          const db = await getDbPromise();
          const cachedData = await db.getAll(PROMOTIONS_STORE);
          return { data: cachedData || [] };
        } catch (error: any) {
          console.error('Failed to get promotions from IndexedDB:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch promotions from IndexedDB',
            },
          };
        }
      },
      providesTags: ['Promotions'],
    }),

    syncPromotions: builder.mutation<Promotion[], void>({
      async queryFn() {
        try {
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          const freshData = await getPromotionsData(spreadsheetId);

          const db = await getDbPromise();
          const tx = db.transaction(PROMOTIONS_STORE, 'readwrite');
          await Promise.all([
            tx.store.clear(),
            ...freshData.map((promo) => tx.store.put(promo)),
            tx.done,
          ]);

          return { data: freshData };
        } catch (error: any) {
          console.error('Failed to sync promotions:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to sync promotions',
            },
          };
        }
      },
      invalidatesTags: ['Promotions'],
    }),
  }),
});

export const { useGetPromotionsQuery, useSyncPromotionsMutation } = promotionsApi;
