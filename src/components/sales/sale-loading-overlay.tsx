"use client";

import { Loader2 } from "lucide-react";

// This component might be repurposed or removed later if no global scanning state is needed.
// For now, it's kept in case we want to show a saving overlay.
// It is not currently used.
export function SaleLoadingOverlay({ isLoading, text }: { isLoading: boolean; text: string }) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-semibold text-primary">{text}</p>
      </div>
    </div>
  );
}
