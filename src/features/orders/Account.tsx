import {useState} from 'react';
import {useSuspenseQuery} from '@tanstack/react-query';
import {workspaceQuery} from './queries';
import {WorkspaceNav} from './WorkspaceNav';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {supabase} from '@/integrations/supabase/client';
import {toast} from 'sonner';
export function Account(){const {data}=useSuspenseQuery(workspaceQuery());const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);return <main dir="rtl" className="theme-bhsat mx-auto min-h-screen max-w-7xl space-y-6 bg-background p-6 text-foreground"><h1 className="text-2xl font-bold">أمان حسابي</h1><WorkspaceNav admin={data.isAdmin}/><form className="max-w-md space-y-4" onSubmit={async e=>{e.preventDefault();if(password.length<8){toast.error('كلمة المرور 8 أحرف على الأقل');return}setBusy(true);try{const r=await supabase.auth.updateUser({password});if(r.error)throw r.error;setPassword('');toast.success('تم تغيير كلمة المرور')}catch{toast.error('تعذر تغيير كلمة المرور')}finally{setBusy(false)}}}><Label htmlFor="account-password">كلمة المرور الجديدة</Label><Input id="account-password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><Button disabled={busy} type="submit">حفظ كلمة المرور</Button></form></main>}
