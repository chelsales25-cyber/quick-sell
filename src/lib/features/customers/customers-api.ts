import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Customer } from '@/lib/types';
import { getCustomersData, addCustomer, type AddCustomerInput } from '@/ai/flows/customers-flow';
import { getDbPromise, CUSTOMERS_STORE } from '@/lib/indexed-db';

export const customersApi = createApi({
  reducerPath: 'customersApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Customers'],
  endpoints: (builder) => ({
    getCustomers: builder.query<Customer[], void>({
      async queryFn() {
        try {
          const db = await getDbPromise();
          const cachedData = await db.getAll(CUSTOMERS_STORE);
          return { data: cachedData || [] };
        } catch (error: any) {
          console.error('Failed to get customers from IndexedDB:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to fetch from IndexedDB',
            },
          };
        }
      },
      providesTags: ['Customers'],
    }),

    syncCustomers: builder.mutation<Customer[], void>({
      async queryFn() {
        try {
          const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID!;
          const freshData = await getCustomersData(spreadsheetId);

          const db = await getDbPromise();
          const tx = db.transaction(CUSTOMERS_STORE, 'readwrite');
          await Promise.all([
            tx.store.clear(),
            ...freshData.map((customer) => tx.store.put(customer)),
            tx.done,
          ]);

          return { data: freshData };
        } catch (error: any) {
          console.error('Failed to sync customers:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error.message || 'Failed to sync customers',
            },
          };
        }
      },
      invalidatesTags: ['Customers'],
    }),

    addCustomer: builder.mutation<{ success: boolean, newCustomerId: string }, AddCustomerInput>({
        async queryFn(newCustomer) {
            try {
                const result = await addCustomer(newCustomer);
                return { data: result };
            } catch (error: any) {
                console.error('Failed to add customer:', error);
                return {
                    error: {
                        status: 'CUSTOM_ERROR',
                        error: error.message || 'Failed to save customer',
                    },
                };
            }
        },
        // We will manually trigger a sync from the component instead of just invalidating.
        // This ensures the data is fresh after adding.
    }),

  }),
});

export const { useGetCustomersQuery, useSyncCustomersMutation, useAddCustomerMutation } = customersApi;
