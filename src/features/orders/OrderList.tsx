import {useSuspenseQuery} from '@tanstack/react-query';
import {Link} from '@tanstack/react-router';
import {workspaceQuery} from './queries';
import {WorkspaceNav} from './WorkspaceNav';
import {STATUS} from './rules';
import {Button} from '@/components/ui/button';
export function OrderList({quotesOnly=false}:{quotesOnly?:boolean}){const {data}=useSuspenseQuery(workspaceQuery());const orders=data.orders.filter(o=>!quotesOnly||data.quotes.some(q=>q.order_id===o.id));return <main dir="rtl" className="theme-bhsat mx-auto min-h-screen max-w-7xl space-y-6 bg-background p-6 text-foreground"><h1 className="text-2xl font-bold">{quotesOnly?'عروض الأسعار':data.isAdmin?'طلبات الزبائن':'طلباتي'}</h1><WorkspaceNav admin={data.isAdmin}/><section>{orders.map(o=>{const q=data.quotes.find(q=>q.order_id===o.id);return <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 border-b py-5"><div><h2 className="font-bold">{(o.selection as {name?:string}).name}</h2><p className="text-sm text-muted-foreground">{STATUS[o.status]} · {new Date(o.updated_at).toLocaleDateString('ar')}</p></div>{q&&<span>{q.amount} {q.currency}</span>}<Button asChild variant="outline"><Link to="/orders/$orderId" params={{orderId:o.id}}>التفاصيل</Link></Button></div>})}{!orders.length&&<p className="py-10 text-muted-foreground">لا توجد {quotesOnly?'عروض أسعار':'طلبات'} بعد.</p>}</section></main>}
