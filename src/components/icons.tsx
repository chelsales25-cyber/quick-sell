'use client';

import {
  LucideProps,
  LayoutDashboard,
  Boxes,
  PlusCircle,
  LogOut,
  Sheet,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Icon as LucideIcon,
} from 'lucide-react';
import React from 'react';

// 1. สร้าง Type สำหรับชื่อไอคอนที่อนุญาตให้ใช้
// เพื่อป้องกันการพิมพ์ผิดและเพื่อให้ TypeScript ช่วยตรวจสอบ
export type IconName =
  | 'LayoutDashboard'
  | 'Boxes'
  | 'PlusCircle'
  | 'LogOut'
  | 'Sheet'
  | 'DollarSign'
  | 'ShoppingCart'
  | 'Package'
  | 'Users';


// 2. สร้าง Icon Map (พจนานุกรมไอคอน)
// Key: คือชื่อไอคอนที่เป็น Text (string)
// Value: คือคอมโพเนนต์ไอคอนตัวจริงที่ import มา
export const iconMap: Record<IconName, LucideIcon> = {
  LayoutDashboard: LayoutDashboard,
  Boxes: Boxes,
  PlusCircle: PlusCircle,
  LogOut: LogOut,
  Sheet: Sheet,
  DollarSign: DollarSign,
  ShoppingCart: ShoppingCart,
  Package: Package,
  Users: Users,
};

// 3. สร้าง DynamicIcon component
interface DynamicIconProps extends LucideProps {
  name: IconName;
}

/**
 * คอมโพเนนต์สำหรับแสดงผลไอคอนจาก lucide-react แบบไดนามิกโดยใช้ชื่อ
 * @example
 * <DynamicIcon name="LayoutDashboard" className="h-5 w-5" />
 */
export const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const IconComponent = iconMap[name];

  // ถ้าไม่พบไอคอนที่ตรงกับชื่อใน map ให้ return null (หรือไม่แสดงอะไรเลย)
  // หรืออาจจะแสดงไอคอนเริ่มต้นก็ได้
  if (!IconComponent) {
    return null;
  }

  return <IconComponent {...props} />;
};
