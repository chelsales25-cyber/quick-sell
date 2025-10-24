import { configureStore } from '@reduxjs/toolkit';
import { productsApi } from './features/products/products-api';
import { salesApi } from './features/sales/sales-api';
import { warehousesApi } from './features/warehouses/warehouses-api';
import { sellersApi } from './features/sellers/sellers-api';
import { reportsApi } from './features/reports/reports-api';
import { transactionsApi } from './features/transactions/transactions-api';
import { banksApi } from './features/banks/banks-api';
import { customersApi } from './features/customers/customers-api';
import { promotionsApi } from './features/promotions/promotions-api';
import { usersApi } from './features/users/users-api';

export const makeStore = () => {
  return configureStore({
    reducer: {
      [productsApi.reducerPath]: productsApi.reducer,
      [salesApi.reducerPath]: salesApi.reducer,
      [warehousesApi.reducerPath]: warehousesApi.reducer,
      [sellersApi.reducerPath]: sellersApi.reducer,
      [reportsApi.reducerPath]: reportsApi.reducer,
      [transactionsApi.reducerPath]: transactionsApi.reducer,
      [banksApi.reducerPath]: banksApi.reducer,
      [customersApi.reducerPath]: customersApi.reducer,
      [promotionsApi.reducerPath]: promotionsApi.reducer,
      [usersApi.reducerPath]: usersApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // Recommended to turn off serialization checks for redux-persist, but good to have for dev
        serializableCheck: false,
      }).concat(
        productsApi.middleware,
        salesApi.middleware,
        warehousesApi.middleware,
        sellersApi.middleware,
        reportsApi.middleware,
        transactionsApi.middleware,
        banksApi.middleware,
        customersApi.middleware,
        promotionsApi.middleware,
        usersApi.middleware
      ),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
