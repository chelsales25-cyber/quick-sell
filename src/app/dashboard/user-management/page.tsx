'use client';

import React, { useState } from 'react';
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSetUserRoleMutation,
} from '@/lib/features/users/users-api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  PlusCircle,
  Edit,
  Loader2,
  Users,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { th } from 'date-fns/locale';
import type { ManagedUser } from '@/ai/flows/user-management-flow';

function UserManagementPage() {
  const {
    data: users,
    isLoading,
    isError,
    refetch,
    error,
  } = useListUsersQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [disabled, setDisabled] = useState(false);

  const { toast } = useToast();
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [setUserRole] = useSetUserRoleMutation();

  const openModalForCreate = () => {
    setEditingUser(null);
    setEmail('');
    setPassword('');
    setRole('user');
    setDisabled(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setEmail(user.email || '');
    setPassword(''); // Clear password for security
    setRole((user.role as 'user' | 'admin') || 'user');
    setDisabled(user.disabled);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        // --- Update Existing User ---
        const updates: Promise<any>[] = [];

        // Update basic info (disabled status)
        if (editingUser.disabled !== disabled) {
          updates.push(updateUser({ uid: editingUser.uid, disabled }));
        }
        // Update password if a new one is provided
        if (password) {
          updates.push(updateUser({ uid: editingUser.uid, password }));
        }
        // Update role
        if (editingUser.role !== role) {
          updates.push(setUserRole({ uid: editingUser.uid, role }));
        }

        if (updates.length > 0) {
          await Promise.all(updates);
          toast({
            title: 'สำเร็จ',
            description: 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว',
          });
        }
      } else {
        // --- Create New User ---
        await createUser({ email, password }).unwrap();
        toast({ title: 'สำเร็จ', description: 'สร้างผู้ใช้ใหม่เรียบร้อยแล้ว' });
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: err.error || 'ไม่สามารถบันทึกข้อมูลผู้ใช้ได้',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = parseISO(dateString);
    return isValid(date)
      ? format(date, 'd MMM yyyy, HH:mm', { locale: th })
      : 'Invalid Date';
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <TableBody>
          {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className='h-4 w-48' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-6 w-16 rounded-full' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-6 w-16 rounded-full' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-8 w-20' />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }
    if (isError) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={4} className='h-24 text-center'>
              <div className='flex flex-col items-center gap-2 text-destructive'>
                <AlertCircle className='h-6 w-6' />
                <p>ไม่สามารถโหลดข้อมูลผู้ใช้ได้</p>
                <p className='text-sm'>
                  {(error as any)?.data?.error || 'กรุณาลองอีกครั้ง'}
                </p>
                <Button onClick={() => refetch()} variant='outline' size='sm'>
                  <RefreshCw className='mr-2 h-4 w-4' />
                  ลองใหม่
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }
    return (
      <TableBody>
        {users?.map((user) => (
          <TableRow key={user.uid}>
            <TableCell>
              <div className='font-medium'>{user.email}</div>
              {/* <div className='text-xs text-muted-foreground'>{user.uid}</div> */}
            </TableCell>
            <TableCell>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={user.disabled ? 'destructive' : 'outline'}
                className={
                  !user.disabled ? 'border-green-500 text-green-700' : ''
                }
              >
                {user.disabled ? 'Inactive' : 'Active'}
              </Badge>
            </TableCell>
            <TableCell>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => openModalForEdit(user)}
              >
                <Edit className='h-4 w-4' />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };

  // Temporary: Disable user management for non-admins
  if (true) {
    return <>ระบบกำลังพัฒนา</>;
  }
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='flex-row items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Users />
              จัดการผู้ใช้
            </CardTitle>
            <CardDescription>
              เพิ่ม, แก้ไข และกำหนดสิทธิ์ผู้ใช้งานระบบ
            </CardDescription>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={openModalForCreate}>
                <PlusCircle className='mr-2' />
                เพิ่มผู้ใช้
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleFormSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser
                      ? `แก้ไขข้อมูลสำหรับ ${editingUser.email}`
                      : 'กรอกข้อมูลเพื่อสร้างผู้ใช้ใหม่'}
                  </DialogDescription>
                </DialogHeader>
                <div className='grid gap-4 py-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email</Label>
                    <Input
                      id='email'
                      type='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={!!editingUser}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='password'>Password</Label>
                    <Input
                      id='password'
                      type='password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        editingUser ? 'ปล่อยว่างถ้าไม่ต้องการเปลี่ยน' : ''
                      }
                      required={!editingUser}
                      minLength={6}
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4 items-end'>
                    <div className='space-y-2'>
                      <Label htmlFor='role'>Role</Label>
                      <Select
                        value={role}
                        onValueChange={(v) => setRole(v as 'user' | 'admin')}
                      >
                        <SelectTrigger id='role'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='user'>User</SelectItem>
                          <SelectItem value='admin'>Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2 flex flex-col items-start'>
                      <Label>Status</Label>
                      <div className='flex items-center space-x-2 p-2 rounded-md border'>
                        <Switch
                          id='status'
                          checked={!disabled}
                          onCheckedChange={(checked) => setDisabled(!checked)}
                        />
                        <Label htmlFor='status'>
                          {!disabled ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                    </div>
                  </div>
                  {editingUser && (
                    <div className='text-xs text-muted-foreground space-y-1 mt-2'>
                      <p>สร้างเมื่อ: {renderDate(editingUser.creationTime)}</p>
                      <p>
                        เข้าระบบล่าสุด: {renderDate(editingUser.lastSignInTime)}
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    ยกเลิก
                  </Button>
                  <Button type='submit' disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    บันทึก
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>
      <Card>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ใช้</TableHead>
                <TableHead>สิทธิ์</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserManagementPage;
