'use client';
import {createApi, fakeBaseQuery} from '@reduxjs/toolkit/query/react';
import type {SaveSaleInput} from '@/lib/types';
import {saveSaleTransaction} from '@/ai/flows/sales-flow';

export type SaleData = SaveSaleInput;

export const salesApi = createApi({
  reducerPath: 'salesApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Transactions'],
  endpoints: (builder) => ({
    saveSale: builder.mutation<{success: boolean}, SaleData>({
      async queryFn(saleData) {
        try {
          const result = await saveSaleTransaction(saleData);
          return {data: result};
        } catch (error: any) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error.message || 'Failed to save sale to Google Sheets',
            },
          };
        }
      },
      // After a sale is saved, the transactions list is stale.
      // Invalidate the 'Transactions' tag to force a refetch.
      invalidatesTags: ['Transactions'],
    }),
  }),
});

export const {useSaveSaleMutation} = salesApi;
