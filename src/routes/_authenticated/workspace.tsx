import {createFileRoute} from '@tanstack/react-router';
import {Workspace} from '@/features/orders/Workspace';
import {workspaceQuery} from '@/features/orders/queries';
export const Route=createFileRoute('/_authenticated/workspace')({
 loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery()),
 head:()=>({meta:[{title:'إدارة الطلبات وحساب الزبون — Bahrain Satellite'},{name:'description',content:'إدارة الطلبات وحساب الزبون للمشغّل المخصص ومتابعة المراجعة والتسليم.'},{property:'og:title',content:'إدارة الطلبات وحساب الزبون — Bahrain Satellite'},{property:'og:description',content:'إدارة الطلبات وحساب الزبون للمشغّل المخصص.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:()=> <Workspace/>
});
