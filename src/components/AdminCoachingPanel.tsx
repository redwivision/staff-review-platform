import React, { useState } from "react";
import { CoachingRequest, UserProfile } from "../types";
import { Check, X, Shield, AlertTriangle, ListFilter, Users, RefreshCw, BarChart2, Info, MessageSquare } from "lucide-react";

interface AdminCoachingPanelProps {
  coachingRequests: CoachingRequest[];
  registeredUsers: UserProfile[];
  onApproveNomination: (requestId: string) => Promise<void>;
  onRejectNomination: (requestId: string, reason: string) => Promise<void>;
}

export default function AdminCoachingPanel({
  coachingRequests,
  registeredUsers,
  onApproveNomination,
  onRejectNomination
}: AdminCoachingPanelProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [error, setError] = useState("");

  const pendingRequests = coachingRequests.filter(req => req.status === "pending");
  const coachDeclinedRequests = coachingRequests.filter(req => req.acceptedByCoach === "rejected");

  // Calculate workloads for all coaches to help Admin see and balance repetitions
  const coachWorkloads: {
    [name: string]: {
      total: number;
      pendingAdmin: number;
      pendingCoach: number;
      active: number;
      declined: number;
    }
  } = {};

  coachingRequests.forEach(req => {
    const coach = req.coachName;
    if (!coachWorkloads[coach]) {
      coachWorkloads[coach] = { total: 0, pendingAdmin: 0, pendingCoach: 0, active: 0, declined: 0 };
    }
    coachWorkloads[coach].total += 1;
    if (req.status === "pending") {
      coachWorkloads[coach].pendingAdmin += 1;
    } else if (req.status === "approved" && req.acceptedByCoach === "pending") {
      coachWorkloads[coach].pendingCoach += 1;
    } else if (req.status === "approved" && req.acceptedByCoach === "accepted") {
      coachWorkloads[coach].active += 1;
    } else if (req.acceptedByCoach === "rejected") {
      coachWorkloads[coach].declined += 1;
    }
  });

  const handleApprove = async (id: string) => {
    setError("");
    setLoadingId(id);
    try {
      await onApproveNomination(id);
    } catch (err: any) {
      setError(err.message || "Failed to approve nomination.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setError("Please specify a reason for rejecting the nomination.");
      return;
    }
    setError("");
    setLoadingId(id);
    try {
      await onRejectNomination(id, rejectReason.trim());
      setRejectingId(null);
      setRejectReason("");
    } catch (err: any) {
      setError(err.message || "Failed to reject nomination.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleBulkApprove = async () => {
    setError("");
    const pending = pendingRequests;
    if (pending.length === 0) {
      setError("No pending nominations to approve.");
      return;
    }

    // Get current loads for each coach (active + pendingCoach)
    const currentLoads: { [coachName: string]: number } = {};
    coachingRequests.forEach(req => {
      const coach = req.coachName;
      if (!currentLoads[coach]) {
        currentLoads[coach] = 0;
      }
      if (req.status === "approved" && (req.acceptedByCoach === "accepted" || req.acceptedByCoach === "pending")) {
        currentLoads[coach] += 1;
      }
    });

    const toApprove: CoachingRequest[] = [];
    const skippedOverloaded: CoachingRequest[] = [];

    pending.forEach(req => {
      const coach = req.coachName;
      const currentLoad = currentLoads[coach] || 0;
      // If load is less than 3, we can approve
      if (currentLoad < 3) {
        toApprove.push(req);
        currentLoads[coach] = currentLoad + 1; // Increment as we plan to approve it
      } else {
        skippedOverloaded.push(req);
      }
    });

    if (toApprove.length === 0) {
      setError("No nominations could be approved because all nominated coaches are already at or exceed their limit (3 active/pending assignments).");
      return;
    }

    const confirmMsg = `Are you sure you want to approve ${toApprove.length} of the ${pending.length} pending nominations in bulk?` + 
      (skippedOverloaded.length > 0 ? `\n\n(${skippedOverloaded.length} nominations will be skipped because those coaches already have 3 or more active/pending assignments.)` : "");

    if (!confirm(confirmMsg)) {
      return;
    }

    setBulkApproving(true);
    let successCount = 0;
    try {
      for (const req of toApprove) {
        await onApproveNomination(req.id);
        successCount++;
      }
      alert(`Successfully approved ${successCount} coach nominations!` + 
        (skippedOverloaded.length > 0 ? ` Skipped ${skippedOverloaded.length} because those coaches have too many requests.` : ""));
    } catch (err: any) {
      setError(err.message || "An error occurred during bulk approval.");
    } finally {
      setBulkApproving(false);
    }
  };

  return (
    <div id="admin-coaching-panel" className="space-y-6">
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-xl p-4 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rejections & Alerts from Coaches */}
      {coachDeclinedRequests.length > 0 && (
        <div className="bg-rose-50/50 dark:bg-rose-950/15 border border-rose-250 dark:border-rose-950/80 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-extrabold text-sm uppercase font-mono tracking-wider">
              Coach Decline Alerts ({coachDeclinedRequests.length})
            </h3>
          </div>
          <div className="divide-y divide-rose-100/50 dark:divide-rose-900/40">
            {coachDeclinedRequests.map(req => (
              <div key={req.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-rose-600 dark:text-rose-400">{req.coachName}</span> declined coaching offer for <span className="text-indigo-600 dark:text-indigo-400">{req.memberName}</span>
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 font-sans italic">
                    Reason: "{req.coachRejectReason || "No reason specified"}"
                  </p>
                </div>
                <span className="font-mono text-[10px] text-slate-400 shrink-0 bg-white dark:bg-slate-900 border border-rose-100/60 px-2 py-0.5 rounded-full">
                  Logged {new Date(req.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workload Balance & Repetition Checker */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="font-sans font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase">
                Coach Load & Balance
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Detect repetitions and check if anyone is overloaded.
              </p>
            </div>
          </div>

          {Object.keys(coachWorkloads).length === 0 ? (
            <p className="text-xs text-slate-400 font-mono italic text-center py-6">No nomination statistics available</p>
          ) : (
            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {Object.entries(coachWorkloads)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([coach, load]) => {
                  const isRegistered = registeredUsers.some(u => u.name.toLowerCase() === coach.toLowerCase());
                  const overload = load.active + load.pendingCoach > 3;

                  return (
                    <div
                      key={coach}
                      className={`p-3 rounded-xl border transition-colors ${
                        overload
                          ? "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate" title={coach}>
                          {coach}
                        </span>
                        {!isRegistered && (
                          <span className="text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-100/40" title="This person has not registered an account yet.">
                            Unregistered
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/40">
                        <div className="text-center">
                          <p className="text-slate-400">Pend</p>
                          <p className="font-bold text-slate-700 dark:text-slate-300">{load.pendingAdmin}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-indigo-400">Offer</p>
                          <p className="font-bold text-indigo-700 dark:text-indigo-400">{load.pendingCoach}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-emerald-400">Active</p>
                          <p className="font-bold text-emerald-700 dark:text-emerald-400">{load.active}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-rose-400">Decl</p>
                          <p className="font-bold text-rose-700 dark:text-rose-400">{load.declined}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Pending Nominations Approval Center */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-sans font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase">
                  Pending Approvals ({pendingRequests.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Review, approve, or reject user coach nominations.
                </p>
              </div>
            </div>
            {pendingRequests.length > 1 && (
              <button
                type="button"
                id="approve-all-nominations-btn"
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
              >
                {bulkApproving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Approve All Safe</span>
              </button>
            )}
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">All coach nominations verified!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {pendingRequests.map(req => (
                <div
                  key={req.id}
                  className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850/80 space-y-3.5 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Nomination Offer</p>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 mt-1">
                        Member: <span className="text-slate-950 dark:text-white">{req.memberName}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">{req.memberEmail}</p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Nominated Coach</p>
                      <p className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 mt-1">{req.coachName}</p>
                    </div>
                  </div>

                  {rejectingId === req.id ? (
                    <form onSubmit={(e) => handleRejectSubmit(e, req.id)} className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 animate-fade-in">
                      <label className="block text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300 uppercase">
                        Reason for Rejection (Visible to Member):
                      </label>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Please choose another coach as this coach is full..."
                        className="w-full text-xs rounded-lg dark:bg-slate-900"
                        disabled={loadingId !== null}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-xs font-bold font-mono"
                          disabled={loadingId !== null}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow"
                          disabled={loadingId !== null}
                        >
                          <X className="w-3.5 h-3.5" />
                          Confirm Reject
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-2 justify-end pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={loadingId !== null}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(req.id)}
                        disabled={loadingId !== null}
                        className="px-4 py-1.5 bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
