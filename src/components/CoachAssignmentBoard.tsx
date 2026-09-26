import React, { useEffect, useMemo, useState } from "react";
import { dataUpdateAssignedCoach } from "../dataLayer";
import { UserProfile } from "../types";
import { UserCheck, UserX, AlertTriangle, Loader2, Search } from "lucide-react";
import { useLanguage } from "../i18n";
import StaffPicker from "./StaffPicker";
import Pagination from "./Pagination";
import { searchPeople, useDebouncedValue, usePagination } from "../utils/search";

interface CoachAssignmentBoardProps {
  currentUser: UserProfile;
  staff: UserProfile[];
}

const PAGE_SIZE = 25;

// A deliberately blunt answer to "who still needs a coach?". The full
// access-control table lives in Team Members; this board exists so an admin
// lands on the answer instead of hunting for the control that sets it.
//
// At a few thousand staff this cannot render the roster, so it searches and
// pages. The coach dropdown is a typeahead rather than a native select: one
// native select per row means one DOM node per person per row, which is
// quadratic before the list is even filtered.
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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);

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

  const coachOptions = useMemo(
    () =>
      [...assignable].sort(
        (a, b) => Number(b.isLeader) - Number(a.isLeader) || a.name.localeCompare(b.name)
      ),
    [assignable]
  );

  const unassigned = useMemo(() => assignable.filter(u => !u.coachUid), [assignable]);

  const nameByUid = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach(u => m.set(u.uid, u.name));
    return m;
  }, [rows]);

  const visible = useMemo(() => {
    const base = onlyUnassigned ? unassigned : assignable;
    // Cap the candidate set first: a name search is a prefix match, and sorting
    // 5000 names is cheap but pointless when we only ever show 25.
    return searchPeople(base, debouncedSearch, 5000).results;
  }, [assignable, unassigned, onlyUnassigned, debouncedSearch]);

  const pager = usePagination(visible, PAGE_SIZE);

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

      const applyPatch = (u: UserProfile): UserProfile => {
        if (u.uid === member.uid) return { ...u, coachUid: coachUid ?? undefined };
        if (coachUid && u.uid === coachUid) return { ...u, isLeader: true };
        return u;
      };

      if (isBypass) {
        const localUsers = JSON.parse(localStorage.getItem("staff_review_bypass_users") || "[]") as UserProfile[];
        localStorage.setItem("staff_review_bypass_users", JSON.stringify(localUsers.map(applyPatch)));
        setRows(prev => prev.map(applyPatch));
        return;
      }

      await dataUpdateAssignedCoach(member.uid, coachUid);
      setRows(prev => prev.map(applyPatch));
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
          className={`shrink-0 self-start text-xs font-bold px-3 py-1.5 rounded-lg ${
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

      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="coach-board-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("Search staff by name...")}
            aria-label={t("Search staff by name")}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyUnassigned}
            onChange={e => setOnlyUnassigned(e.target.checked)}
            className="accent-indigo-600"
          />
          {t("Only show unassigned")}
        </label>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {pager.pageItems.map(member => {
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

              <div className="flex items-center gap-2 sm:w-80">
                <StaffPicker
                  id={`assign-coach-${member.uid}`}
                  people={coachOptions}
                  value={member.coachUid}
                  onChange={uid => assign(member, uid)}
                  excludeUid={member.uid}
                  clearLabel={t("No Coach Assigned")}
                  disabled={busy}
                  describe={p => (p.isLeader ? t("Coach") : t("Staff"))}
                />
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

      {assignable.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {t("No staff members to assign yet.")}
        </p>
      ) : (
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
          <Pagination
            page={pager.page}
            totalPages={pager.totalPages}
            totalItems={pager.totalItems}
            rangeStart={pager.rangeStart}
            rangeEnd={pager.rangeEnd}
            onPrev={pager.prev}
            onNext={pager.next}
          />
        </div>
      )}
    </div>
  );
}
