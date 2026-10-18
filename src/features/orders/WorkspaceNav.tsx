import {Link} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {ClipboardList,LayoutGrid,Smartphone,User,Receipt,Home} from 'lucide-react';
export function WorkspaceNav({admin}:{admin:boolean}){return <nav className="flex flex-wrap gap-2 border-b pb-4" aria-label="أقسام الحساب">
<Button asChild variant="outline"><Link to="/workspace"><Home/>الرئيسية</Link></Button>
<Button asChild variant="outline"><Link to="/catalog"><LayoutGrid/>{admin?'التطبيقات المتاحة':'طلب تطبيق جديد'}</Link></Button>
<Button asChild variant="outline"><Link to="/orders"><ClipboardList/>{admin?'الطلبات':'طلباتي'}</Link></Button>
<Button asChild variant="outline"><Link to="/quotes"><Receipt/>عروض الأسعار</Link></Button>
<Button asChild variant="outline"><Link to="/dashboard"><Smartphone/>{admin?'الزبائن والتطبيقات':'تطبيقاتي'}</Link></Button>
<Button asChild variant="outline"><Link to="/account"><User/>حسابي</Link></Button>
{admin&&<><Button asChild variant="outline"><Link to="/applications">الصناعة والإصدارات</Link></Button><Button asChild variant="outline"><Link to="/firebase">Firebase</Link></Button><Button asChild variant="outline"><Link to="/site-settings">الصفحة الرئيسية</Link></Button></>}
</nav>}
