import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import AdminSidebarNav from "@/components/AdminSidebarNav";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Security check: Verify the user is an admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = user.email === "halohuddin@gmail.com" || userData?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24 text-black select-none bg-background">
        <div className="text-center p-8 bg-white border-[3px] border-black rounded-none shadow-brutalist max-w-sm">
          <h1 className="text-2xl font-black uppercase text-accent-orange mb-3">Access Denied</h1>
          <p className="text-xs font-semibold text-slate-600">You must be an administrator to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 h-full flex-shrink-0 bg-white border-r border-border relative z-10 hidden md:block">
        <AdminSidebarNav />
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
