import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
export const createCustomerAccount=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({username:z.string().regex(/^[a-z0-9._-]{3,30}$/),password:z.string().min(8).max(72)}).strict().parse(d)).handler(async({data,context})=>{
 const {assertAdmin}=await import('@/lib/admin-access.server');await assertAdmin(context.supabase,context.userId);
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data:created,error}=await supabaseAdmin.auth.admin.createUser({email:`${data.username}@users.bhsat.me`,password:data.password,email_confirm:true});
 if(error)throw new Error(error.message.includes('already')?'اسم المستخدم مستخدم مسبقًا':'تعذر إنشاء حساب الزبون');
 return {id:created.user.id};
});
