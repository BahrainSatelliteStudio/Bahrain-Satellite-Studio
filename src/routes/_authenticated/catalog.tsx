import {createFileRoute} from '@tanstack/react-router';
import {Catalog} from '@/features/orders/Catalog';
import {workspaceQuery} from '@/features/orders/queries';
export const Route=createFileRoute('/_authenticated/catalog')({
 loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery()),
 head:()=>({meta:[{title:'التطبيقات المتاحة وطلب تطبيق — Bahrain Satellite'},{name:'description',content:'التطبيقات المتاحة وطلب تطبيق للمشغّل المخصص ومتابعة المراجعة والتسليم.'},{property:'og:title',content:'التطبيقات المتاحة وطلب تطبيق — Bahrain Satellite'},{property:'og:description',content:'التطبيقات المتاحة وطلب تطبيق للمشغّل المخصص.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:()=> <Catalog/>
});
