import React, { useMemo, useState, useEffect } from "react";
import { getAllStaff } from "../supabaseDb";
import { dataUpdateUserProfile, dataUpdateAssignedCoach } from "../dataLayer";
import { UserProfile } from "../types";
import { Users, UserX, Shield, ShieldCheck, Mail, Briefcase, RefreshCw, Star, Search } from "lucide-react";
import { useLanguage } from "../i18n";
import StaffPicker from "./StaffPicker";
import Pagination from "./Pagination";
import { searchPeople, useDebouncedValue, usePagination } from "../utils/search";

interface UserManagementProps {
  currentUser: UserProfile;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingCoachId, setUpdatingCoachId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "coach" | "member">("all");

  const PAGE_SIZE = 25;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Check if we are in local bypass mode
      const savedLocalUser = localStorage.getItem("staff_review_bypass_user");
      if (savedLocalUser && JSON.parse(savedLocalUser).uid.startsWith("bypass_")) {
        const localUsersStr = localStorage.getItem("staff_review_bypass_users") || "[]";
        let localUsers = JSON.parse(localUsersStr) as UserProfile[];
        
        // Add current owner to the list if not present
        const owner = JSON.parse(savedLocalUser) as UserProfile;
        if (!localUsers.some(u => u.uid === owner.uid)) {
          localUsers.push(owner);
        }

        localUsers.sort((a, b) => {
          if (a.isAdmin && !b.isAdmin) return -1;
          if (!a.isAdmin && b.isAdmin) return 1;
          if (a.isLeader && !b.isLeader) return -1;
          if (!a.isLeader && b.isLeader) return 1;
          return a.name.localeCompare(b.name);
        });
        setUsers(localUsers);
        return;
      }

