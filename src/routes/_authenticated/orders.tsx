import {createFileRoute} from '@tanstack/react-router';
import {OrderList} from '@/features/orders/OrderList';
import {workspaceQuery} from '@/features/orders/queries';
export const Route=createFileRoute('/_authenticated/orders')({
 loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery()),
 head:()=>({meta:[{title:'طلبات صناعة التطبيقات — Bahrain Satellite'},{name:'description',content:'طلبات صناعة التطبيقات للمشغّل المخصص ومتابعة المراجعة والتسليم.'},{property:'og:title',content:'طلبات صناعة التطبيقات — Bahrain Satellite'},{property:'og:description',content:'طلبات صناعة التطبيقات للمشغّل المخصص.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:()=> <OrderList/>
});
