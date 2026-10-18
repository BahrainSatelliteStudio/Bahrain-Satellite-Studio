import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
import {selectionSchema,quoteSchema,AVAILABLE_FEATURES,validateAvailable} from './rules';
import type {Json} from '@/integrations/supabase/types';
export const readWorkspace=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data:isAdmin,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError)throw new Error('تعذر التحقق من الصلاحيات');
 const [catalog,orders,quotes,events]=await Promise.all([context.supabase.from('application_catalog').select('*').order('created_at'),context.supabase.from('application_orders').select('*').order('updated_at',{ascending:false}),context.supabase.from('application_quotes').select('*').order('revision',{ascending:false}),context.supabase.from('application_order_events').select('*').order('created_at',{ascending:false})]);
 if(catalog.error||orders.error||quotes.error||events.error)throw new Error('تعذر تحميل الطلبات');
 return {isAdmin:!!isAdmin,uid:context.userId,catalog:catalog.data??[],orders:orders.data??[],quotes:quotes.data??[],events:events.data??[]};
});
export const saveOrder=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid().optional(),selection:selectionSchema}).strict().parse(d)).handler(async({data,context})=>{
 const {data:catalog,error}=await context.supabase.from('application_catalog').select('*').eq('id',data.selection.catalog_id).eq('enabled',true).single();
 if(error||!catalog)throw new Error('التطبيق غير متاح');validateAvailable(data.selection,catalog);
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
export const saveCatalog=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().regex(/^[a-z0-9-]+$/),name:z.string().min(2).max(80),enabled:z.boolean(),templates:z.array(z.string()).min(1),features:z.array(z.enum(AVAILABLE_FEATURES))}).strict().parse(d)).handler(async({data,context})=>{
 const {assertAdmin}=await import('@/lib/admin-access.server');await assertAdmin(context.supabase,context.userId);
 const r=await context.supabase.rpc('order_workflow',{_id:null as unknown as string,_action:'catalog',_payload:data});if(r.error)throw new Error(r.error.message);return {ok:true};
});
