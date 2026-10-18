import {createFileRoute} from '@tanstack/react-router';
import {Account} from '@/features/orders/Account';
import {workspaceQuery} from '@/features/orders/queries';
export const Route=createFileRoute('/_authenticated/account')({
 loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery()),
 head:()=>({meta:[{title:'أمان حساب الزبون — Bahrain Satellite'},{name:'description',content:'أمان حساب الزبون للمشغّل المخصص ومتابعة المراجعة والتسليم.'},{property:'og:title',content:'أمان حساب الزبون — Bahrain Satellite'},{property:'og:description',content:'أمان حساب الزبون للمشغّل المخصص.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:()=> <Account/>
});
