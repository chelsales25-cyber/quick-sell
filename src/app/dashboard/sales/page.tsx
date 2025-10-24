import { SaleProvider } from "@/components/sales/sale-provider";
import { ScanCard } from "@/components/sales/scan-card";
import { CurrentSaleCard } from "@/components/sales/current-sale-card";
import { PaymentDialog } from "@/components/sales/payment-dialog";
import { ManualAddCard } from "@/components/sales/manual-add-card";

export default function SalesPage() {
  return (
    <SaleProvider>
      <PaymentDialog />
      <div className="space-y-4">
        <ScanCard />
        <ManualAddCard />
        <CurrentSaleCard />
      </div>
    </SaleProvider>
  );
}
