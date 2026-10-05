import { createClient } from "@/lib/supabaseServer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, Lock, Sparkles, TrendingUp } from "lucide-react";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch user counts
  const { data: allUsers, error: usersError } = await supabase
    .from("users")
    .select("id, role, is_member");

  const totalUsers = allUsers?.length || 0;
  const clientCount = allUsers?.filter((u) => u.role === "client").length || 0;
  const creatorCount = allUsers?.filter((u) => u.role === "creator").length || 0;
  const memberCount = allUsers?.filter((u) => u.is_member).length || 0;

  // 2. Fetch workspace stats
  const { data: workspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("amount, status");

  const totalWorkspaces = workspaces?.length || 0;
  const pendingCount = workspaces?.filter((w) => w.status === "pending").length || 0;
  const activeCount = workspaces?.filter((w) => w.status === "escrow").length || 0;
  const releasedCount = workspaces?.filter((w) => w.status === "released").length || 0;
  const refundedCount = workspaces?.filter((w) => w.status === "refunded").length || 0;

  // Total funds currently secured in escrow (amount is in IDR)
  const totalEscrowAmount = workspaces
    ?.filter((w) => w.status === "escrow")
    .reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

  const totalReleasedAmount = workspaces
    ?.filter((w) => w.status === "released")
    .reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

  return (
    <div className="space-y-6 md:space-y-8 text-black select-none">
      {/* Header Bar */}
      <header className="pb-6 border-b-2 border-black">
        <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
          ADMIN CONTROL ROOM 🔐
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
          System Dashboard
        </h1>
        <p className="text-slate-600 text-xs font-semibold mt-1">
          Monitor system metrics, review registered users, and track active escrow contracts.
        </p>
      </header>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Users registered */}
        <div className="bg-white text-black border-[3px] border-black p-5 rounded-none flex flex-col justify-between min-h-[10rem] shadow-brutalist">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">Registered Users</span>
            <div className="w-9 h-9 rounded-none bg-accent-lime text-black border-2 border-black flex items-center justify-center shadow-brutalist-xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black font-mono tracking-tight">{totalUsers}</p>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 text-[10px] font-bold font-mono text-slate-600 uppercase">
              <span>Creators: {creatorCount}</span>
              <span>Clients: {clientCount}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Workspaces Alive */}
        <div className="bg-accent-purple text-white border-[3px] border-black p-5 rounded-none flex flex-col justify-between min-h-[10rem] shadow-brutalist">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold font-mono text-slate-200 uppercase tracking-widest">Total Workspaces</span>
            <div className="w-9 h-9 rounded-none bg-white text-black border-2 border-black flex items-center justify-center shadow-brutalist-xs">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black font-mono tracking-tight text-white">{totalWorkspaces}</p>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-accent-purple-light text-[10px] font-bold font-mono text-slate-200 uppercase">
              <span>Active: {activeCount}</span>
              <span>Pending: {pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Funds locked in Escrow */}
        <div className="bg-accent-yellow text-black border-[3px] border-black p-5 rounded-none flex flex-col justify-between min-h-[10rem] shadow-brutalist">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold font-mono text-black uppercase tracking-widest">Funds Secured in Escrow</span>
            <div className="w-9 h-9 rounded-none bg-white text-black border-2 border-black flex items-center justify-center shadow-brutalist-xs">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black font-mono tracking-tight">
              Rp {totalEscrowAmount.toLocaleString("id-ID")}
            </p>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/10 text-[10px] font-bold font-mono text-slate-800 uppercase">
              <span>Released: Rp {totalReleasedAmount.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Split Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Left: Escrow State Health */}
        <div className="lg:col-span-6">
          <Card className="bg-white border-[3px] border-black rounded-none shadow-brutalist">
            <CardHeader className="border-b-2 border-black bg-slate-50 p-5">
              <CardTitle className="text-black font-black uppercase text-sm">Escrow Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 font-mono text-xs font-bold uppercase tracking-wider">
              <div className="flex justify-between items-center bg-accent-lime border-2 border-black p-3 shadow-brutalist-xs">
                <span>Active / Escrow (Funded)</span>
                <span>{activeCount} workspaces</span>
              </div>
              <div className="flex justify-between items-center bg-white border-2 border-black p-3 shadow-brutalist-xs">
                <span>Pending Handshake / Invoice</span>
                <span>{pendingCount} workspaces</span>
              </div>
              <div className="flex justify-between items-center bg-[#5bc0be] border-2 border-black p-3 shadow-brutalist-xs">
                <span>Released (Success)</span>
                <span>{releasedCount} workspaces</span>
              </div>
              <div className="flex justify-between items-center bg-accent-orange border-2 border-black p-3 shadow-brutalist-xs">
                <span>Refunded (Cancelled)</span>
                <span>{refundedCount} workspaces</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sarena Quick Stats */}
        <div className="lg:col-span-6">
          <Card className="bg-white border-[3px] border-black rounded-none p-5 shadow-brutalist h-full flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-2">
                Premium Memberships
              </h3>
              <div className="relative flex flex-col justify-center py-6 bg-slate-50 border-2 border-black shadow-brutalist-sm text-center">
                <Sparkles className="w-8 h-8 text-accent-purple mx-auto mb-2 animate-bounce" />
                <span className="text-3xl font-black text-black font-mono">{memberCount}</span>
                <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest mt-1">
                  Active Creator Pro Subscribers
                </span>
              </div>
              <p className="text-[10px] text-slate-600 font-semibold leading-relaxed pt-1.5">
                Pro members enjoy zero escrow commission fees, increased concurrent project limits, and verification advantages.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
