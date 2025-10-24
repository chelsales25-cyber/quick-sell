import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Product } from '@/lib/types';
import { getProductData } from '@/ai/flows/products-flow';
import { getDbPromise, PRODUCTS_STORE } from '@/lib/indexed-db';
import { SheetNames } from '@/lib/types';

const LAST_SYNCED_KEY = 'products_last_synced';

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Products'],
  endpoints: (builder) => ({
    // This query now ONLY reads from IndexedDB for maximum speed.
    getProducts: builder.query<Product[], void>({
      async queryFn() {
        try {
          const db = await getDbPromise();
          const cachedProducts = await db.getAll(PRODUCTS_STORE);
          return { data: cachedProducts || [] };
        } catch (error: any) {
          console.error('Failed to get products from IndexedDB:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch from IndexedDB',
            },
          };
        }
      },
      providesTags: ['Products'],
    }),

    // This mutation handles the manual sync process.
    syncProducts: builder.mutation<Product[], void>({
      async queryFn(_arg, _queryApi, _extraOptions, _baseQuery) {
        try {
          // 1. Fetch fresh data from the Google Sheet.
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          const freshProducts = await getProductData(
            spreadsheetId,
            SheetNames.PRODUCTS
          );

          // 2. Update IndexedDB with the fresh data.
          const db = await getDbPromise();
          const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
          await Promise.all([
            tx.store.clear(), // Clear old data
            ...freshProducts.map((product) => tx.store.put(product)),
            tx.done,
          ]);

          // 3. Update the last synced timestamp in localStorage.
          localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());

          return { data: freshProducts };
        } catch (error: any) {
          console.error('Failed to sync products:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to sync products',
            },
          };
        }
      },
      // When sync is successful, invalidate the 'Products' tag.
      // This tells the `getProducts` query to refetch its data (from IndexedDB).
      invalidatesTags: ['Products'],
    }),
  }),
});

export const { useGetProductsQuery, useSyncProductsMutation } = productsApi;
