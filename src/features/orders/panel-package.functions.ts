import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
import {zipSync,strToU8} from 'fflate';
import server from '../../../selfhost/panel/server.js?raw';
import features from '../../../selfhost/panel/features.js?raw';
import app from '../../../selfhost/panel/public/app.js?raw';
import html from '../../../selfhost/panel/public/index.html?raw';
import css from '../../../selfhost/panel/public/style.css?raw';
import {panelManifest,type Selection} from './rules';
export const downloadPanel=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({orderId:z.string().uuid()}).parse(d)).handler(async({data,context})=>{
 const {assertAdmin}=await import('@/lib/admin-access.server');await assertAdmin(context.supabase,context.userId);
 const {data:order,error}=await context.supabase.from('application_orders').select('selection,tenant_id').eq('id',data.orderId).single();
 if(error||!order?.tenant_id)throw new Error('جهز التطبيق أولاً');
 const {data:tenant}=await context.supabase.from('tenants').select('slug').eq('id',order.tenant_id).single();if(!tenant)throw new Error('التطبيق غير متاح');
 const files={'server.js':server,'features.js':features,'public/app.js':app,'public/index.html':html,'public/style.css':css,'delivery.json':JSON.stringify(panelManifest(order.selection as Selection,tenant.slug),null,2),'README.txt':'لوحة الزبون المخصصة\nتحتاج Node.js 18 أو أحدث.\nشغّل: node server.js\nافتح المنفذ 8090 محليًا واربط نطاق HTTPS.\nبيانات الدخول الأولى في data/initial-login.txt؛ غيّر كلمة المرور واحذف الملف.\nلا تغير delivery.json.\nاربط رابط اللوحة من الإدارة قبل اعتماد التسليم.\n'};
 const bytes=zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strToU8(v)])));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return {filename:`panel-${tenant.slug}.zip`,base64:btoa(binary)};
});
