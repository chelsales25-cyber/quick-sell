'use client';

import React from 'react';
import { useSale } from './sale-provider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Banknote,
  Landmark,
  QrCode as QrCodeIcon,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useForm, Controller } from 'react-hook-form';
import {
  useGetBanksQuery,
  useSyncBanksMutation,
} from '@/lib/features/banks/banks-api';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';
import { cn, formatBaht } from '@/lib/utils';
import qr from 'promptpay-qr';

interface PaymentFormData {
  paymentMethod: string;
  paymentDetails: string;
  selectedBank: string; // Will store the bank's code
}

export function PaymentDialog() {
  const {
    total,
    isPaymentSheetOpen,
    closePaymentSheet,
    completeSale,
    isSaving,
  } = useSale();
  const { toast } = useToast();

  const { data: banks, isLoading: isLoadingBanks } = useGetBanksQuery();
  const [syncBanks, { isLoading: isSyncingBanks }] = useSyncBanksMutation();

  const { register, handleSubmit, watch, control, setValue } =
    useForm<PaymentFormData>({
      defaultValues: {
        paymentMethod: 'other',
        paymentDetails: '',
        selectedBank: '',
      },
    });

  const paymentMethod = watch('paymentMethod');
  const selectedBankCode = watch('selectedBank');

  const selectedBank = banks?.find((b) => b.code === selectedBankCode);
  const promptPayPayload = selectedBank?.bank_no
    ? qr(selectedBank.bank_no, { amount: total })
    : null;

  const handleSyncBanks = async () => {
    try {
      await syncBanks().unwrap();
      toast({
        title: 'ซิงค์ธนาคารสำเร็จ',
        description: 'ข้อมูลธนาคารเป็นปัจจุบันแล้ว',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'ซิงค์ธนาคารไม่สำเร็จ',
        description: 'กรุณาลองอีกครั้ง',
      });
    }
  };

  const handleConfirm = (data: PaymentFormData) => {
    let finalPaymentDetails = '';

    if (data.paymentMethod === 'bank' && selectedBank) {
      finalPaymentDetails = selectedBank.name;
    } else if (data.paymentMethod === 'other') {
      finalPaymentDetails = data.paymentDetails || 'อื่นๆ';
    } else {
      finalPaymentDetails = 'เงินสด'; // Default to cash if other methods are not fully selected
    }

    const paymentData = {
      paymentMethod: finalPaymentDetails,
    };

    completeSale(paymentData);
  };

  return (
    <Sheet open={isPaymentSheetOpen} onOpenChange={closePaymentSheet}>
      <SheetContent side='right' className='w-full flex flex-col p-4 bg-muted'>
        <form
          onSubmit={handleSubmit(handleConfirm)}
          className='flex flex-col h-full'
        >
          <Card className='mb-4 flex-shrink-0'>
            <SheetHeader className='p-4 text-left'>
              <SheetTitle>ยืนยันการชำระเงิน</SheetTitle>
              <SheetDescription>
                ยอดชำระทั้งหมด:
                <span className='font-bold text-2xl text-foreground ml-2'>
                  {formatBaht(total)}
                </span>
              </SheetDescription>
            </SheetHeader>
          </Card>

          <div className='flex-grow overflow-y-auto space-y-4 -mx-2 px-2'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-base'>
                  <Banknote className='mr-2 h-5 w-5 text-primary' />
                  วิธีชำระเงิน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name='paymentMethod'
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className='grid grid-cols-3 gap-2 sm:gap-4'
                    >
                      <div>
                        <RadioGroupItem
                          value='other'
                          id='other'
                          className='peer sr-only'
                        />
                        <Label
                          htmlFor='other'
                          className='flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 h-full hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all'
                        >
                          <ClipboardList className='mb-2 h-6 w-6' />
                          <span className='text-sm'>อื่นๆ</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value='cash'
                          id='cash'
                          className='peer sr-only'
                        />
                        <Label
                          htmlFor='cash'
                          className='flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 h-full hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all'
                        >
                          <Banknote className='mb-2 h-6 w-6' />
                          <span className='text-sm'>เงินสด</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value='bank'
                          id='bank'
                          className='peer sr-only'
                        />
                        <Label
                          htmlFor='bank'
                          className='flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 h-full hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all'
                        >
                          <Landmark className='mb-2 h-6 w-6' />
                          <span className='text-sm'>โอนเงิน</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                />

                {/* Conditional Details Section */}
                {paymentMethod === 'bank' && (
                  <div className='mt-4 space-y-4'>
                    <div className='flex items-center justify-between'>
                      <h4 className='font-semibold text-md'>
                        รายละเอียดการโอนเงิน
                      </h4>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleSyncBanks}
                        disabled={isSyncingBanks}
                      >
                        <RefreshCw
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSyncingBanks && 'animate-spin'
                          )}
                        />
                        ซิงค์
                      </Button>
                    </div>
                    <Controller
                      name='selectedBank'
                      control={control}
                      rules={{ required: 'กรุณาเลือกธนาคาร' }}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoadingBanks || isSyncingBanks}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingBanks ? 'กำลังโหลด...' : 'เลือกธนาคาร'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {banks?.map((bank) => (
                              <SelectItem key={bank.code} value={bank.code}>
                                {bank.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {promptPayPayload && (
                      <div className='flex justify-center p-4 bg-white rounded-md border'>
                        <QRCode
                          size={160}
                          style={{
                            height: 'auto',
                            maxWidth: '100%',
                            width: '100%',
                          }}
                          value={promptPayPayload}
                          viewBox={`0 0 160 160`}
                        />
                      </div>
                    )}
                  </div>
                )}
                {paymentMethod === 'other' && (
                  <div className='mt-4 space-y-2'>
                    <Label htmlFor='other-details'>
                      ระบุรายละเอียดเพิ่มเติม
                    </Label>
                    <Input
                      id='other-details'
                      placeholder='เช่น บัตรกำนัล, ใช้แต้มสะสม'
                      {...register('paymentDetails')}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className='mt-auto flex-shrink-0'>
            <Card className='mt-4'>
              <SheetFooter className='grid grid-cols-2 gap-2 p-4'>
                <SheetClose asChild>
                  <Button type='button' variant='outline' disabled={isSaving}>
                    ย้อนกลับ
                  </Button>
                </SheetClose>
                <Button
                  type='submit'
                  size='lg'
                  disabled={
                    isSaving || (paymentMethod === 'bank' && !selectedBank)
                  }
                >
                  {isSaving ? 'กำลังบันทึก...' : 'ยืนยันการชำระเงิน'}
                </Button>
              </SheetFooter>
            </Card>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
