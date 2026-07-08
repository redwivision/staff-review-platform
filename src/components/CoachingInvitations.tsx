import React, { useState } from "react";
import { CoachingRequest, UserProfile } from "../types";
import { Check, X, ShieldAlert, HeartHandshake, ChevronDown, ChevronUp, MessageCircle, AlertCircle } from "lucide-react";

interface CoachingInvitationsProps {
  currentUser: UserProfile;
  coachingRequests: CoachingRequest[];
  onAcceptInvitation: (requestId: string) => Promise<void>;
  onRejectInvitation: (requestId: string, reason: string) => Promise<void>;
}

export default function CoachingInvitations({
  currentUser,
  coachingRequests,
  onAcceptInvitation,
  onRejectInvitation
}: CoachingInvitationsProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showActiveCoaches, setShowActiveCoaches] = useState(false);

  // Filter requests that are approved by admin, pending or active for this logged in user
  const myInvitations = coachingRequests.filter(req => {
    const isNameMatch = req.coachName.toLowerCase() === currentUser.name.toLowerCase();
    const isUidMatch = req.coachUid === currentUser.uid;
    return (isNameMatch || isUidMatch) && req.status === "approved";
  });

  const pendingInvitations = myInvitations.filter(req => req.acceptedByCoach === "pending");
  const acceptedInvitations = myInvitations.filter(req => req.acceptedByCoach === "accepted");

  const handleAccept = async (id: string) => {
    setError("");
    setLoadingId(id);
    try {
      await onAcceptInvitation(id);
    } catch (err: any) {
      setError(err.message || "Failed to accept coaching request.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setError("Please provide a reason for declining the coaching request.");
      return;
    }
    setError("");
    setLoadingId(id);
    try {
      await onRejectInvitation(id, rejectReason.trim());
      setRejectingId(null);
      setRejectReason("");
    } catch (err: any) {
      setError(err.message || "Failed to decline coaching request.");
    } finally {
      setLoadingId(null);
    }
  };

  if (pendingInvitations.length === 0 && acceptedInvitations.length === 0) {
    return null;
  }

  return (
    <div id="coaching-invitations-container" className="space-y-4">
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-xl p-4 flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Pending Coaching Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/40 dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-150 dark:border-indigo-950/80 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <h3 className="font-sans font-extrabold text-indigo-950 dark:text-indigo-200 text-base">
                Pending Coaching Invitations
              </h3>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">
                The following members have nominated you to be their team leader and coach. Approve to start reviewing their quadrants!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingInvitations.map(req => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:border-indigo-200 dark:hover:border-slate-700 transition-colors"
              >
                <div>
                  <span className="text-[9px] font-bold font-mono tracking-wider uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-100/40">
                    Invitation
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-2">
                    {req.memberName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {req.memberEmail}
                  </p>
                </div>

                {rejectingId === req.id ? (
                  <form onSubmit={(e) => handleRejectSubmit(e, req.id)} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-[11px] font-bold font-mono text-slate-600 dark:text-slate-300 uppercase">
                      Reason for Declining (Sent to Admin):
                    </label>
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. At maximum coaching capacity..."
                      className="w-full text-xs rounded-lg dark:bg-slate-950"
                      disabled={loadingId !== null}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                        className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold font-mono rounded-lg transition-colors"
                        disabled={loadingId !== null}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow"
                        disabled={loadingId !== null}
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline & Inform Admin
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={loadingId !== null}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow"
                    >
                      <Check className="w-4 h-4" />
                      Accept Invitation
                    </button>
                    <button
                      onClick={() => setRejectingId(req.id)}
                      disabled={loadingId !== null}
                      className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Coached Members (Dropdown) */}
      {acceptedInvitations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors duration-200">
          <button
            onClick={() => setShowActiveCoaches(!showActiveCoaches)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                My Active Coached Members ({acceptedInvitations.length})
              </span>
            </div>
            {showActiveCoaches ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showActiveCoaches && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
              {acceptedInvitations.map(req => (
                <div key={req.id} className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-850/60">
                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">{req.memberName}</h5>
                  <p className="text-[10px] text-slate-400 font-mono">{req.memberEmail}</p>
                  <span className="inline-block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900 mt-2">
                    Active Relationship
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
