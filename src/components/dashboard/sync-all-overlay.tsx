"use client";

import { Loader2 } from "lucide-react";

export function SyncAllOverlay({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-lg shadow-2xl">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-semibold text-primary">
          กำลังซิงค์ข้อมูลทั้งหมด...
        </p>
        <p className="text-sm text-muted-foreground">โปรดรอสักครู่</p>
      </div>
    </div>
  );
}
