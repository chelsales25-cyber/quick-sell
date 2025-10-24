import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import StoreProvider from '@/lib/StoreProvider';
import { Suspense } from 'react';

const APP_NAME = 'QuickSell';
const APP_DESCRIPTION =
  'Streamline your sales with automatic Google Sheet integration.';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='th' suppressHydrationWarning>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        <link
          href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
          rel='stylesheet'
        />
      </head>
      <body className='font-body antialiased'>
        <Suspense
          fallback={
            <div className='flex flex-col items-center justify-center h-screen bg-[#f5f8ff]'>
              <img
                src='/icons/192.png'
                alt='logo'
                className='w-16 h-16 mb-4 animate-bounce'
              />
              <div className='text-lg text-[#2563eb] font-semibold'>
                กำลังโหลดแอพ...
              </div>
            </div>
          }
        >
          <StoreProvider>
            {children}
            <Toaster />
          </StoreProvider>
        </Suspense>
      </body>
    </html>
  );
}
