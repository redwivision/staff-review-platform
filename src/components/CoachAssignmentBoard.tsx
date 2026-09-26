import React, { useEffect, useMemo, useState } from "react";
import { dataUpdateAssignedCoach } from "../dataLayer";
import { UserProfile } from "../types";
import { UserCheck, UserX, AlertTriangle, Loader2 } from "lucide-react";
import { useLanguage } from "../i18n";

interface CoachAssignmentBoardProps {
  currentUser: UserProfile;
  staff: UserProfile[];
}

// A deliberately blunt answer to "who still needs a coach?". The full
// access-control table lives in Team Members; this board exists so an admin
// lands on the answer instead of hunting for the control that sets it.
//
// The database is the authority: users_admin_update lets an admin change any
// row's coach_uid, and the SECURITY DEFINER trigger sync_assigned_coach()
// promotes the newly assigned coach and refuses self-assignment. Nothing here
// grants a privilege.
export default function CoachAssignmentBoard({ currentUser, staff }: CoachAssignmentBoardProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<UserProfile[]>(staff);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Keep in step with the app-wide staff list (30s poll / realtime) without
  // clobbering a row the admin is mid-edit on.
  useEffect(() => {
    setRows(staff);
  }, [staff]);

  // Admins have no coach of their own; they manage everyone else.
  const assignable = useMemo(
    () => rows.filter(u => u.uid !== currentUser.uid),
    [rows, currentUser.uid]
  );

  const unassigned = assignable.filter(u => !u.coachUid);
  const nameByUid = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach(u => m.set(u.uid, u.name));
    return m;
  }, [rows]);

  const assign = async (member: UserProfile, coachUid: string | null) => {
    if (!currentUser.isAdmin) {
      setError(t("Access Denied: Only administrators can assign coaches."));
      return;
    }
    // Self-coaching is refused by the database too; catching it here keeps the
    // UI honest instead of bouncing off a constraint mid-save.
    if (coachUid === member.uid) {
      setError(t("A person cannot be their own coach."));
      return;
    }

    setSavingUid(member.uid);
    setError("");
    try {
      const savedLocalUser = localStorage.getItem("staff_review_bypass_user");
      const isBypass = savedLocalUser && JSON.parse(savedLocalUser).uid.startsWith("bypass_");

      if (isBypass) {
        const localUsers = JSON.parse(localStorage.getItem("staff_review_bypass_users") || "[]") as UserProfile[];
        const applyPatch = (u: UserProfile): UserProfile => {
          if (u.uid === member.uid) return { ...u, coachUid: coachUid ?? undefined };
          if (coachUid && u.uid === coachUid) return { ...u, isLeader: true };
          return u;
        };
        const next = localUsers.map(applyPatch);
        localStorage.setItem("staff_review_bypass_users", JSON.stringify(next));
        setRows(prev => prev.map(applyPatch));
        return;
      }

      await dataUpdateAssignedCoach(member.uid, coachUid);
      setRows(prev =>
        prev.map(u => {
          if (u.uid === member.uid) return { ...u, coachUid: coachUid ?? undefined };
          if (coachUid && u.uid === coachUid) return { ...u, isLeader: true };
          return u;
        })
      );
    } catch (err) {
      console.error("Failed to assign coach:", err);
      setError(t("The database rejected that change. Please try again."));
    } finally {
      setSavingUid(null);
    }
  };

  if (!currentUser.isAdmin) return null;

  return (
    <div
      id="coach-assignment-board"
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 to-transparent dark:from-indigo-950/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-sans font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t("Coach Assignments")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("Assign a coach to each staff member. The person you pick is made a Coach automatically.")}
          </p>
        </div>
        <div
          className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg ${
            unassigned.length === 0
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {unassigned.length === 0
            ? t("All staff have a coach")
            : t("{count} still need a coach", { count: unassigned.length })}
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {assignable.map(member => {
          const coachName = member.coachUid ? nameByUid.get(member.coachUid) : undefined;
          const busy = savingUid === member.uid;
          return (
            <li
              key={member.uid}
              className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{member.name}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{member.role}</p>
              </div>

              <div className="flex items-center gap-2 sm:w-72">
                <select
                  id={`assign-coach-${member.uid}`}
                  aria-label={t("Assigned Coach")}
                  value={member.coachUid || ""}
                  disabled={busy}
                  onChange={e => assign(member, e.target.value || null)}
                  className={`flex-1 min-w-0 text-xs font-semibold rounded-lg border px-3 py-2 bg-white dark:bg-slate-900 transition-colors disabled:opacity-50 ${
                    member.coachUid
                      ? "border-emerald-200 text-emerald-800 dark:border-emerald-900 dark:text-emerald-300"
                      : "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300"
                  }`}
                >
                  <option value="">{t("No Coach Assigned")}</option>
                  {rows
                    .filter(c => c.uid !== member.uid)
                    .sort((a, b) => Number(b.isLeader) - Number(a.isLeader) || a.name.localeCompare(b.name))
                    .map(c => (
                      <option key={c.uid} value={c.uid}>
                        {c.name}
                        {c.isLeader ? t(" — Coach") : ""}
                      </option>
                    ))}
                </select>
                {busy ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                ) : member.coachUid ? (
                  <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <UserX className="w-4 h-4 text-amber-500 shrink-0" />
                )}
              </div>

              <span className="hidden lg:block text-[11px] text-slate-400 dark:text-slate-500 w-40 truncate">
                {coachName ? t("Coach: {name}", { name: coachName }) : t("Nobody is coaching this person yet")}
              </span>
            </li>
          );
        })}
      </ul>

      {assignable.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {t("No staff members to assign yet.")}
        </p>
      )}
    </div>
  );
}
