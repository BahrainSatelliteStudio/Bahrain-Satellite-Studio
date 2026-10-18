import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
import {selectionSchema,quoteSchema,AVAILABLE_FEATURES,validateAvailable} from './rules';
import type {Json} from '@/integrations/supabase/types';
export const readWorkspace=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data:isAdmin,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError)throw new Error('تعذر التحقق من الصلاحيات');
 const [catalog,orders,quotes,events,themes]=await Promise.all([context.supabase.from('application_catalog').select('*').order('created_at'),context.supabase.from('application_orders').select('*').order('updated_at',{ascending:false}),context.supabase.from('application_quotes').select('*').order('revision',{ascending:false}),context.supabase.from('application_order_events').select('*').order('created_at',{ascending:false}),context.supabase.from('app_themes').select('*').order('created_at')]);
 if(catalog.error||orders.error||quotes.error||events.error||themes.error)throw new Error('تعذر تحميل الطلبات');
 return {isAdmin:!!isAdmin,uid:context.userId,catalog:catalog.data??[],orders:orders.data??[],quotes:quotes.data??[],events:events.data??[],themes:themes.data??[]};
});
export const saveOrder=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid().optional(),selection:selectionSchema}).strict().parse(d)).handler(async({data,context})=>{
 const {data:catalog,error}=await context.supabase.from('application_catalog').select('*').eq('id',data.selection.catalog_id).eq('enabled',true).single();
 if(error||!catalog)throw new Error('التطبيق غير متاح');
 const {data:themes}=await context.supabase.from('app_themes').select('key,catalog_id,enabled');
 validateAvailable(data.selection,catalog,themes??[]);
 const r=await context.supabase.rpc('order_workflow',{_id:data.id??null as unknown as string,_action:'save',_payload:{selection:data.selection}});
 if(r.error)throw new Error(r.error.message);return r.data;
});
export const orderAction=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid(),action:z.enum(['submit','review','quote','accept','decline','revision','provision','testing','deliver']),payload:z.record(z.unknown()).default({})}).parse(d)).handler(async({data,context})=>{
 let payload:Record<string,unknown>;
 if(data.action==='quote')payload=quoteSchema.parse(data.payload);
 else if(['accept','decline','revision'].includes(data.action))payload=z.object({quote_id:z.string().uuid(),note:z.string().max(1000).optional()}).strict().parse(data.payload);
 else if(data.action==='provision')payload=z.object({slug:z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/),package_id:z.string().regex(/^me\.bhsat\.[a-z][a-z0-9_]+$/),terms_met:z.literal(true)}).strict().parse(data.payload);
 else if(data.action==='deliver')payload=z.object({verified:z.literal(true),note:z.string().min(10).max(1000)}).strict().parse(data.payload);
 else payload=z.object({note:z.string().max(1000).optional()}).strict().parse(data.payload);
 const r=await context.supabase.rpc('order_workflow',{_id:data.id,_action:data.action,_payload:payload as Json});
 if(r.error)throw new Error(r.error.message);return r.data;
});
export const saveCatalog=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().regex(/^[a-z0-9-]+$/),name:z.string().min(2).max(80),enabled:z.boolean(),templates:z.array(z.string()).min(1),features:z.array(z.enum(AVAILABLE_FEATURES)),source:z.enum(['internal','opensource']).default('internal'),repo_url:z.string().url().max(500).nullable().default(null),license:z.string().max(40).nullable().default(null),status:z.enum(['preparing','ready','suspended']).default('ready')}).strict().parse(d)).handler(async({data,context})=>{
 const {assertAdmin}=await import('@/lib/admin-access.server');await assertAdmin(context.supabase,context.userId);
 const {data:existing}=await context.supabase.from('application_catalog').select('id').eq('id',data.id).maybeSingle();
 const row={id:data.id,name:data.name,enabled:data.enabled,templates:data.templates,features:data.features,source:data.source,repo_url:data.repo_url,license:data.license,status:data.status};
 const r=existing?await context.supabase.from('application_catalog').update(row).eq('id',data.id):await context.supabase.from('application_catalog').insert(row);
 if(r.error)throw new Error(existing?'تعذر تحديث التطبيق':'تعذر إضافة التطبيق');return {ok:true};
});
const themeInput=z.object({id:z.string().uuid().optional(),key:z.string().regex(/^[a-z0-9-]{2,40}$/),name:z.string().min(2).max(60),colors:z.record(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),catalog_id:z.string().regex(/^[a-z0-9-]+$/).nullable(),enabled:z.boolean().default(true)}).strict();
export const saveTheme=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>themeInput.parse(d)).handler(async({data,context})=>{
 const {assertAdmin}=await import('@/lib/admin-access.server');await assertAdmin(context.supabase,context.userId);
 const row={key:data.key,name:data.name,colors:data.colors,catalog_id:data.catalog_id,enabled:data.enabled};
 const r=data.id?await context.supabase.from('app_themes').update(row).eq('id',data.id):await context.supabase.from('app_themes').insert(row);
 if(r.error)throw new Error(r.error.code==='23505'?'معرّف الثيم مستخدم مسبقًا':'تعذر حفظ الثيم');return {ok:true};
});
export const deleteTheme=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid()}).strict().parse(d)).handler(async({data,context})=>{
 const {assertAdmin}=await import('@/lib/admin-access.server');await assertAdmin(context.supabase,context.userId);
 const r=await context.supabase.from('app_themes').delete().eq('id',data.id);if(r.error)throw new Error('تعذر حذف الثيم');return {ok:true};
});
