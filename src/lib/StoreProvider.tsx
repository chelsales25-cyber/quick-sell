'use client';
import type { AppStore } from '@/lib/store';
import { makeStore } from '@/lib/store';
import { useRef, type ReactNode } from 'react';
import { Provider } from 'react-redux';

interface StoreProviderProps {
  children: ReactNode;
}

const StoreProvider = ({ children }: StoreProviderProps) => {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
};

export default StoreProvider;
