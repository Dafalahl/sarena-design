import { createClient } from "@/lib/supabaseServer";
import SidebarNav from "./SidebarNav";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = 'user';
  if (user) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (userData) role = userData.role;
  }
  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 h-full flex-shrink-0 bg-white border-r border-border relative z-10 hidden md:block">
        {/* <div className="p-6">
          <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-rose-500">
            Sarena
          </Link>
        </div> */}
        <SidebarNav role={role} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="p-5 md:p-8 w-full relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
