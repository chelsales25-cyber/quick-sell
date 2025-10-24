import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Product,
  Warehouse,
  Seller,
  ReportItem,
  Transaction,
  Bank,
  Customer,
  Promotion,
} from './types';

const DB_NAME = 'QuickSellDB';
const DB_VERSION = 8;
export const PRODUCTS_STORE = 'products';
export const WAREHOUSES_STORE = 'warehouses';
export const SELLERS_STORE = 'sellers';
export const REPORTS_STORE = 'reports';
export const TRANSACTIONS_STORE = 'transactions';
export const BANKS_STORE = 'banks';
export const CUSTOMERS_STORE = 'customers';
export const PROMOTIONS_STORE = 'promotions';

interface QuickSellDB extends DBSchema {
  [PRODUCTS_STORE]: {
    key: string;
    value: Product;
    indexes: { 'by-category': string };
  };
  [WAREHOUSES_STORE]: {
    key: string;
    value: Warehouse;
    indexes: { 'by-name': string };
  };
  [SELLERS_STORE]: {
    key: string;
    value: Seller;
    indexes: { 'by-name': string };
  };
  [REPORTS_STORE]: {
    key: string; // Use title as key
    value: ReportItem;
  };
  [TRANSACTIONS_STORE]: {
    key: string; // This will be the invoice ID (TRN_ID)
    value: Transaction;
    indexes: { 'by-date': string };
  };
  [BANKS_STORE]: {
    key: string;
    value: Bank;
    indexes: { 'by-name': string };
  };
  [CUSTOMERS_STORE]: {
    key: string; // Customer ID
    value: Customer;
    indexes: { 'by-name': string };
  };
  [PROMOTIONS_STORE]: {
    key: string; // Promotion Code
    value: Promotion;
    indexes: { 'by-name': string };
  };
}

let dbPromise: Promise<IDBPDatabase<QuickSellDB>> | null = null;

const getDbPromise = () => {
  if (typeof window === 'undefined') {
    // Return a promise that never resolves on the server.
    return new Promise<IDBPDatabase<QuickSellDB>>(() => {});
  }
  if (!dbPromise) {
    dbPromise = openDB<QuickSellDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
            // 'code' is the keyPath for products
            const productStore = db.createObjectStore(PRODUCTS_STORE, {
              keyPath: 'code',
            });
            productStore.createIndex('by-category', 'category');
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(WAREHOUSES_STORE)) {
            db.createObjectStore(WAREHOUSES_STORE, {
              keyPath: 'id',
            });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(SELLERS_STORE)) {
            db.createObjectStore(SELLERS_STORE, {
              keyPath: 'id',
            });
          }
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains(REPORTS_STORE)) {
            db.createObjectStore(REPORTS_STORE, {
              keyPath: 'title',
            });
          }
        }
        if (oldVersion < 5) {
          if (db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
            db.deleteObjectStore(TRANSACTIONS_STORE);
          }
          // The keyPath is 'id', which will store the invoice ID
          const transactionStore = db.createObjectStore(TRANSACTIONS_STORE, {
            keyPath: 'id',
          });
          transactionStore.createIndex('by-date', 'date');
        }
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains(BANKS_STORE)) {
            const bankStore = db.createObjectStore(BANKS_STORE, {
              keyPath: 'code',
            });
            bankStore.createIndex('by-name', 'name');
          }
        }
        if (oldVersion < 7) {
          if (!db.objectStoreNames.contains(CUSTOMERS_STORE)) {
            const customerStore = db.createObjectStore(CUSTOMERS_STORE, {
              keyPath: 'id',
            });
            customerStore.createIndex('by-name', 'name');
          }
        }
        if (oldVersion < 8) {
          if (!db.objectStoreNames.contains(PROMOTIONS_STORE)) {
            const promoStore = db.createObjectStore(PROMOTIONS_STORE, {
              keyPath: 'code',
            });
            promoStore.createIndex('by-name', 'name');
          }
        }
      },
    });
  }
  return dbPromise;
};

export { getDbPromise };
