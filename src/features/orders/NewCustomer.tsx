import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {createCustomerAccount} from './customers.functions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {toast} from 'sonner';
export function NewCustomer(){const create=useServerFn(createCustomerAccount);const [open,setOpen]=useState(false);const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button>إنشاء حساب زبون للطلبات</Button></DialogTrigger><DialogContent dir="rtl"><DialogHeader><DialogTitle>حساب زبون جديد</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await create({data:{username,password}});setOpen(false);setUsername('');setPassword('');toast.success('تم إنشاء الحساب؛ يستطيع الزبون الدخول وتجهيز طلبه')}catch(e){toast.error(e instanceof Error&&e.name!=='ZodError'?e.message:'تحقق من اسم المستخدم وكلمة المرور')}finally{setBusy(false)}}}><Label htmlFor="customer-user">اسم المستخدم</Label><Input id="customer-user" dir="ltr" autoComplete="off" value={username} onChange={e=>setUsername(e.target.value.toLowerCase())}/><Label htmlFor="customer-pass">كلمة المرور</Label><Input id="customer-pass" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><Button type="submit" disabled={busy}>إنشاء الحساب فقط</Button></form></DialogContent></Dialog>}
