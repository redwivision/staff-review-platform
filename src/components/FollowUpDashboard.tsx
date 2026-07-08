import React, { useState } from "react";
import { FollowUpTask, UserProfile, DevelopmentReview, QuarterlySummary, CoachingRequest } from "../types";
import { 
  Trash2, 
  Edit2, 
  RotateCcw, 
  Save, 
  X, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Ban, 
  FileSpreadsheet,
  Users,
  User,
  Calendar,
  Sparkles,
  ArrowLeft,
  Info,
  Search,
  Filter,
  Check,
  RefreshCw,
  BarChart2
} from "lucide-react";
import { getAutomatedFollowUpTasks, calculateReviewProgress } from "../utils";
import AdminReports from "./AdminReports";

interface FollowUpDashboardProps {
  tasks: FollowUpTask[];
  onSaveTask: (task: FollowUpTask) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  isLeaderView: boolean;
  staffProfiles: UserProfile[];
  allReviews: DevelopmentReview[];
  allSummaries: QuarterlySummary[];
  coachingRequests: CoachingRequest[];
}

export default function FollowUpDashboard({
  tasks,
  onSaveTask,
  onResetDefaults,
  isLeaderView,
  staffProfiles = [],
  allReviews = [],
  allSummaries = [],
  coachingRequests = []
}: FollowUpDashboardProps) {
  const [selectedStaffUid, setSelectedStaffUid] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"oversight" | "accountability">("oversight");
  const [selectedQuarter, setSelectedQuarter] = useState<"1st" | "2nd" | "3rd">("1st");
  const [selectedYear, setSelectedYear] = useState<string>("2025-2026");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FollowUpTask | null>(null);
  const [isResettingDefaults, setIsResettingDefaults] = useState(false);

  // Find selected staff member
  const selectedStaff = staffProfiles.find(s => s.uid === selectedStaffUid);

  // Find the active review for a staff member, quarter, and year
  const getReviewForStaff = (uid: string) => {
    return allReviews.find(r => 
      r.userId === uid && 
      r.quarter === selectedQuarter && 
      (r.year === selectedYear || r.year === selectedYear.replace("-", "/"))
    );
  };

  // Get current active tasks to display (for individual view)
  const getDisplayTasks = () => {
    if (selectedStaffUid === "all" || !selectedStaff) {
      return [];
    }
    const staffReview = getReviewForStaff(selectedStaff.uid);
    return getAutomatedFollowUpTasks(
      selectedStaff.uid,
      selectedStaff.name,
      selectedQuarter,
      selectedYear,
      staffReview,
      tasks
    );
  };

  // Get all tasks across all staff profiles for the selected quarter & year
  const getAllTeamTasks = () => {
    const list: FollowUpTask[] = [];
    staffProfiles.forEach(staff => {
      const staffReview = getReviewForStaff(staff.uid);
      const staffTasks = getAutomatedFollowUpTasks(
        staff.uid,
        staff.name,
        selectedQuarter,
        selectedYear,
        staffReview,
        tasks
      );
      list.push(...staffTasks);
    });
    return list;
  };

  const displayTasks = getDisplayTasks();
  const allTeamTasks = getAllTeamTasks();

  // Apply search query and status filter to All Team View
  const filteredStaffProfiles = staffProfiles.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          staff.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredTeamTasks = allTeamTasks.filter(task => {
    const matchesSearch = (task.staffName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.focus.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStartEdit = (task: FollowUpTask) => {
    if (!isLeaderView) return;
    setEditingTaskId(task.id);
    setEditForm({ ...task, coaches: [...task.coaches] });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    const cleanedCoaches = editForm.coaches.map(c => c.trim()).filter(c => c.length > 0);
    const updated = {
      ...editForm,
      coaches: cleanedCoaches.length > 0 ? cleanedCoaches : ["1. "],
      isOverride: true, // Mark this as a custom leader override
      updatedAt: Date.now()
    };
    await onSaveTask(updated);
    setEditingTaskId(null);
    setEditForm(null);
  };

  const handleResetToAutoSync = async (task: FollowUpTask) => {
    if (!confirm("Are you sure you want to clear your custom supervisor overrides and re-enable live automatic sync for this section?")) {
      return;
    }
    const updated = {
      ...task,
      isOverride: false, // Turn off the custom override flag
      updatedAt: Date.now()
    };
    await onSaveTask(updated);
  };

  const handleResetAllToDefaults = async () => {
    if (!confirm("Are you sure you want to reset all follow-up configurations to their original system defaults? This will erase custom supervisor comments across all staff members.")) {
      return;
    }
    setIsResettingDefaults(true);
    try {
      await onResetDefaults();
    } finally {
      setIsResettingDefaults(false);
    }
  };

  const handleEditFieldChange = (field: keyof FollowUpTask, value: any) => {
    if (!editForm) return;
    setEditForm(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleEditCoachChange = (index: number, val: string) => {
    if (!editForm) return;
    const list = [...editForm.coaches];
    list[index] = val;
    handleEditFieldChange("coaches", list);
  };

  const handleAddEditCoachRow = () => {
    if (!editForm) return;
    handleEditFieldChange("coaches", [...editForm.coaches, ""]);
  };

  const handleRemoveEditCoachRow = (index: number) => {
    if (!editForm) return;
    const list = [...editForm.coaches];
    list.splice(index, 1);
    handleEditFieldChange("coaches", list);
  };

  // Status visual styles matching PDF specs
  const getStatusStyle = (status: FollowUpTask["status"]) => {
    switch (status) {
      case "Completed":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500 ring-emerald-150",
          icon: CheckCircle2
        };
      case "In progress":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500 ring-amber-150",
          icon: Clock
        };
      case "Not started":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          dot: "bg-rose-500 ring-rose-150",
          icon: AlertCircle
        };
      case "Blocked":
        return {
          bg: "bg-slate-100 text-slate-800 border-slate-300",
          dot: "bg-slate-400 ring-slate-200",
          icon: Ban
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          dot: "bg-slate-400 ring-slate-100",
          icon: Info
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/65 px-3 py-1 rounded-full border border-indigo-500/20">
              Leadership Accountability Tool
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/65 px-3 py-1 rounded-full border border-emerald-500/20">
              Live Auto-Syncing
            </span>
          </div>
          <h2 className="text-2xl font-sans font-bold tracking-tight">Follow-Up Accountability Board</h2>
          <p className="text-indigo-200/90 text-xs max-w-2xl">
            This module dynamically tracks review progress across National Ministries. It automatically calculates task status, evaluation stages, and coordinator comments from live staff forms, while giving leaders the power to customize and overwrite entries as needed.
          </p>
        </div>

        {isLeaderView && (
          <button
            onClick={handleResetAllToDefaults}
            disabled={isResettingDefaults}
            className="shrink-0 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/15 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 self-start md:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResettingDefaults ? "animate-spin" : ""}`} />
            <span>Reset All to System Defaults</span>
          </button>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl p-1 gap-1">
        <button
          id="btn-subtab-oversight"
          onClick={() => setActiveTab("oversight")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "oversight"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Oversight Reports</span>
        </button>
        <button
          id="btn-subtab-accountability"
          onClick={() => setActiveTab("accountability")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "accountability"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Follow-Up Accountability Grid</span>
        </button>
      </div>

      {activeTab === "oversight" ? (
        <AdminReports
          registeredUsers={staffProfiles}
          allReviews={allReviews}
          allSummaries={allSummaries}
          coachingRequests={coachingRequests}
          currentQuarter={selectedQuarter}
          currentYear={selectedYear.replace("-", "/")}
          onViewStaffFollowUp={(staffUid) => {
            setActiveTab("accountability");
            setSelectedStaffUid(staffUid);
          }}
        />
      ) : (
        <>
          {/* FILTER & SELECTOR BAR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Tracking Focus:</span>
          </div>
          
          <select 
            id="followup-staff-selector"
            value={selectedStaffUid}
            onChange={(e) => {
              setSelectedStaffUid(e.target.value);
              handleCancelEdit();
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 font-semibold text-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">👥 All Team Overview & Master Matrix</option>
            {staffProfiles.map(s => (
              <option key={s.uid} value={s.uid}>
                👤 {s.name} ({s.role})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quarter selection */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => { setSelectedQuarter("1st"); handleCancelEdit(); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedQuarter === "1st" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Q1
            </button>
            <button
              onClick={() => { setSelectedQuarter("2nd"); handleCancelEdit(); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedQuarter === "2nd" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Q2
            </button>
            <button
              onClick={() => { setSelectedQuarter("3rd"); handleCancelEdit(); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedQuarter === "3rd" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Q3
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{selectedYear}</span>
          </div>
        </div>
      </div>

      {/* TEAM OVERVIEW VIEW */}
      {selectedStaffUid === "all" ? (
        <div className="space-y-8">
          {/* SEARCH & GLOBAL FILTER BAR FOR MASTER GRID */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by staff name, role, or focus area..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500">Status filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="Not started">🔴 Not started</option>
                <option value="In progress">🟡 In progress</option>
                <option value="Completed">🟢 Completed</option>
                <option value="Blocked">⚪ Blocked</option>
              </select>
            </div>
          </div>

          {/* Cards section */}
          <div className="space-y-4">
            <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Registered Staff Evaluation Status — {selectedQuarter} Quarter
            </h3>

            {filteredStaffProfiles.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                <Users className="w-10 h-10 text-slate-200 mx-auto mb-2 animate-pulse" />
                <p className="font-sans font-bold text-slate-600 text-xs">No matching staff profiles found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStaffProfiles.map(staff => {
                  const review = getReviewForStaff(staff.uid);
                  const progress = calculateReviewProgress(review);

                  return (
                    <div 
                      key={staff.uid}
                      className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-5 relative group"
                    >
                      <div className="space-y-3">
                        {/* Staff Header */}
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-sans font-bold text-slate-800 text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                              {staff.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 inline-block mt-1">
                              {staff.role}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            review?.status === "Submitted" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : review?.status === "Draft" 
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            {review?.status || "No Form"}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1 pt-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500">
                            <span>Evaluation Fill Rate</span>
                            <span>{progress.percentage}% ({progress.totalFilled}/{progress.totalFields})</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Mini quadrants check */}
                        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100">
                          {/* Q1: Heart Walk */}
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                            <span className={`w-2 h-2 rounded-full ${
                              progress.heartFilled === 9 
                                ? "bg-emerald-500" 
                                : progress.heartFilled > 0 
                                  ? "bg-amber-500" 
                                  : "bg-rose-500"
                            }`} />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-sans font-semibold text-slate-700">1. Heart Walk</span>
                              <span className="text-[9px] font-mono text-slate-400">{progress.heartFilled}/9 fields</span>
                            </div>
                          </div>

                          {/* Q2: Personal Life */}
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                            <span className={`w-2 h-2 rounded-full ${
                              progress.personalFilled === 9 
                                ? "bg-emerald-500" 
                                : progress.personalFilled > 0 
                                  ? "bg-amber-500" 
                                  : "bg-rose-500"
                            }`} />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-sans font-semibold text-slate-700">2. Personal Life</span>
                              <span className="text-[9px] font-mono text-slate-400">{progress.personalFilled}/9 fields</span>
                            </div>
                          </div>

                          {/* Q3: Relational Life */}
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                            <span className={`w-2 h-2 rounded-full ${
                              progress.relationalFilled === 9 
                                ? "bg-emerald-500" 
                                : progress.relationalFilled > 0 
                                  ? "bg-amber-500" 
                                  : "bg-rose-500"
                            }`} />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-sans font-semibold text-slate-700">3. Relational</span>
                              <span className="text-[9px] font-mono text-slate-400">{progress.relationalFilled}/9 fields</span>
                            </div>
                          </div>

                          {/* Q4: Ministry */}
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                            <span className={`w-2 h-2 rounded-full ${
                              progress.ministryFilled === 9 
                                ? "bg-emerald-500" 
                                : progress.ministryFilled > 0 
                                  ? "bg-amber-500" 
                                  : "bg-rose-500"
                            }`} />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-sans font-semibold text-slate-700">4. Ministry</span>
                              <span className="text-[9px] font-mono text-slate-400">{progress.ministryFilled}/9 fields</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        id={`view-staff-followup-grid-${staff.uid}`}
                        onClick={() => {
                          setSelectedStaffUid(staff.uid);
                          handleCancelEdit();
                        }}
                        className="w-full mt-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm border border-indigo-100"
                      >
                        <span>Configure Individual Grid</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MASTER COMPREHENSIVE TABLE SECTION */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Master Consolidated Follow-Up Grid
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  View and manage follow-ups for all staff members simultaneously. Live progress is automatically generated below!
                </p>
              </div>
              <span className="text-xs text-indigo-600 font-mono font-bold bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
                Showing {filteredTeamTasks.length} quadrant trackers
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs font-mono uppercase tracking-wider border-b border-slate-800">
                      <th className="py-4 px-5 font-bold min-w-[160px]">Staff Member</th>
                      <th className="py-4 px-4 font-bold min-w-[150px]">Task / Focus</th>
                      <th className="py-4 px-4 font-bold min-w-[130px]">Coach / Leader</th>
                      <th className="py-4 px-4 font-bold min-w-[160px]">Coaches Section</th>
                      <th className="py-4 px-4 font-bold min-w-[120px]">Current Stage</th>
                      <th className="py-4 px-4 font-bold min-w-[140px]">Status</th>
                      <th className="py-4 px-4 font-bold min-w-[120px]">Due Date</th>
                      <th className="py-4 px-5 font-bold min-w-[240px]">Coordinator Comments / Live Updates</th>
                      {isLeaderView && <th className="py-4 px-5 text-right font-bold min-w-[120px]">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeamTasks.map(task => {
                      const isEditing = editingTaskId === task.id;
                      const statusInfo = getStatusStyle(isEditing ? editForm?.status || task.status : task.status);

                      return (
                        <tr 
                          key={task.id} 
                          className={`hover:bg-slate-50/50 transition-colors ${isEditing ? "bg-indigo-50/25" : ""} ${task.isOverride ? "bg-indigo-50/5" : ""}`}
                        >
                          {/* STAFF PROFILE CELL */}
                          <td className="py-4 px-5 align-top">
                            <div className="font-sans font-bold text-slate-800 text-xs">
                              {task.staffName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {selectedQuarter} Quarter
                            </div>
                          </td>

                          {/* TASK / FOCUS */}
                          <td className="py-4 px-4 align-top">
                            <div className="font-sans font-bold text-slate-900 text-xs">
                              {task.focus}
                            </div>
                            {task.isOverride && (
                              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <Sparkles className="w-2 h-2" />
                                Override Active
                              </span>
                            )}
                          </td>

                          {/* COACH / LEADER */}
                          <td className="py-4 px-4 align-top">
                            {isEditing && editForm ? (
                              <input 
                                type="text"
                                value={editForm.coachLeader}
                                onChange={e => handleEditFieldChange("coachLeader", e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            ) : (
                              <div className="font-sans font-medium text-slate-700 text-xs">
                                {task.coachLeader || "—"}
                              </div>
                            )}
                          </td>

                          {/* COACHES SECTION */}
                          <td className="py-4 px-4 align-top">
                            {isEditing && editForm ? (
                              <div className="space-y-1.5">
                                {editForm.coaches.map((c, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <span className="text-[10px] font-mono text-slate-400">{idx + 1}.</span>
                                    <input 
                                      type="text"
                                      value={c}
                                      onChange={e => handleEditCoachChange(idx, e.target.value)}
                                      className="flex-1 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] bg-white"
                                      placeholder={`Coach ${idx + 1}`}
                                    />
                                    {editForm.coaches.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEditCoachRow(idx)}
                                        className="text-rose-500 hover:text-rose-700 p-0.5"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={handleAddEditCoachRow}
                                  className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                                >
                                  ➕ Add Coach
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {task.coaches && task.coaches.length > 0 ? (
                                  task.coaches.map((coach, idx) => (
                                    <div key={idx} className="text-[11px] font-mono text-slate-600 flex items-start gap-1">
                                      <span className="text-slate-400 font-bold">{idx + 1}.</span>
                                      <span>{coach}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400 italic">None</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* CURRENT STAGE */}
                          <td className="py-4 px-4 align-top">
                            {isEditing && editForm ? (
                              <select 
                                value={editForm.currentStage}
                                onChange={e => handleEditFieldChange("currentStage", e.target.value)}
                                className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs bg-white"
                              >
                                <option value="Pre event">Pre event</option>
                                <option value="Day of">Day of</option>
                                <option value="Post event">Post event</option>
                              </select>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                                {task.currentStage}
                              </span>
                            )}
                          </td>

                          {/* STATUS */}
                          <td className="py-4 px-4 align-top">
                            {isEditing && editForm ? (
                              <select 
                                value={editForm.status}
                                onChange={e => handleEditFieldChange("status", e.target.value)}
                                className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs bg-white"
                              >
                                <option value="Not started">🔴 Not started</option>
                                <option value="In progress">🟡 In progress</option>
                                <option value="Completed">🟢 Completed</option>
                                <option value="Blocked">⚪ Blocked</option>
                              </select>
                            ) : (
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statusInfo.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ring-1 ${statusInfo.dot}`} />
                                {task.status}
                              </div>
                            )}
                          </td>

                          {/* DUE DATE */}
                          <td className="py-4 px-4 align-top">
                            {isEditing && editForm ? (
                              <input 
                                type="text"
                                value={editForm.dueDate}
                                onChange={e => handleEditFieldChange("dueDate", e.target.value)}
                                className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs bg-white font-mono"
                              />
                            ) : (
                              <div className="font-mono text-[11px] text-slate-600 font-semibold">
                                {task.dueDate}
                              </div>
                            )}
                          </td>

                          {/* COORDINATOR COMMENTS */}
                          <td className="py-4 px-5 align-top">
                            {isEditing && editForm ? (
                              <textarea 
                                value={editForm.coordinatorFollowup}
                                onChange={e => handleEditFieldChange("coordinatorFollowup", e.target.value)}
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-white font-sans"
                                rows={2}
                                placeholder="Coordinator follow-up comments..."
                              />
                            ) : (
                              <p className="text-slate-600 text-xs leading-normal font-sans max-w-xs">
                                {task.coordinatorFollowup || <span className="text-slate-300 italic">No notes</span>}
                              </p>
                            )}
                          </td>

                          {/* ACTIONS */}
                          {isLeaderView && (
                            <td className="py-4 px-5 align-top text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      id={`master-save-followup-${task.id}`}
                                      onClick={handleSaveEdit}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition-colors border border-emerald-200"
                                      title="Save Changes"
                                    >
                                      <Save className="w-3 h-3" />
                                    </button>
                                    <button
                                      id={`master-cancel-followup-${task.id}`}
                                      onClick={handleCancelEdit}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded transition-colors border border-slate-300"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      id={`master-edit-followup-${task.id}`}
                                      onClick={() => handleStartEdit(task)}
                                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 rounded transition-colors border border-slate-200"
                                      title="Edit Override"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    {task.isOverride && (
                                      <button
                                        id={`master-reset-followup-${task.id}`}
                                        onClick={() => handleResetToAutoSync(task)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-colors border border-rose-200"
                                        title="Reset to Live Auto-Sync"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* INDIVIDUAL STAFF MODE — AUTOMATIC 4-ROW PDF TABLE LAYOUT */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={() => { setSelectedStaffUid("all"); handleCancelEdit(); }}
              className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1.5 self-start shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Team Overview
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Currently viewing follow-ups for:</span>
              <span className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold font-sans">
                {selectedStaff?.name} ({selectedStaff?.role})
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-sans font-bold text-xs text-amber-800">Dynamic Progress Sync is Active</h4>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                The **Status**, **Current Stage**, and **Coordinator comments** below are synchronized automatically in real time with {selectedStaff?.name}'s active {selectedQuarter} Quarter form entries. Clicking **Edit** allows you to save supervisor overrides (custom coaches, manual statuses, target due dates). You can return a row to automatic sync anytime using the reset icon!
              </p>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs font-mono uppercase tracking-wider border-b border-slate-800">
                    <th className="py-4 px-5 font-bold min-w-[150px]">Task / Focus</th>
                    <th className="py-4 px-4 font-bold min-w-[140px]">Coach / Leader</th>
                    <th className="py-4 px-4 font-bold min-w-[180px]">Coaches Section</th>
                    <th className="py-4 px-4 font-bold min-w-[120px]">Current Stage</th>
                    <th className="py-4 px-4 font-bold min-w-[140px]">Status</th>
                    <th className="py-4 px-4 font-bold min-w-[130px]">Due Date</th>
                    <th className="py-4 px-5 font-bold min-w-[240px]">Coordinator / Followup</th>
                    {isLeaderView && <th className="py-4 px-5 text-right font-bold min-w-[120px]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayTasks.map(task => {
                    const isEditing = editingTaskId === task.id;
                    const statusInfo = getStatusStyle(isEditing ? editForm?.status || task.status : task.status);

                    return (
                      <tr 
                        key={task.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${isEditing ? "bg-indigo-50/25" : ""} ${task.isOverride ? "bg-indigo-50/5" : ""}`}
                      >
                        {/* 1. FOCUS */}
                        <td className="py-4 px-5 align-top">
                          <div className="font-sans font-bold text-slate-900 text-sm">
                            {task.focus}
                          </div>
                          {task.isOverride && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                              <Sparkles className="w-2.5 h-2.5" />
                              Custom Override
                            </span>
                          )}
                        </td>

                        {/* 2. COACH / LEADER */}
                        <td className="py-4 px-4 align-top">
                          {isEditing && editForm ? (
                            <input 
                              type="text"
                              value={editForm.coachLeader}
                              onChange={e => handleEditFieldChange("coachLeader", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <div className="font-sans font-medium text-slate-700 text-sm">
                              {task.coachLeader || "—"}
                            </div>
                          )}
                        </td>

                        {/* 3. COACHES */}
                        <td className="py-4 px-4 align-top">
                          {isEditing && editForm ? (
                            <div className="space-y-2">
                              {editForm.coaches.map((c, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <span className="text-[11px] font-mono text-slate-400">{idx + 1}.</span>
                                  <input 
                                    type="text"
                                    value={c}
                                    onChange={e => handleEditCoachChange(idx, e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-lg px-2 py-0.5 text-xs bg-white"
                                    placeholder={`Coach ${idx + 1}`}
                                  />
                                  {editForm.coaches.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditCoachRow(idx)}
                                      className="text-rose-500 hover:text-rose-700 p-0.5"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={handleAddEditCoachRow}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 mt-1"
                              >
                                ➕ Add Coach
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {task.coaches && task.coaches.length > 0 ? (
                                task.coaches.map((coach, idx) => (
                                  <div key={idx} className="text-xs font-mono text-slate-600 flex items-start gap-1">
                                    <span className="text-slate-400 font-bold">{idx + 1}.</span>
                                    <span>{coach}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">None assigned</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 4. CURRENT STAGE */}
                        <td className="py-4 px-4 align-top">
                          {isEditing && editForm ? (
                            <select 
                              value={editForm.currentStage}
                              onChange={e => handleEditFieldChange("currentStage", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                            >
                              <option value="Pre event">Pre event</option>
                              <option value="Day of">Day of</option>
                              <option value="Post event">Post event</option>
                            </select>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-700">
                              {task.currentStage}
                            </span>
                          )}
                        </td>

                        {/* 5. STATUS (🟢 🟡 🔴 ⚪) */}
                        <td className="py-4 px-4 align-top">
                          {isEditing && editForm ? (
                            <select 
                              value={editForm.status}
                              onChange={e => handleEditFieldChange("status", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                            >
                              <option value="Not started">🔴 Not started</option>
                              <option value="In progress">🟡 In progress</option>
                              <option value="Completed">🟢 Completed</option>
                              <option value="Blocked">⚪ Blocked</option>
                            </select>
                          ) : (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${statusInfo.bg}`}>
                              <span className={`w-2 h-2 rounded-full ring-2 ${statusInfo.dot}`} />
                              {task.status}
                            </div>
                          )}
                        </td>

                        {/* 6. DUE DATE */}
                        <td className="py-4 px-4 align-top">
                          {isEditing && editForm ? (
                            <input 
                              type="text"
                              value={editForm.dueDate}
                              onChange={e => handleEditFieldChange("dueDate", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                            />
                          ) : (
                            <div className="font-mono text-xs text-slate-600 font-semibold mt-0.5">
                              {task.dueDate}
                            </div>
                          )}
                        </td>

                        {/* 7. COORDINATOR COMMENTS */}
                        <td className="py-4 px-5 align-top">
                          {isEditing && editForm ? (
                            <textarea 
                              value={editForm.coordinatorFollowup}
                              onChange={e => handleEditFieldChange("coordinatorFollowup", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-sans"
                              rows={3}
                              placeholder="Write coordinator comments or status tracking notes..."
                            />
                          ) : (
                            <p className="text-slate-600 text-xs leading-relaxed font-sans max-w-sm">
                              {task.coordinatorFollowup || <span className="text-slate-300 italic">No notes</span>}
                            </p>
                          )}
                        </td>

                        {/* 8. ACTIONS */}
                        {isLeaderView && (
                          <td className="py-4 px-5 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    id={`save-override-followup-${task.id}`}
                                    onClick={handleSaveEdit}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors border border-emerald-200"
                                    title="Save Changes"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    id={`cancel-override-followup-${task.id}`}
                                    onClick={handleCancelEdit}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors border border-slate-300"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    id={`edit-override-followup-${task.id}`}
                                    onClick={() => handleStartEdit(task)}
                                    className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 rounded-lg transition-colors border border-slate-200"
                                    title="Edit / Override Follow-Up"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {task.isOverride && (
                                    <button
                                      id={`reset-override-followup-${task.id}`}
                                      onClick={() => handleResetToAutoSync(task)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-rose-200"
                                      title="Reset to Live Auto-Sync"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
