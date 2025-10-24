'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useGetReportsQuery,
  useSyncReportsMutation,
} from '@/lib/features/reports/reports-api';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DynamicIcon, IconName } from '../icons';

const LAST_SYNCED_KEY = 'reports_last_synced';

export function ReportSummary() {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedTime = localStorage.getItem(LAST_SYNCED_KEY);
    if (savedTime) {
      setLastSynced(savedTime);
    }
  }, []);

  const { data: reports, isLoading, isError } = useGetReportsQuery();
  const [
    syncReports,
    { isLoading: isSyncing, isSuccess: isSyncSuccess, isError: isSyncError },
  ] = useSyncReportsMutation();

  useEffect(() => {
    if (isSyncSuccess) {
      const newTime = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, newTime);
      setLastSynced(newTime);
      toast({
        title: 'ซิงค์รายงานสำเร็จ',
        description: 'ข้อมูลรายงานเป็นปัจจุบันแล้ว',
      });
    }
    if (isSyncError) {
      toast({
        variant: 'destructive',
        title: 'ซิงค์รายงานไม่สำเร็จ',
        description: 'กรุณาตรวจสอบการเชื่อมต่อและลองอีกครั้ง',
      });
    }
  }, [isSyncSuccess, isSyncError, toast]);

  const handleManualSync = async () => {
    await syncReports();
  };

  const renderLastSynced = () => {
    if (!lastSynced) {
      return 'ยังไม่เคยซิงค์ข้อมูล';
    }
    return `ซิงค์ล่าสุดเมื่อ ${formatDistanceToNow(new Date(lastSynced), {
      addSuffix: true,
      locale: th,
    })}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
           <div>
             <h3 className="font-semibold">รายงาน</h3>
             <p className="text-xs text-muted-foreground">{renderLastSynced()}</p>
           </div>
           <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
              {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}
            </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1">
        {isLoading && (
            [...Array(4)].map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24"/>
                        <Skeleton className="h-4 w-4"/>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-7 w-36 mb-1"/>
                        <Skeleton className="h-3 w-48"/>
                    </CardContent>
                </Card>
            ))
        )}
        
        {isError && (
             <Card>
                <CardContent className="p-4 text-center text-destructive">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                    <p>ไม่สามารถโหลดข้อมูลรายงานได้</p>
                    <p className="text-sm">โปรดลองซิงค์ข้อมูลอีกครั้ง</p>
                </CardContent>
             </Card>
        )}

        {!isLoading && !isError && reports?.map((report) => (
            <Card key={report.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{report.title}</CardTitle>
                    <DynamicIcon name={report.icon as IconName} className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{report.value}</div>
                    <p className="text-xs text-muted-foreground">
                        {report.description}
                    </p>
                </CardContent>
            </Card>
        ))}

        {!isLoading && !isError && reports?.length === 0 && (
            <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                    <p>ไม่พบข้อมูลรายงาน</p>
                    <p className="text-sm">กรุณาเพิ่มข้อมูลใน Google Sheet และกดซิงค์</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
