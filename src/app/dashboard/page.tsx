import { SalesSummary } from '@/components/dashboard/sales-summary';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';

export default function DashboardPage() {
  return (
    <div className='grid grid-cols-1 gap-6'>
      <div className="col-span-1">
        <SalesSummary />
      </div>
      <div className='col-span-1'>
        <RecentTransactions />
      </div>
    </div>
  );
}
