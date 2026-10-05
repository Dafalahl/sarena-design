'use client'

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/lib/supabase";
import { Shield, ShieldAlert, Sparkles, Search } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleAdmin = async (targetUser) => {
    const isTargetAdmin = targetUser.role === "admin";
    const newRole = isTargetAdmin ? "client" : "admin";
    
    if (!confirm(`Are you sure you want to change ${targetUser.full_name || targetUser.username || 'this user'}'s role to ${newRole}?`)) {
      return;
    }

    setActionLoading(targetUser.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      // Update state locally
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter users by category and search query
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.bio || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategory === "Creators") return u.role === "creator";
    if (activeCategory === "Clients") return u.role === "client";
    if (activeCategory === "Admins") return u.role === "admin" || u.email === "halohuddin@gmail.com";
    return true;
  });

  if (loading) {
    return (
      <div className="text-center py-24 font-mono font-bold text-xs uppercase tracking-wider">
        Loading registered users directory...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 py-4 text-black select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-black mb-8">
        <div>
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
            USER REGISTRY
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
            Registered Users
          </h1>
          <p className="text-slate-600 text-xs font-semibold mt-1">
            Promote accounts to administrators, verify user status, and view profiles.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, bio or username..."
            className="pl-10 font-bold border-2 border-black rounded-none shadow-brutalist-sm focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", "Creators", "Clients", "Admins"].map((cat) => (
            <Button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-none border-2 border-black font-mono font-bold uppercase tracking-wider text-xs shadow-brutalist-xs h-10 ${
                activeCategory === cat
                  ? "bg-accent-lime text-black"
                  : "bg-white text-black hover:bg-slate-50"
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-center text-rose-600 border-2 border-black bg-rose-50 p-8 font-bold font-mono text-xs shadow-brutalist-sm max-w-md mx-auto mb-8">
          Failed to load users: {error}
        </div>
      )}

      {filteredUsers.length === 0 && !error && (
        <div className="text-center py-20 bg-white border-2 border-black shadow-brutalist max-w-md mx-auto font-bold font-mono text-xs uppercase tracking-wider">
          No users match the criteria.
        </div>
      )}

      {filteredUsers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredUsers.map((u) => {
            const isImageLink = u.portfolio_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
            const isSelfAdmin = u.email === "halohuddin@gmail.com";
            
            return (
              <div
                key={u.id}
                className="bg-white border-2 border-black rounded-none overflow-hidden transition-all duration-150 ease-out shadow-brutalist hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#000000] h-full flex flex-col justify-between"
              >
                {/* Content Section */}
                <div className="p-6 relative flex-1 flex flex-col justify-between">
                  <div className="relative">
                    {/* Role badge */}
                    <div className="flex justify-between items-start gap-2 mb-8">
                      <UserAvatar
                        src={u.avatar_url}
                        name={u.full_name || u.username}
                        email={u.email}
                        className="w-14 h-14 rounded-none border-2 border-black shadow-brutalist-sm shrink-0"
                      />
                      <div className="flex flex-col items-end gap-1.5 font-mono">
                        <span className={`px-2 py-0.5 border text-[8px] font-bold uppercase tracking-widest leading-none bg-slate-100 border-black shadow-brutalist-xs text-black`}>
                          {u.role || "client"}
                        </span>
                        {u.is_member && (
                          <span className="bg-accent-yellow border border-black text-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-brutalist-xs">
                            <Sparkles className="w-2.5 h-2.5" /> PRO
                          </span>
                        )}
                        {isSelfAdmin && (
                          <span className="bg-accent-purple border border-black text-white px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-brutalist-xs">
                            <ShieldAlert className="w-2.5 h-2.5" /> ROOT
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-black uppercase tracking-tight text-black">
                        {u.full_name || u.username}
                      </h3>
                      <p className="text-slate-500 font-mono text-[10px] truncate">{u.email}</p>
                      {u.username && (
                        <p className="text-accent-purple font-mono text-[10px] font-bold uppercase tracking-wider">
                          @{u.username}
                        </p>
                      )}
                      <p className="text-slate-600 text-xs font-semibold leading-relaxed pt-2 line-clamp-3">
                        {u.bio || "No bio summary provided."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-black space-y-4">
                    {/* Rate Base */}
                    {u.role === "creator" && (
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Rate Base</span>
                        <span className="text-[10px] font-bold bg-accent-lime text-black border border-black px-1.5 py-0.2 shadow-brutalist-xs">
                          Rp {(u.price_base || 0).toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}

                    {/* Admin Promotion Controls */}
                    {!isSelfAdmin && (
                      <Button
                        onClick={() => handleToggleAdmin(u)}
                        disabled={actionLoading === u.id}
                        className={`w-full h-8 text-[9px] uppercase font-black font-mono border-2 border-black rounded-none shadow-brutalist-xs ${
                          u.role === "admin"
                            ? "bg-accent-orange hover:bg-accent-orange text-white"
                            : "bg-white hover:bg-slate-50 text-black"
                        }`}
                      >
                        {actionLoading === u.id ? (
                          "Processing..."
                        ) : u.role === "admin" ? (
                          <span className="flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-white" /> Revoke Admin Access
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-black" /> Make Administrator
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
