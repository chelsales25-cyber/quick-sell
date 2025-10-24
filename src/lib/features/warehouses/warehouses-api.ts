import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Warehouse } from '@/lib/types';
import { getWarehousesData } from '@/ai/flows/warehouses-flow';
import { getDbPromise, WAREHOUSES_STORE } from '@/lib/indexed-db';

const LAST_SYNCED_KEY = 'warehouses_last_synced';

export const warehousesApi = createApi({
  reducerPath: 'warehousesApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Warehouses'],
  endpoints: (builder) => ({
    getWarehouses: builder.query<Warehouse[], void>({
      async queryFn() {
        try {
          const db = await getDbPromise();
          const cachedWarehouses = await db.getAll(WAREHOUSES_STORE);
          return { data: cachedWarehouses || [] };
        } catch (error: any) {
          console.error('Failed to get warehouses from IndexedDB:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch from IndexedDB',
            },
          };
        }
      },
      providesTags: ['Warehouses'],
    }),

    syncWarehouses: builder.mutation<Warehouse[], void>({
      async queryFn() {
        try {
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          const freshWarehouses = await getWarehousesData(spreadsheetId);

          const db = await getDbPromise();
          const tx = db.transaction(WAREHOUSES_STORE, 'readwrite');
          await Promise.all([
            tx.store.clear(),
            ...freshWarehouses.map((warehouse) => tx.store.put(warehouse)),
            tx.done,
          ]);

          localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());

          return { data: freshWarehouses };
        } catch (error: any) {
          console.error('Failed to sync warehouses:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to sync warehouses',
            },
          };
        }
      },
      invalidatesTags: ['Warehouses'],
    }),
  }),
});

export const { useGetWarehousesQuery, useSyncWarehousesMutation } = warehousesApi;
