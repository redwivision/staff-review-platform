import React, { useState } from "react";
import { CoachingRequest, UserProfile } from "../types";
import { Users, UserPlus, Trash2, CheckCircle2, XCircle, AlertCircle, Info, ChevronRight, HelpCircle } from "lucide-react";

interface CoachingNominationsProps {
  currentUser: UserProfile;
  coachingRequests: CoachingRequest[];
  registeredUsers: UserProfile[];
  onAddRequest: (coachName: string) => Promise<void>;
  onDeleteRequest: (requestId: string) => Promise<void>;
}

export default function CoachingNominations({
  currentUser,
  coachingRequests,
  registeredUsers,
  onAddRequest,
  onDeleteRequest
}: CoachingNominationsProps) {
  const [newCoachName, setNewCoachName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter nominations created by current user
  const myRequests = coachingRequests.filter(req => req.memberId === currentUser.uid);

  // Filter out suggestions that are already nominated or is the current user
  const nominatedNames = myRequests.map(r => r.coachName.toLowerCase());
  const suggestions = registeredUsers.filter(u => 
    u.uid !== currentUser.uid && 
    !nominatedNames.includes(u.name.toLowerCase()) &&
    u.name.toLowerCase().includes(newCoachName.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = newCoachName.trim();

    if (!trimmedName) return;

    if (trimmedName.toLowerCase() === currentUser.name.toLowerCase()) {
      setError("Validation Error: You cannot nominate yourself as your own coach.");
      return;
    }

    if (myRequests.some(r => r.coachName.toLowerCase() === trimmedName.toLowerCase())) {
      setError("Validation Error: You have already nominated this coach.");
      return;
    }

    if (myRequests.length >= 1) {
      setError("Validation Error: You can only nominate exactly 1 coach or TL.");
      return;
    }

    setLoading(true);
    try {
      await onAddRequest(trimmedName);
      setNewCoachName("");
      setShowSuggestions(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit coaching nomination.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="coaching-nominations-card" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 space-y-6 shadow-sm transition-colors duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="font-sans font-extrabold text-slate-900 dark:text-slate-100 text-base">
              My Coaching Nomination
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose exactly 1 coach or TL to guide you. Admin will verify and notify them to accept or decline.
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
          myRequests.length === 1
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900"
            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900"
        }`}>
          {myRequests.length} of 1 Chosen {myRequests.length === 0 && "• 1 Required"}
        </span>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-xl p-4 flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Nomination Form */}
      {myRequests.length < 1 && (
        <form onSubmit={handleSubmit} className="space-y-2 relative">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-mono uppercase">
            Nominate your Coach or TL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newCoachName}
                onChange={(e) => {
                  setNewCoachName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Enter coach's full name..."
                className="w-full text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                disabled={loading}
              />
              {showSuggestions && newCoachName.trim() !== "" && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
                  {suggestions.map(u => (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => {
                        setNewCoachName(u.name);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                    >
                      {u.name} <span className="text-slate-400 font-mono">({u.role})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !newCoachName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 shadow"
            >
              <UserPlus className="w-4 h-4" />
              Nominate
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">
            💡 You can type any name, but matching a registered user's full name enables instant interactive alerts for them.
          </p>
        </form>
      )}

      {/* Nomination Status List */}
      {myRequests.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">No coach nominated yet. Please nominate exactly 1 coach or TL to guide your evaluation process.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myRequests.map(req => {
            const isApproved = req.status === "approved";
            const isRejected = req.status === "rejected";
            const isAccepted = req.acceptedByCoach === "accepted";
            const isCoachDeclined = req.acceptedByCoach === "rejected";

            return (
              <div
                key={req.id}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between gap-3 relative hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Delete button (only if not approved or if coach rejected) */}
                {(!isApproved || isCoachDeclined) && (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to withdraw your nomination for ${req.coachName}?`)) {
                        onDeleteRequest(req.id);
                      }
                    }}
                    className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-colors"
                    title="Withdraw Nomination"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 pr-8">
                    {req.coachName}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Updated {new Date(req.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-2 border-t border-slate-150 dark:border-slate-800/80 pt-2.5">
                  {/* Step 1: Admin Approval */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">1. Admin Verification:</span>
                    {isApproved ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : isRejected ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </div>

                  {/* Step 2: Nominee Acceptance (only shown if admin approved) */}
                  {isApproved && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">2. Coach Acceptance:</span>
                      {isAccepted ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active Coach
                        </span>
                      ) : isCoachDeclined ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Declined
                        </span>
                      ) : (
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 animate-pulse" /> Awaiting Response
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rejection / Decline Note */}
                  {isRejected && req.adminNotes && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 italic bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100/30">
                      Reason: {req.adminNotes}
                    </p>
                  )}

                  {isCoachDeclined && req.coachRejectReason && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 italic bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100/30">
                      Declined Reason: {req.coachRejectReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
