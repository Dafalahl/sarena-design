'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Trash2, AlertTriangle, Briefcase, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select(`
          *,
          client:users!client_id (id, full_name, username, email),
          creator:users!creator_id (id, full_name, username, email),
          initiator:users!created_by (id, full_name, username, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      setError(err.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleDeleteWorkspace = async (ws) => {
    const projectTitle = ws.title || `Workspace-${ws.id.slice(0,6)}`;
    const confirmInput = prompt(`WARNING: This will permanently delete the project and all related data.\n\nTo confirm, please type the project name below:\n"${projectTitle}"`);

    if (confirmInput === null) return; // User cancelled

    if (confirmInput.trim() !== projectTitle.trim()) {
      alert("Confirmation failed. The entered project name did not match.");
      return;
    }

    setActionLoading(ws.id);
    try {
      const res = await fetch("/api/admin/workspace", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: ws.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete workspace");

      setWorkspaces((prev) => prev.filter((item) => item.id !== ws.id));
      alert("Workspace deleted successfully.");
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 font-mono font-bold text-xs uppercase tracking-wider">
        Loading workspaces registry...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 py-4 text-black select-none">
      <div className="pb-6 border-b-2 border-black mb-8">
        <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
          WORKSPACE REGISTRY
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
          Workspaces Registry
        </h1>
        <p className="text-slate-600 text-xs font-semibold mt-1">
          Monitor all ongoing collaborations, identify key participants, and terminate invalid contracts.
        </p>
      </div>

      {error && (
        <div className="text-center text-rose-600 border-2 border-black bg-rose-50 p-8 font-bold font-mono text-xs shadow-brutalist-sm max-w-md mx-auto mb-8">
          Failed to load workspaces: {error}
        </div>
      )}

      <Card className="bg-white border-[3px] border-black rounded-none overflow-hidden shadow-brutalist">
        <CardHeader className="p-5 md:p-6 border-b-2 border-black bg-slate-50">
          <CardTitle className="font-black uppercase text-black text-base">Active Contracts</CardTitle>
          <CardDescription className="text-slate-600 text-xs font-semibold">
            Hover over a workspace row to view options, including deletion.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {workspaces.length === 0 ? (
            <div className="text-center py-16 text-slate-500 font-mono font-bold uppercase text-xs">
              No workspaces found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse bg-white min-w-[800px]">
              <thead>
                <tr className="bg-black text-white text-[10px] font-bold font-mono uppercase tracking-widest border-b-2 border-black">
                  <th className="px-6 py-3.5 border-r border-black/20">Project / Initiator</th>
                  <th className="px-6 py-3.5 border-r border-black/20">Client</th>
                  <th className="px-6 py-3.5 border-r border-black/20">Designer</th>
                  <th className="px-6 py-3.5 border-r border-black/20">Budget &amp; Revisions</th>
                  <th className="px-6 py-3.5 border-r border-black/20 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-black">
                {workspaces.map((ws) => {
                  const isNego = ws.title && ws.title.startsWith("[NEGO]");
                  const cleanTitle = isNego ? ws.title.replace("[NEGO]", "").trim() : (ws.title || `Untitled Workspace`);
                  const initiatorName = ws.initiator?.full_name || ws.initiator?.username || "System/Unknown";
                  const clientName = ws.client?.full_name || ws.client?.username || "Seeking Client";
                  const designerName = ws.creator?.full_name || ws.creator?.username || "Seeking Designer";

                  let badgeColor = "bg-white text-slate-500 border-dashed border-black shadow-none";
                  let statusLabel = ws.status;

                  if (ws.status === "escrow") {
                    badgeColor = ws.handshake 
                      ? "bg-accent-lime text-black border-black shadow-brutalist-sm" 
                      : "bg-accent-yellow text-black border-black shadow-brutalist-sm";
                    statusLabel = ws.handshake ? "active" : "handshake req";
                  } else if (ws.status === "released") {
                    badgeColor = "bg-accent-blue text-white border-black shadow-brutalist-sm";
                    statusLabel = "released";
                  } else if (ws.status === "refunded") {
                    badgeColor = "bg-accent-orange text-white border-black shadow-brutalist-sm";
                    statusLabel = "refunded";
                  }

                  return (
                    <tr
                      key={ws.id}
                      className="group border-b-2 border-black hover:bg-slate-50 transition-colors"
                    >
                      {/* Project / Initiator */}
                      <td className="px-6 py-4 border-r border-black/10">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-black font-black uppercase text-xs truncate max-w-[200px]">
                            {cleanTitle}
                          </p>
                          {isNego && (
                            <span className="bg-accent-orange text-white font-mono font-black text-[7px] px-1 border border-black shadow-brutalist-xs uppercase">
                              Nego
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-slate-500 font-bold uppercase mt-1">
                          Owner: <span className="text-accent-purple font-black">{initiatorName}</span>
                        </p>
                        <p className="text-[8px] font-mono text-slate-400">ID: {ws.id.slice(0, 18)}...</p>
                      </td>

                      {/* Client */}
                      <td className="px-6 py-4 border-r border-black/10">
                        <p className="text-black font-black uppercase text-xs leading-none">
                          {clientName}
                        </p>
                        {ws.client?.email && (
                          <p className="text-[8px] font-mono text-slate-400 font-bold mt-1">
                            {ws.client.email}
                          </p>
                        )}
                      </td>

                      {/* Designer */}
                      <td className="px-6 py-4 border-r border-black/10">
                        <p className="text-black font-black uppercase text-xs leading-none">
                          {designerName}
                        </p>
                        {ws.creator?.email && (
                          <p className="text-[8px] font-mono text-slate-400 font-bold mt-1">
                            {ws.creator.email}
                          </p>
                        )}
                      </td>

                      {/* Budget */}
                      <td className="px-6 py-4 border-r border-black/10 font-mono font-bold text-xs">
                        <div className="mb-1">
                          <span className="bg-accent-lime/40 border border-black px-1.5 py-0.2">
                            Rp {ws.amount.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">
                          Revisions: {ws.revisions_used} / {ws.revisions}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 border-r border-black/10 text-center">
                        <span className={`px-2 py-0.5 border-2 text-[8px] font-bold uppercase tracking-widest ${badgeColor}`}>
                          {statusLabel}
                        </span>
                      </td>

                      {/* Actions with hover-trash support */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Trash button - fully visible when hovering row */}
                          <Button
                            onClick={() => handleDeleteWorkspace(ws)}
                            disabled={actionLoading === ws.id}
                            variant="destructive"
                            size="icon"
                            className="w-8 h-8 rounded-none border-2 border-black shadow-brutalist-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-accent-orange text-white"
                            title="Delete Workspace"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
