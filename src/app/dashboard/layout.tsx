'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  PlusCircle,
  LogOut,
  User as UserIcon,
  Loader2,
  RefreshCw,
  Mail,
  Sheet,
  Users,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

import { useSyncProductsMutation } from '@/lib/features/products/products-api';
import { useSyncTransactionsMutation } from '@/lib/features/transactions/transactions-api';
import { useSyncWarehousesMutation } from '@/lib/features/warehouses/warehouses-api';
import { useSyncSellersMutation } from '@/lib/features/sellers/sellers-api';
import { SyncAllOverlay } from '@/components/dashboard/sync-all-overlay';
import { useSyncCustomersMutation } from '@/lib/features/customers/customers-api';
import { useSyncPromotionsMutation } from '@/lib/features/promotions/promotions-api';
import { useSyncBanksMutation } from '@/lib/features/banks/banks-api';

const LAST_SYNCED_ALL_KEY = 'all_data_last_synced';
const SELLER_STORAGE_KEY = 'selectedSeller';
const SESSION_SYNCED_KEY = 'session_synced';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const isActive = (path: string) => pathname === path;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [lastSyncedAll, setLastSyncedAll] = useState<string | null>(null);

  // --- Sync Mutations ---
  const [syncProducts] = useSyncProductsMutation();
  const [syncTransactions] = useSyncTransactionsMutation();
  const [syncWarehouses] = useSyncWarehousesMutation();
  const [syncSellers] = useSyncSellersMutation();
  const [syncCustomers] = useSyncCustomersMutation();
  const [syncPromotions] = useSyncPromotionsMutation();
  const [syncBanks] = useSyncBanksMutation();

  // ----------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false); // Set loading to false once auth state is resolved
    });
    const savedTime = localStorage.getItem(LAST_SYNCED_ALL_KEY);
    if (savedTime) {
      setLastSyncedAll(savedTime);
    }
    return () => unsubscribe();
  }, []);

  // --- Auto-sync after login ---
  useEffect(() => {
    const performInitialSync = async () => {
      if (user && user.email) {
        // Check if sync has already been done for this session
        const hasSyncedThisSession = sessionStorage.getItem(SESSION_SYNCED_KEY);
        if (!hasSyncedThisSession) {
          setIsSyncingAll(true);
          try {
            // 1. Sync sellers first and wait for it to complete.
            const sellersPayload = await syncSellers({
              userEmail: user.email,
            }).unwrap();

            // Set first seller as default if one exists
            const firstSellerId = sellersPayload?.[0]?.id;
            if (firstSellerId) {
              localStorage.setItem(SELLER_STORAGE_KEY, firstSellerId);
            } else {
              toast({
                variant: 'destructive',
                title: 'ไม่พบข้อมูลผู้ขาย',
                description:
                  'ไม่พบข้อมูลผู้ขายที่ผูกกับอีเมลของคุณใน Google Sheet',
              });
              setIsSyncingAll(false);
              sessionStorage.setItem(SESSION_SYNCED_KEY, 'true'); // Mark as tried
              return; // Stop if no seller found
            }

            // 2. Sync other data in parallel.
            await Promise.all([
              syncProducts(),
              syncTransactions({ sellerId: firstSellerId }),
              syncWarehouses(),
            ]);

            const newTime = new Date().toISOString();
            localStorage.setItem(LAST_SYNCED_ALL_KEY, newTime);
            setLastSyncedAll(newTime);

            toast({
              title: 'ซิงค์ข้อมูลอัตโนมัติสำเร็จ',
              description: 'ข้อมูลทั้งหมดเป็นปัจจุบันแล้ว',
            });

            // 3. Mark sync as completed for this session.
            sessionStorage.setItem(SESSION_SYNCED_KEY, 'true');
          } catch (error) {
            console.error('Failed to perform initial sync:', error);
            toast({
              variant: 'destructive',
              title: 'การซิงค์อัตโนมัติล้มเหลว',
              description: 'โปรดลองซิงค์ข้อมูลด้วยตนเอง',
            });
          } finally {
            setIsSyncingAll(false);
          }
        }
      }
    };
    performInitialSync();
  }, [
    user,
    syncSellers,
    syncProducts,
    syncTransactions,
    syncWarehouses,
    syncCustomers,
    syncPromotions,
    syncBanks,
    toast,
  ]);

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem(SESSION_SYNCED_KEY); // Clear session sync flag on logout
      toast({
        title: 'ออกจากระบบสำเร็จ',
        description: 'กำลังกลับไปยังหน้าล็อกอิน...',
      });
      router.push('/');
    } catch (error) {
      console.error('Error signing out: ', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถออกจากระบบได้ กรุณาลองอีกครั้ง',
      });
    }
  };

  const handleSyncAll = async () => {
    if (!user?.email) {
      toast({
        variant: 'destructive',
        title: 'การซิงค์ล้มเหลว',
        description: 'ไม่สามารถระบุผู้ใช้ได้ กรุณาล็อกอินอีกครั้ง',
      });
      return;
    }

    const sellerId = localStorage.getItem(SELLER_STORAGE_KEY);
    if (!sellerId) {
      toast({
        variant: 'destructive',
        title: 'ไม่พบผู้ขาย',
        description: 'กรุณาเลือกผู้ขายในหน้าขายก่อนซิงค์ข้อมูลทั้งหมด',
      });
      return;
    }

    setIsSyncingAll(true);
    try {
      // Run all sync operations in parallel
      await Promise.all([
        syncProducts(),
        syncTransactions({ sellerId }),
        syncWarehouses(),
        syncSellers({ userEmail: user.email }),
        syncCustomers(),
        syncPromotions(),
        syncBanks(),
      ]);

      const newTime = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_ALL_KEY, newTime);
      setLastSyncedAll(newTime);

      toast({
        title: 'ซิงค์ข้อมูลทั้งหมดสำเร็จ',
        description: 'ข้อมูลในแอปพลิเคชันเป็นปัจจุบันแล้ว',
      });
    } catch (error) {
      console.error('Failed to sync all data:', error);
      toast({
        variant: 'destructive',
        title: 'การซิงค์ล้มเหลว',
        description: 'โปรดตรวจสอบการเชื่อมต่อและลองอีกครั้ง',
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const renderLastSyncedAll = () => {
    if (!lastSyncedAll) {
      return 'ยังไม่เคยซิงค์';
    }
    return `ซิงค์ล่าสุดเมื่อ ${formatDistanceToNow(new Date(lastSyncedAll), {
      addSuffix: true,
      locale: th,
    })}`;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center h-full w-full pt-20'>
          <div className='flex flex-col items-center gap-4'>
            <Loader2 className='h-12 w-12 animate-spin text-primary' />
            <p className='mt-4 text-muted-foreground'>
              กำลังตรวจสอบข้อมูลผู้ใช้...
            </p>
          </div>
        </div>
      );
    }

    if (user) {
      return children;
    }

    return (
      <div className='flex items-center justify-center h-full w-full pt-20'>
        <div className='max-w-sm w-full bg-card rounded-lg shadow p-6 text-center'>
          <h3 className='text-lg font-semibold mb-2'>กรุณาเข้าสู่ระบบ</h3>
          <p className='text-muted-foreground mb-4'>
            คุณยังไม่ได้เข้าสู่ระบบ
            กรุณากลับไปที่หน้าแรกเพื่อเข้าสู่ระบบก่อนใช้งาน
          </p>
          <Button asChild className='w-full'>
            <Link href='/'>กลับไปหน้าแรก</Link>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className='flex min-h-screen w-full flex-col bg-muted'>
      <SyncAllOverlay isLoading={isSyncingAll} />
      <div className='mx-auto w-full max-w-lg flex-1 bg-background'>
        <header className='sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-card px-4'>
          <div className='flex items-center gap-2'>
            <div className='rounded-lg  p-2'>
              <img src='/icons/192.png' alt='logo' className='h-10 w-10' />
            </div>
            <h2 className='text-xl font-semibold text-foreground'>QuickSell</h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
                <Avatar className='h-8 w-8'>
                  <AvatarFallback>
                    <UserIcon className='h-5 w-5' />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-56' align='end' forceMount>
              <DropdownMenuLabel className='font-normal'>
                <div className='flex flex-col space-y-2'>
                  <div className='flex items-center gap-2'>
                    <UserIcon className='h-4 w-4 text-muted-foreground' />
                    <p className='text-sm font-medium leading-none'>ผู้ใช้</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Mail className='h-4 w-4 text-muted-foreground' />
                    <p className='text-xs leading-none text-muted-foreground truncate'>
                      {user ? user.email : 'กำลังโหลด...'}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />{' '}
              {isAdmin && (
                <>
                  <DropdownMenuItem asChild className='cursor-pointer'>
                    <a
                      href={process.env.NEXT_PUBLIC_SHEET_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <Sheet className='mr-2 h-4 w-4' />
                      <span>เปิด Google Sheet</span>
                    </a>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem asChild className='cursor-pointer'>
                    <Link href='/dashboard/user-management'>
                      <Users className='mr-2 h-4 w-4' />
                      <span>จัดการผู้ใช้</span>
                    </Link>
                  </DropdownMenuItem> */}
                </>
              )}
              <DropdownMenuItem
                onClick={handleSyncAll}
                disabled={isSyncingAll}
                className='cursor-pointer flex flex-col items-start'
              >
                <div className='flex items-center w-full'>
                  <RefreshCw
                    className={cn(
                      'mr-2 h-4 w-4',
                      isSyncingAll && 'animate-spin'
                    )}
                  />
                  <span>
                    {isSyncingAll ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลทั้งหมด'}
                  </span>
                </div>
                <span className='text-xs text-muted-foreground pl-6'>
                  {renderLastSyncedAll()}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className='cursor-pointer'
              >
                <LogOut className='mr-2 h-4 w-4' />
                <span>ออกจากระบบ</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className='flex-1 p-2 pb-20'>{renderContent()}</main>
        <nav className='fixed bottom-0 left-0 right-0 z-10 mx-auto max-w-lg '>
          <div className='grid h-16 grid-cols-3 border-t bg-white rounded-t-md mx-2'>
            <Link
              href='/dashboard'
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs font-medium',
                isActive('/dashboard')
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <LayoutDashboard className='h-6 w-6' />
              <span>แดชบอร์ด</span>
            </Link>
            <Link
              href='/dashboard/sales'
              className='flex items-center justify-center'
            >
              <div className='-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg'>
                <PlusCircle className='h-8 w-8' />
              </div>
            </Link>
            <Link
              href='/dashboard/products'
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs font-medium',
                isActive('/dashboard/products')
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Boxes className='h-6 w-6' />
              <span>สินค้า</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
