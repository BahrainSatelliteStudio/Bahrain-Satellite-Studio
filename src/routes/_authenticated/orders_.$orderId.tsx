import {createFileRoute} from '@tanstack/react-router';
import {OrderDetail} from '@/features/orders/OrderDetail';
import {workspaceQuery} from '@/features/orders/queries';
export const Route=createFileRoute('/_authenticated/orders_/$orderId')({loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery()),head:()=>({meta:[{title:'تفاصيل طلب التطبيق — Bahrain Satellite'},{name:'description',content:'اختيارات التطبيق وعروض الأسعار والموافقة والتسليم.'},{property:'og:title',content:'تفاصيل طلب التطبيق — Bahrain Satellite'},{property:'og:description',content:'مراجعة الطلب والعرض المعتمد ومتابعة التجهيز.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Detail});
function Detail(){const {orderId}=Route.useParams();return <OrderDetail id={orderId}/>}