      // Cloud mode: use Supabase
      const userList = await getAllStaff();
      // Sort: Admin first, then leader status, then name
      userList.sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        if (a.isLeader && !b.isLeader) return -1;
        if (!a.isLeader && b.isLeader) return 1;
        return a.name.localeCompare(b.name);
      });
      setUsers(userList);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (targetUser: UserProfile, newIsLeader: boolean, newIsAdmin: boolean) => {
    // Only admins (per the DB profile) may change roles.
    if (!currentUser.isAdmin) {
      alert(t("Access Denied: Only administrators can update user roles."));
      return;
    }

    // Prevent demoting yourself (avoids locking the current admin out).
    if (targetUser.uid === currentUser.uid) {
      alert(t("Validation Error: You cannot change your own role. Ask another administrator to manage it."));
      return;
    }

    // Prevent removing the last administrator (would lock everyone out).
    if (targetUser.isAdmin && newIsAdmin === false) {
      const adminCount = users.filter(u => u.isAdmin).length;
      if (adminCount <= 1) {
        alert(t("Validation Error: Cannot demote the last remaining administrator."));
        return;
      }
    }

    setUpdatingId(targetUser.uid);
    try {
      // Check if we are in local bypass mode
      const savedLocalUser = localStorage.getItem("staff_review_bypass_user");
      if (savedLocalUser && JSON.parse(savedLocalUser).uid.startsWith("bypass_")) {
        const localUsersStr = localStorage.getItem("staff_review_bypass_users") || "[]";
        let localUsers = JSON.parse(localUsersStr) as UserProfile[];
        const newRole = newIsAdmin ? "Admin" : (newIsLeader ? "Coach" : "Staff");
        
        localUsers = localUsers.map(u => (u.uid === targetUser.uid ? { ...u, isLeader: newIsLeader, isAdmin: newIsAdmin, role: newRole } : u));
        localStorage.setItem("staff_review_bypass_users", JSON.stringify(localUsers));

        // Also update individual bypass user profile if they are currently logged in as that user
        const owner = JSON.parse(savedLocalUser) as UserProfile;
        if (owner.uid === targetUser.uid) {
          owner.isLeader = newIsLeader;
          owner.isAdmin = newIsAdmin;
          owner.role = newRole;
          localStorage.setItem("staff_review_bypass_user", JSON.stringify(owner));
        }

        setUsers(prev =>
          prev.map(u => (u.uid === targetUser.uid ? { ...u, isLeader: newIsLeader, isAdmin: newIsAdmin, role: newRole } : u))
        );
        return;
      }

      const newRole = newIsAdmin ? "Admin" : (newIsLeader ? "Coach" : "Staff");
      try {
        await dataUpdateUserProfile(targetUser.uid, { isLeader: newIsLeader, isAdmin: newIsAdmin, role: newRole });
      } catch (e) {
        // The RLS policy (users_admin_update) is the source of truth. If the DB
        // rejects the write, surface an explicit error instead of silently
        // pretending it worked.
        console.error("Role update rejected by database:", e);
        alert(t("Permission update was rejected by the database. Only an administrator can change roles, and you cannot modify the platform owner."));
        return;
      }
      
      // Update local state
      setUsers(prev =>
        prev.map(u => (u.uid === targetUser.uid ? { ...u, isLeader: newIsLeader, isAdmin: newIsAdmin, role: newRole } : u))
      );
    } catch (err) {
      console.error("Failed to update user role:", err);
      alert(t("Error updating user permission. Please verify database access."));
    } finally {
      setUpdatingId(null);
    }
  };

  // Admin-only: assign or clear a staff member's coach.
  //
  // The database is the authority. users_admin_update lets an admin change any
  // row's coach_uid, and the SECURITY DEFINER trigger sync_assigned_coach()
  // then marks the assigned person a Team Leader and refuses self-assignment.
  // The client never grants privileges itself.
  const updateAssignedCoach = async (targetUser: UserProfile, coachUid: string | null) => {
    if (!currentUser.isAdmin) {
      alert(t("Access Denied: Only administrators can assign coaches."));
      return;
    }

    setUpdatingCoachId(targetUser.uid);

    // The database trigger also promotes a newly assigned coach to leader, so
    // reflect that immediately instead of leaving a stale "Team Member" badge
    // until the next reload. Clearing a coach does not demote, so isLeader is
    // left alone in that case.
    const patch = (u: UserProfile): UserProfile => {
      if (u.uid === targetUser.uid) return { ...u, coachUid };
      // The badge that goes stale is the *coach's*, not the member's: the
      // trigger marks the newly assigned coach a Team Leader. Marking the
      // member instead would promote the wrong person.
      if (coachUid && u.uid === coachUid) return { ...u, isLeader: true };
      return u;
    };

    try {
      // Local bypass mode keeps everything in localStorage.
      const savedLocalUser = localStorage.getItem("staff_review_bypass_user");
      if (savedLocalUser && JSON.parse(savedLocalUser).uid.startsWith("bypass_")) {
        const localUsers = JSON.parse(localStorage.getItem("staff_review_bypass_users") || "[]") as UserProfile[];
        localStorage.setItem("staff_review_bypass_users", JSON.stringify(localUsers.map(patch)));

        const owner = JSON.parse(savedLocalUser) as UserProfile;
        if (owner.uid === targetUser.uid) {
          localStorage.setItem("staff_review_bypass_user", JSON.stringify(patch(owner)));
        }

        setUsers(localUsers.map(patch));
        return;
      }

      await dataUpdateAssignedCoach(targetUser.uid, coachUid);

      setUsers(prev => prev.map(patch));
    } catch (err) {
      console.error("Failed to update assigned coach:", err);
      alert(t("Error updating assigned coach. The database rejected the change."));
    } finally {
      setUpdatingCoachId(null);
    }
  };

  // Anyone can be assigned as a coach — the database promotes them to Team
  // Leader automatically. Listing only existing leaders left the dropdown empty
  // on a fresh install, where nobody is a leader yet, so the client appeared to
  // have no way to assign coaches at all. A person is never offered as their own
  // coach; existing leaders are simply listed first for convenience.
  // Sorted ONCE. The old version re-filtered and re-sorted the whole roster for
  // every row, which at a few thousand staff meant an O(n log n) sort per row.
  // Only the single self-reference differs per row, and StaffPicker filters
  // that out itself via excludeUid.
  const coachOptions = useMemo(
    () =>
      [...users].sort(
        (a, b) => Number(b.isLeader) - Number(a.isLeader) || a.name.localeCompare(b.name)
      ),
    [users]
  );

  const visibleUsers = useMemo(() => {
    const byRole = (u: UserProfile) => {
      if (roleFilter === "admin") return u.isAdmin;
      if (roleFilter === "coach") return !u.isAdmin && u.isLeader;
      if (roleFilter === "member") return !u.isAdmin && !u.isLeader;
      return true;
    };
    return searchPeople(users.filter(byRole), debouncedSearch, 5000).results;
  }, [users, roleFilter, debouncedSearch]);

  const pager = usePagination(visibleUsers, PAGE_SIZE);

  return (
    <div id="user-management-container" className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
      <div className="p-6 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-sans font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t("User Access Control Directory")}
          </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("Assign and modify access levels of staff members between Team Member, Coach, and Administrator.")}
          </p>
        </div>
        <button
          id="refresh-users-btn"
          onClick={fetchUsers}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t("Sync Users")}
        </button>
      </div>

      <div className="px-6 py-3 border-b border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="user-directory-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("Search staff by name or email...")}
            aria-label={t("Search staff by name or email")}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(["all", "admin", "coach", "member"] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                roleFilter === r
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {r === "all" ? t("All") : r === "admin" ? t("Admins") : r === "coach" ? t("Coaches") : t("Members")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
            {t("Retrieving authenticated users...")}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
            <UserX className="w-10 h-10 text-slate-300" />
            <p className="text-sm">{t("No registered staff profiles discovered.")}</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider font-mono">
                <th className="px-6 py-3.5">{t("Full Name")}</th>
                <th className="px-6 py-3.5">{t("Email Address")}</th>
                <th className="px-6 py-3.5">{t("Assigned Title/Role")}</th>
                <th className="px-6 py-3.5">{t("Access Level")}</th>
                <th className="px-6 py-3.5">{t("Assigned Coach")}</th>
                <th className="px-6 py-3.5 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {pager.pageItems.map(u => {
                return (
                  <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {u.isAdmin && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      {u.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        {u.role}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {t("Administrator")}
                        </span>
                      ) : u.isLeader ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {t("Coach / Leader")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          {t("Team Member")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StaffPicker
                        id={`coach-select-${u.uid}`}
                        people={coachOptions}
                        value={u.coachUid}
                        onChange={uid => updateAssignedCoach(u, uid)}
                        excludeUid={u.uid}
                        clearLabel={t("No Coach")}
                        disabled={updatingCoachId === u.uid}
                        describe={p => (p.isLeader ? t("Coach / Leader") : p.role)}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.uid === currentUser.uid ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-md">{t("You")}</span>
                      ) : (
                        <div className="flex items-center justify-end">
                          <select
                            id={`role-select-${u.uid}`}
                            value={u.isAdmin ? "admin" : u.isLeader ? "coach" : "member"}
                            disabled={updatingId === u.uid}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "admin") {
                                updateUserRole(u, true, true);
                              } else if (val === "coach") {
                                updateUserRole(u, true, false);
                              } else {
                                updateUserRole(u, false, false);
                              }
                            }}
                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                          >
                            <option value="member">{t("Team Member")}</option>
                            <option value="coach">{t("Coach")}</option>
                            <option value="admin">{t("Admin")}</option>
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && users.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-150 dark:border-slate-800">
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
