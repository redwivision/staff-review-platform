import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";
import { Users, UserX, Shield, ShieldCheck, Mail, Briefcase, RefreshCw, Star } from "lucide-react";

interface UserManagementProps {
  currentUser: UserProfile;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
          if (a.email === "lewikb13@gmail.com") return -1;
          if (b.email === "lewikb13@gmail.com") return 1;
          if (a.isAdmin && !b.isAdmin) return -1;
          if (!a.isAdmin && b.isAdmin) return 1;
          if (a.isLeader && !b.isLeader) return -1;
          if (!a.isLeader && b.isLeader) return 1;
          return a.name.localeCompare(b.name);
        });
        setUsers(localUsers);
        return;
      }

      const querySnapshot = await getDocs(collection(db, "users"));
      const userList: UserProfile[] = [];
      querySnapshot.forEach(doc => {
        userList.push(doc.data() as UserProfile);
      });
      // Sort: Admin first, then leader status, then name
      userList.sort((a, b) => {
        if (a.email === "lewikb13@gmail.com") return -1;
        if (b.email === "lewikb13@gmail.com") return 1;
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
    const isCurrentAdmin = currentUser.email === "lewikb13@gmail.com" || currentUser.isAdmin === true || currentUser.role?.toLowerCase() === "admin";
    if (!isCurrentAdmin) {
      alert("Access Denied: Only administrators can update user roles.");
      return;
    }
    if (targetUser.email === "lewikb13@gmail.com") {
      alert("Validation Error: The platform owner's role cannot be modified.");
      return;
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

      const userRef = doc(db, "users", targetUser.uid);
      const newRole = newIsAdmin ? "Admin" : (newIsLeader ? "Coach" : "Staff");
      await updateDoc(userRef, { 
        isLeader: newIsLeader,
        isAdmin: newIsAdmin,
        role: newRole
      });
      
      // Update local state
      setUsers(prev =>
        prev.map(u => (u.uid === targetUser.uid ? { ...u, isLeader: newIsLeader, isAdmin: newIsAdmin, role: newRole } : u))
      );
    } catch (err) {
      console.error("Failed to update user role:", err);
      alert("Error updating user permission in Firestore. Please verify security permissions.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div id="user-management-container" className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
      <div className="p-6 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-sans font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            User Access Control Directory
          </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assign and modify access levels of staff members between Team Member, Coach, and Administrator.
          </p>
        </div>
        <button
          id="refresh-users-btn"
          onClick={fetchUsers}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Users
        </button>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
            Retrieving authenticated users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
            <UserX className="w-10 h-10 text-slate-300" />
            <p className="text-sm">No registered staff profiles discovered.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider font-mono">
                <th className="px-6 py-3.5">Full Name</th>
                <th className="px-6 py-3.5">Email Address</th>
                <th className="px-6 py-3.5">Assigned Title/Role</th>
                <th className="px-6 py-3.5">Access Level</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {users.map(u => {
                const isOwner = u.email === "lewikb13@gmail.com";
                return (
                  <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {isOwner && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
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
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Platform Owner
                        </span>
                      ) : u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Administrator
                        </span>
                      ) : u.isLeader ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Coach / Leader
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          Team Member
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isOwner ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">Root Owner</span>
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
                            <option value="member">Team Member</option>
                            <option value="coach">Coach</option>
                            <option value="admin">Admin</option>
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
    </div>
  );
}
