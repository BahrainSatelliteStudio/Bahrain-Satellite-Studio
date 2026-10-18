import { z } from 'zod';
import { TEMPLATES } from '@/lib/layout';
export const AVAILABLE_FEATURES = ['servers','contact','notify','activation','backup','brand','themes'] as const;
export const FEATURE_NAMES: Record<string,string> = {servers:'إدارة الهوستات',contact:'روابط التواصل والدعم',notify:'الإعلانات والرسائل',activation:'أكواد التفعيل',backup:'النسخ الاحتياطي',brand:'الهوية والشعار',themes:'الثيم والألوان'};
export const selectionSchema = z.object({catalog_id:z.string().min(1),name:z.string().trim().min(2).max(60),logo:z.string().max(3000000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),template:z.string().refine(v=>TEMPLATES.some(t=>t[0]===v)),theme:z.string().regex(/^[a-z0-9-]{2,40}$/),features:z.array(z.enum(AVAILABLE_FEATURES)).max(7).refine(v=>new Set(v).size===v.length),contact:z.string().trim().min(3).max(500)}).strict();
export type Selection = z.infer<typeof selectionSchema>;
export const quoteSchema=z.object({amount:z.coerce.number().positive().max(999999999),currency:z.string().regex(/^[A-Z]{3}$/),recurring:z.string().max(500),scope:z.string().min(5).max(3000),duration_days:z.coerce.number().int().min(1).max(3650),included_changes:z.string().min(2).max(1000),start_terms:z.string().min(3).max(1000),expires_at:z.string().datetime()});
export const STATUS:Record<string,string>={draft:'مسودة',submitted:'مُرسل',review:'قيد المراجعة',quoted:'بانتظار موافقتك',approved:'العرض مقبول',revision:'مطلوب تعديل',rejected:'العرض مرفوض',provisioning:'قيد التجهيز',testing:'قيد الاختبار',delivered:'تم التسليم'};
export function orderPanelSection(features:unknown,section:string){
 const f=features as {workflow?:string;selected?:string[]};
 if(f?.workflow!=='order')return true;
 if(['home','security','builds','changes'].includes(section))return true;
 if(['studio','brand','layout'].includes(section))return false;
 return f.selected?.includes(section)??false;
}
export function themesForCatalog<T extends {key:string;catalog_id:string|null;enabled:boolean}>(themes:T[],catalogId:string):T[]{
 return themes.filter(t=>t.enabled&&(t.catalog_id===null||t.catalog_id===catalogId));
}
export function validateAvailable(selection:Selection,catalog:{templates:unknown;features:unknown;status?:string},themes?:{key:string;catalog_id:string|null;enabled:boolean}[]){
 if(!Array.isArray(catalog.templates)||!catalog.templates.includes(selection.template)||!Array.isArray(catalog.features)||selection.features.some(f=>!(catalog.features as string[]).includes(f)))throw new Error('بعض الاختيارات لم تعد متاحة');
 if(catalog.status&&catalog.status!=='ready')throw new Error('هذا التطبيق قيد التجهيز ولا يقبل الطلبات بعد');
 if(themes&&!themesForCatalog(themes,selection.catalog_id).some(t=>t.key===selection.theme))throw new Error('الثيم المختار غير متوافق مع هذا التطبيق');
 return selection;
}
export function panelManifest(selection:Selection,slug:string){return {version:1,slug,name:selection.name,logo:selection.logo,theme:selection.theme,template:selection.template,features:selection.features};}
