'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LoginForm } from '@/components/auth/login-form';
import { Sheet, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is logged in, redirect to dashboard
        router.push('/dashboard');
      } else {
        // User is not logged in, allow rendering the login page
        setIsLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <main className='flex min-h-screen flex-col items-center justify-center bg-background p-4'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='h-12 w-12 animate-spin text-primary' />
          <p className='mt-4 text-muted-foreground'>กำลังตรวจสอบสถานะ...</p>
        </div>
      </main>
    );
  }

  return (
    <main className='flex min-h-screen flex-col items-center justify-center bg-background p-4'>
      <div className='flex flex-col items-center gap-4 mb-8'>
        <div className='rounded-lg p-3'>
          <img src='/icons/512.png' alt='logo' className='h-20 w-20' />
        </div>
        <h1 className='text-4xl font-bold text-primary'>QuickSell</h1>
        <p className='text-muted-foreground'>Log in to manage your sales.</p>
      </div>
      <LoginForm />
    </main>
  );
}
