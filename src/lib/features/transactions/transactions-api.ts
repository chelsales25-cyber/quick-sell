
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Transaction, TransactionDetail } from '@/lib/types';
import {
  getTransactionsData,
  getTransactionDetails,
  updateTransactionStatus,
} from '@/ai/flows/transactions-flow';
import { getDbPromise, TRANSACTIONS_STORE } from '@/lib/indexed-db';

const LAST_SYNCED_KEY = 'transactions_last_synced';

export const transactionsApi = createApi({
  reducerPath: 'transactionsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Transactions', 'TransactionDetail'],
  endpoints: (builder) => ({
    getTransactions: builder.query<Transaction[], void>({
      async queryFn() {
        try {
          const db = await getDbPromise();
          const cachedTransactions = await db.getAll(TRANSACTIONS_STORE);
          // The flow now pre-sorts, but sorting again client-side is a good safeguard.
          const sorted = cachedTransactions.sort((a, b) => {
            // Handle potential invalid date strings from sheets
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;
            return dateB - dateA;
          });
          return { data: sorted || [] };
        } catch (error: any) {
          console.error('Failed to get transactions from IndexedDB:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch from IndexedDB',
            },
          };
        }
      },
      providesTags: ['Transactions'],
    }),

    syncTransactions: builder.mutation<
      Transaction[],
      { sellerId?: string } | void
    >({
      async queryFn(arg) {
        try {
          const sellerId =
            arg && 'sellerId' in arg ? arg.sellerId : undefined;

          // 1. Fetch and process data from the Google Sheet via the Genkit flow
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          const freshTransactions = await getTransactionsData(
            spreadsheetId,
            sellerId
          );

          // 2. Update IndexedDB with the fresh, summarized data.
          const db = await getDbPromise();
          const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
          
          // Clear the store first to ensure replacement, not merging.
          await tx.store.clear();

          // Put all new transactions into the store.
          await Promise.all(
            freshTransactions.map((transaction) =>
              tx.store.put(transaction)
            )
          );

          await tx.done;


          // 3. Update the last synced timestamp in localStorage.
          localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());

          return { data: freshTransactions };
        } catch (error: any) {
          console.error('Failed to sync transactions:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to sync transactions',
            },
          };
        }
      },
      invalidatesTags: ['Transactions'],
    }),

    getTransactionDetails: builder.query<TransactionDetail | null, string>({
      async queryFn(orderNo) {
        try {
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          const details = await getTransactionDetails(spreadsheetId, orderNo);
          return { data: details };
        } catch (error: any) {
          console.error('Failed to get transaction details:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch transaction details',
            },
          };
        }
      },
      providesTags: (result, error, id) => [{ type: 'TransactionDetail', id }],
    }),

    updateTransactionStatus: builder.mutation<{ success: boolean }, { orderNo: string, status: string, note?: string }>({
        async queryFn({ orderNo, status, note }) {
            try {
                const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
                const result = await updateTransactionStatus(spreadsheetId, orderNo, status, note);
                return { data: result };
            } catch (error: any) {
                return {
                    error: {
                        status: 'CUSTOM_ERROR',
                        error: error.message || 'Failed to update transaction status',
                    },
                };
            }
        },
        invalidatesTags: ['Transactions', 'TransactionDetail'],
    }),

  }),
});

export const {
  useGetTransactionsQuery,
  useSyncTransactionsMutation,
  useGetTransactionDetailsQuery,
  useUpdateTransactionStatusMutation,
} = transactionsApi;
