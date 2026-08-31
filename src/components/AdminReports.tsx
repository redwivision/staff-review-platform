import React, { useState, useMemo } from "react";
import { UserProfile, DevelopmentReview, QuarterlySummary, CoachingRequest } from "../types";
import { 
  Users, 
  TrendingUp, 
  FileSpreadsheet, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  Star, 
  MessageSquare, 
  BookOpen,
  Filter,
  BarChart2,
  ThumbsUp,
  FileCheck2,
  X,
  Printer,
  HelpCircle
} from "lucide-react";

import { DEVELOPMENT_REVIEW_SECTIONS } from "../constants";
import { useLanguage } from "../i18n";

interface AdminReportsProps {
  registeredUsers: UserProfile[];
  allReviews: DevelopmentReview[];
  allSummaries: QuarterlySummary[];
  coachingRequests: CoachingRequest[];
  currentQuarter: "1st" | "2nd" | "3rd";
  currentYear: string;
  onViewStaffFollowUp?: (staffUid: string) => void;
}

export default function AdminReports({
  registeredUsers,
  allReviews,
  allSummaries,
  coachingRequests,
  currentQuarter,
  currentYear,
  onViewStaffFollowUp
}: AdminReportsProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"staff" | "coaches">("staff");
  const [reportQuarter, setReportQuarter] = useState<"1st" | "2nd" | "3rd">(currentQuarter);
  const [reportYear, setReportYear] = useState<string>(currentYear);
  const [staffSearch, setStaffSearch] = useState("");
  const [coachSearch, setCoachSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeReportMember, setActiveReportMember] = useState<{ member: UserProfile, coachSummaries: QuarterlySummary[], baseSummary?: QuarterlySummary } | null>(null);
  const [viewFullSummaryDetails, setViewFullSummaryDetails] = useState<QuarterlySummary | null>(null);

  // Helper: Calculate completion count for a review's section data
  const calculateSectionFilledCount = (section: { strengths: string[]; needsImprovement: string[]; suggestedActionPoints: string[] }) => {
    if (!section) return 0;
    const strengthsCount = (section.strengths || []).filter(s => s && s.trim() !== "").length;
    const needsCount = (section.needsImprovement || []).filter(n => n && n.trim() !== "").length;
    const actionCount = (section.suggestedActionPoints || []).filter(a => a && a.trim() !== "").length;
    return strengthsCount + needsCount + actionCount;
  };

  // Helper: Calculate total completion percentage for a review (out of 36 expected fields)
  const calculateReviewProgress = (review: DevelopmentReview | undefined) => {
    if (!review) return 0;
    let filled = 0;
    filled += calculateSectionFilledCount(review.heart);
    filled += calculateSectionFilledCount(review.personalLife);
    filled += calculateSectionFilledCount(review.relationalLife);
    filled += calculateSectionFilledCount(review.ministryEffectiveness);
    // 4 sections * 9 fields = 36 total
    return Math.min(100, Math.round((filled / 36) * 100));
  };

  // 1. STAFF REPORT DATA GENERATION (Focus on Quarterly Summary Form)
  const staffReportData = useMemo(() => {
    return registeredUsers.map(staff => {
      // Find summary PDP for the current quarter and year
      const summary = allSummaries.find(
        s => s.userId === staff.uid && s.quarter === reportQuarter && s.year === reportYear && !s.coachUid
      );

      // Check coaching relationship
      const coachingRel = coachingRequests.find(
        req => req.memberId === staff.uid && req.status === "approved" && req.acceptedByCoach === "accepted"
      );

      // Find any completed evaluation (submitted by coach or self)
      const allMemberSummaries = allSummaries.filter(
        s => s.userId === staff.uid && s.quarter === reportQuarter && s.year === reportYear
      );
      
      const coachSummaries = allMemberSummaries.filter(s => !!s.coachUid);
      const coachSubmitted = coachSummaries.find(s => s.status === "CoachSubmitted");
      const approved = coachSummaries.find(s => s.evaluation?.formReviewedBy);

      let status: "Not Started" | "Draft" | "Submitted" | "CoachSubmitted" | "Approved" = "Not Started";
      if (summary) {
        if (approved) {
          status = "Approved";
        } else if (coachSubmitted) {
          status = "CoachSubmitted";
        } else if (summary.status === "Submitted") {
          status = "Submitted";
        } else {
          status = "Draft";
        }
      }

      return {
        uid: staff.uid,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        status,
        hasSummary: !!summary,
        coachName: coachingRel?.coachName || "No coach assigned",
        updatedAt: summary?.updatedAt || staff.createdAt
      };
    });
  }, [registeredUsers, allSummaries, coachingRequests, reportQuarter, reportYear]);

  // Filtered lists
  const filteredStaff = useMemo(() => {
    return staffReportData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(staffSearch.toLowerCase()) || 
                            item.email.toLowerCase().includes(staffSearch.toLowerCase()) ||
                            item.role.toLowerCase().includes(staffSearch.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
                            (statusFilter === "approved" && item.status === "Approved") ||
                            (statusFilter === "coach_submitted" && item.status === "CoachSubmitted") ||
                            (statusFilter === "submitted" && item.status === "Submitted") ||
                            (statusFilter === "draft" && item.status === "Draft") ||
                            (statusFilter === "not_started" && item.status === "Not Started");
      
      return matchesSearch && matchesStatus;
    });
  }, [staffReportData, staffSearch, statusFilter]);

  // Bento Statistics Calculations
  const stats = useMemo(() => {
    const totalStaff = staffReportData.length;
    const draftCount = staffReportData.filter(s => s.status === "Draft").length;
    const submittedCount = staffReportData.filter(s => s.status === "Submitted").length;
    const coachSubmittedCount = staffReportData.filter(s => s.status === "CoachSubmitted").length;
    const approvedCount = staffReportData.filter(s => s.status === "Approved").length;

    // A summary is deemed "compliant" if it's either draft, submitted, compiled, or approved
    const activeSummariesCount = staffReportData.filter(s => s.status !== "Not Started").length;
    const complianceRate = totalStaff > 0 ? Math.round((activeSummariesCount / totalStaff) * 100) : 0;

    return {
      totalStaff,
      draftCount,
      submittedCount,
      coachSubmittedCount,
      approvedCount,
      complianceRate
    };
  }, [staffReportData]);

  const toggleRow = (id: string) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  return (
    <div id="admin-oversight-reports" className="space-y-6">
      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Card 1: Form Compliance */}
        <div id="stat-card-compliance" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("PDP Compliance Rate")}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.complianceRate}%</span>
              <span className="text-[10px] text-slate-500">({stats.totalStaff - stats.draftCount - stats.submittedCount - stats.coachSubmittedCount - stats.approvedCount} {t("not started")})</span>
            </div>
            <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full" style={{ width: `${stats.complianceRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Stat Card 2: Pending Sign-offs */}
        <div id="stat-card-coverage" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("Pending Approvals")}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.coachSubmittedCount}</span>
              <span className="text-[10px] text-slate-500">{t("awaiting admin")}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">{t("Ready for review & sign-off")}</p>
          </div>
        </div>

        {/* Stat Card 3: Active Drafts */}
        <div id="stat-card-drafts" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("In Progress Drafts")}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.draftCount + stats.submittedCount}</span>
              <span className="text-[10px] text-slate-500">{t("member/coach drafts")}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">{t("In compilation pipeline")}</p>
          </div>
        </div>

        {/* Stat Card 4: Approved & Finalized */}
        <div id="stat-card-coaches" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("Approved Summaries")}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.approvedCount}</span>
              <span className="text-[10px] text-slate-500">{t("fully completed")}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">{t("Archived and signed off")}</p>
          </div>
        </div>
      </div>

      {/* Main Reports Panel */}
      <div id="reports-panel" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-colors">
        {/* Navigation / Tab bar */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-sans font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                  {t("Admin Oversight Reports")}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {t("Quarterly Review Summary Compliance Board")}
                </p>
              </div>
            </div>

            {/* Interactive Selectors */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-xl text-xs font-bold shadow-sm">
                <span className="text-slate-400 font-mono text-[9px] uppercase">{t("Quarter:")}</span>
                <select
                  id="report-quarter-select"
                  value={reportQuarter}
                  onChange={(e) => setReportQuarter(e.target.value as "1st" | "2nd" | "3rd")}
                  className="bg-transparent border-none py-0 focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200 text-xs font-bold"
                >
                  <option value="1st">{t("1st Quarter")}</option>
                  <option value="2nd">{t("2nd Quarter")}</option>
                  <option value="3rd">{t("3rd Quarter")}</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-xl text-xs font-bold shadow-sm">
                <span className="text-slate-400 font-mono text-[9px] uppercase">{t("Year:")}</span>
                <select
                  id="report-year-select"
                  value={reportYear}
                  onChange={(e) => setReportYear(e.target.value)}
                  className="bg-transparent border-none py-0 focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200 text-xs font-bold"
                >
                  <option value="2025/2026">2025/2026</option>
                  <option value="2026/2027">2026/2027</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div id="staff-report-container" className="p-6 space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="staff-search-input"
                type="text"
                placeholder={t("Search staff members, emails, roles...")}
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="staff-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-none border-none py-0 cursor-pointer"
                >
                  <option value="all">{t("All Form Statuses")}</option>
                  <option value="approved">{t("Approved & Signed Off")}</option>
                  <option value="coach_submitted">{t("Compiled by Coach")}</option>
                  <option value="submitted">{t("Submitted to Coach")}</option>
                  <option value="draft">{t("Drafts Only")}</option>
                  <option value="not_started">{t("Not Started Only")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Compliance Table */}
          <div className="overflow-x-auto border border-slate-150 dark:border-slate-850 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850 text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">{t("Staff Member")}</th>
                  <th className="px-6 py-4">{t("Current Coach")}</th>
                  <th className="px-6 py-4">{t("Summary Form Status")}</th>
                  <th className="px-6 py-4 text-right">{t("Details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850 text-xs">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic font-mono bg-slate-50/50 dark:bg-slate-950/20">
                      {t("No staff matching the selected criteria")}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((item) => {
                    const isExpanded = expandedRow === item.uid;
                    return (
                      <React.Fragment key={item.uid}>
                        <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors ${isExpanded ? "bg-slate-50/40 dark:bg-slate-950/20" : ""}`}>
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{item.name}</div>
                            <div className="text-slate-500 font-mono text-[10px] mt-0.5">{item.email}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{item.role}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              item.coachName === "No coach assigned"
                                ? "bg-slate-50 dark:bg-slate-950 text-slate-400 border border-slate-100 dark:border-slate-850"
                                : "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50"
                            }`}>
                              {item.coachName === "No coach assigned" ? t("No coach assigned") : item.coachName}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                              item.status === "Approved"
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100"
                                : item.status === "CoachSubmitted"
                                ? "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-100"
                                : item.status === "Submitted"
                                ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-100"
                                : item.status === "Draft"
                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100"
                                : "bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-850"
                            }`}>
                              {item.status === "Approved" ? t("Approved / Signed Off") :
                               item.status === "CoachSubmitted" ? t("Reviewed by Coach") :
                               item.status === "Submitted" ? t("Submitted to Coach") :
                               item.status === "Draft" ? t("In Draft") : t("Not Started")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {onViewStaffFollowUp && (
                                <button
                                  id={`row-go-followup-${item.uid}`}
                                  onClick={() => onViewStaffFollowUp(item.uid)}
                                  className="px-2.5 py-1 text-indigo-600 hover:text-white dark:text-indigo-400 dark:hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-indigo-150 dark:border-slate-850 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                  title={t("Go to Follow-Up Grid")}
                                >
                                  <span className="text-[10px] font-bold tracking-wide">{t("Follow-Up")}</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                  id={`toggle-expand-${item.uid}`}
                                  onClick={() => toggleRow(item.uid)}
                                  className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-200 dark:border-slate-800 cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Compliance Breakdown Drawer */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50 dark:bg-slate-950/20">
                            <td colSpan={4} className="px-6 py-5 border-t border-slate-150 dark:border-slate-850">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-xs">
                                <div className="space-y-2">
                                  <h5 className="font-extrabold text-[11px] font-mono uppercase text-slate-400">{t("Quarterly Action Plan & Comments")}</h5>
                                  <div className="space-y-2 text-slate-700 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${item.coachName === "No coach assigned" ? "bg-rose-500" : "bg-emerald-500"}`}></div>
                                      <span>{t("Coaching:")} <strong className="text-slate-900 dark:text-white">{item.coachName === "No coach assigned" ? t("No coach assigned") : item.coachName}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${item.hasSummary ? "bg-emerald-500" : "bg-slate-300"}`}></div>
                                      <span>{t("Quarterly Summary draft:")} <strong className="text-slate-900 dark:text-white">{item.hasSummary ? t("Created") : t("Not Started")}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${item.status === "Approved" ? "bg-emerald-500" : item.status === "CoachSubmitted" ? "bg-teal-500" : "bg-amber-500"}`}></div>
                                      <span>{t("Current Status:")} <strong className="text-slate-900 dark:text-white">{item.status}</strong></span>
                                    </div>
                                  </div>

                                  <div className="pt-2">
                                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide">{t("Audit Timestamp")}</span>
                                    <p className="text-slate-500 leading-relaxed font-mono text-[10px] mt-0.5">
                                      {t("Last activity:")} {new Date(item.updatedAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h5 className="font-extrabold text-[11px] font-mono uppercase text-slate-400">{t("Admin Recommendation & Reports")}</h5>
                                  <div>
                                    <p className="text-[11px] text-slate-500 italic">
                                      {item.status === "Approved" 
                                        ? t("✓ This quarterly evaluation is approved and signed off by Admin.") 
                                        : item.status === "CoachSubmitted" 
                                        ? t("✓ Compiled by Coach. Awaiting final Admin review and sign-off.") 
                                        : item.status === "Submitted" 
                                        ? t("⚠ Submitted by member. Coach is compiling evaluations.") 
                                        : t("✗ Draft status. Encourage member to complete their PDP summary.")}
                                    </p>
                                  </div>

                                  {onViewStaffFollowUp && (
                                    <button
                                      id={`compliance-go-followup-${item.uid}`}
                                      onClick={() => onViewStaffFollowUp(item.uid)}
                                      className="w-full mt-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                                    >
                                      <span>{t("Manage Follow-Up Accountability Grid")}</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Team Evaluation Center Section inside expanded drawer */}
                                <div className="md:col-span-2 mt-6 pt-5 border-t border-slate-150 dark:border-slate-800 animate-fade-in">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <Users className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <h5 className="font-extrabold text-[12px] uppercase text-slate-700 dark:text-slate-300">
                                          {t("🎓 Coaches' Feedback")}
                                        </h5>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          {t("Access all Coach/TL evaluations completed for")} {item.name} {t("in")} {reportQuarter} {t("Quarter.")}
                                        </p>
                                      </div>
                                    </div>
                                    {/* One Page Report Button */}
                                    <button
                                      id={`btn-consolidated-report-${item.uid}`}
                                      onClick={() => {
                                        const memberSummaries = allSummaries.filter(
                                          s => s.userId === item.uid && s.quarter === reportQuarter && s.year === reportYear
                                        );
                                        const baseSummary = memberSummaries.find(s => !s.coachUid);
                                        const coachSummaries = memberSummaries.filter(s => !!s.coachUid);
                                        
                                        setActiveReportMember({
                                          member: registeredUsers.find(u => u.uid === item.uid)!,
                                          coachSummaries,
                                          baseSummary
                                        });
                                      }}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                      <span>{t("Consolidated 1-Page Report")}</span>
                                    </button>
                                  </div>

                                  {/* Coach Evaluations Grid */}
                                  {(() => {
                                    const memberSummaries = allSummaries.filter(
                                      s => s.userId === item.uid && s.quarter === reportQuarter && s.year === reportYear
                                    );
                                    const coachSummaries = memberSummaries.filter(s => !!s.coachUid);

                                    if (coachSummaries.length === 0) {
                                      return (
                                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500">
                                          <AlertCircle className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                                          <p className="text-xs font-medium">{t("No coach evaluations have been submitted for this staff member yet.")}</p>
                                          <p className="text-[10px] text-slate-400 mt-0.5">{t("Approved coaches will submit their evaluations here once the staff member completes their summary draft.")}</p>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {coachSummaries.map((s, idx) => (
                                          <div key={s.id || idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                                            <div>
                                              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
                                                <div>
                                                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                                                    {s.coachName || t("Coach Evaluation")}
                                                  </span>
                                                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                    {t("Last Updated:")} {new Date(s.updatedAt).toLocaleDateString()}
                                                  </div>
                                                </div>
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${
                                                  s.status === "CoachSubmitted"
                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                                }`}>
                                                  {s.status === "CoachSubmitted" ? t("Submitted") : t("In Draft")}
                                                </span>
                                              </div>

                                              <div className="space-y-2 text-[11px]">
                                                <div>
                                                  <span className="font-mono text-[10px] uppercase text-slate-400 block">{t("Overall Effectiveness:")}</span>
                                                  <span className={`font-bold ${
                                                    s.evaluation?.overallEffectiveness === "One of the best" 
                                                      ? "text-emerald-600" 
                                                      : s.evaluation?.overallEffectiveness === "Satisfactory" 
                                                      ? "text-indigo-600" 
                                                      : s.evaluation?.overallEffectiveness === "Ineffective"
                                                      ? "text-rose-600"
                                                      : "text-slate-500"
                                                  }`}>
                                                    {s.evaluation?.overallEffectiveness || t("Not rated yet")}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="font-mono text-[10px] uppercase text-slate-400 block">{t("Strengths:")}</span>
                                                  <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-1">
                                                    {s.evaluation?.strengths?.filter(Boolean).map((str, i) => (
                                                      <li key={i}>{str}</li>
                                                    ))}
                                                    {s.evaluation?.strengths?.filter(Boolean).length === 0 && (
                                                      <li className="italic text-slate-400 list-none">{t("No strengths listed yet")}</li>
                                                    )}
                                                  </ul>
                                                </div>
                                                <div>
                                                  <span className="font-mono text-[10px] uppercase text-slate-400 block">{t("Development Areas:")}</span>
                                                  <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-1">
                                                    {s.evaluation?.weaknesses?.filter(Boolean).map((weak, i) => (
                                                      <li key={i}>{weak}</li>
                                                    ))}
                                                    {s.evaluation?.weaknesses?.filter(Boolean).length === 0 && (
                                                      <li className="italic text-slate-400 list-none">{t("No weaknesses listed yet")}</li>
                                                    )}
                                                  </ul>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="border-t border-slate-100 dark:border-slate-800 mt-3 pt-3 flex justify-end">
                                              <button
                                                id={`btn-view-full-eval-${s.id}`}
                                                onClick={() => {
                                                  setViewFullSummaryDetails(s);
                                                }}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                              >
                                                <span>{t("View Full Form")}</span>
                                                <ChevronRight className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal 1: View Full Summary Details (ReadOnly Coach Evaluation or Self-Review) */}
      {viewFullSummaryDetails && (
        <div id="modal-view-full-summary" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-950 dark:text-slate-100 uppercase tracking-wide">
                   {t("📋 Evaluation Form")}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  {viewFullSummaryDetails.coachUid 
                    ? `${t("Completed by Coach")} ${viewFullSummaryDetails.coachName || t("Nominated Coach")}`
                    : t("Staff Member Self-Evaluation Draft")}
                </p>
              </div>
              <button 
                onClick={() => setViewFullSummaryDetails(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* General Information Grid */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
                <h5 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  {t("1. General Information")}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px]">
                  <div><span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Staff Member Name:")}</span> <strong className="font-bold text-slate-800 dark:text-slate-200">{viewFullSummaryDetails.staffName}</strong></div>
                  <div><span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Team Leader Name:")}</span> <strong>{viewFullSummaryDetails.teamLeaderName || "-"}</strong></div>
                  <div><span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Reviewer Name & Position:")}</span> <strong>{viewFullSummaryDetails.reviewerNamePosition || "-"}</strong></div>
                  <div><span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Current Position / Role:")}</span> <strong>{viewFullSummaryDetails.position || "-"}</strong></div>
                  <div><span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Date Joined Staff:")}</span> <strong>{viewFullSummaryDetails.dateJoinedStaff || "-"}</strong></div>
                  <div><span className="font-mono text-[9px] uppercase text-slate-400 block">{t("In Present Position Since:")}</span> <strong>{viewFullSummaryDetails.presentPositionSince || "-"}</strong></div>
                  <div><span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Supervised By Current Team Leader Since:")}</span> <strong>{viewFullSummaryDetails.supervisedBySince || "-"}</strong></div>
                </div>
              </div>

              {/* PDP Review */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" /> {t("2. Personal Development Plan (PDP) Reviews")}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(["heart", "personalLife", "relationalLife"] as const).map((cat) => {
                    const item = viewFullSummaryDetails.pdp?.[cat];
                    const label = cat === "heart" ? t("Walk with God") :
                                  cat === "personalLife" ? t("Personal Life") : t("Relational Life");
                    return (
                      <div key={cat} className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3 space-y-2.5">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-extrabold text-[11px] text-indigo-600 dark:text-indigo-400">{label}</span>
                          
                          {/* Compact focus & questions reference */}
                          {DEVELOPMENT_REVIEW_SECTIONS[cat] && (
                            <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-2 border border-slate-150 dark:border-slate-800 text-[10px] space-y-1.5 leading-normal">
                              <div>
                                <span className="font-bold text-slate-500 dark:text-slate-400 font-mono text-[9px] uppercase tracking-wider block">{t("Core Focus:")}</span>
                                <span className="text-slate-600 dark:text-slate-350">{DEVELOPMENT_REVIEW_SECTIONS[cat].bullets.join(", ")}</span>
                              </div>
                              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="font-bold text-slate-500 dark:text-slate-400 font-mono text-[9px] uppercase tracking-wider block">{t("Reflection Guide:")}</span>
                                <span className="text-slate-600 dark:text-slate-350 italic">"{DEVELOPMENT_REVIEW_SECTIONS[cat].questions.join(" • ")}"</span>
                              </div>
                            </div>
                          )}
                        </div>
                        {item ? (
                          <div className="space-y-1.5 text-[11px]">
                            <div><strong className="text-slate-500 font-mono text-[9px] block">{t("Goal:")}</strong> {item.goal || <span className="italic text-slate-400">{t("None")}</span>}</div>
                            <div><strong className="text-slate-500 font-mono text-[9px] block">{t("Target Outcome:")}</strong> {item.desiredResult || <span className="italic text-slate-400">{t("None")}</span>}</div>
                            {reportQuarter === "2nd" && (
                              <>
                                <div><strong className="text-slate-500 font-mono text-[9px] block">{t("Progress Made:")}</strong> {item.progressMade || <span className="italic text-slate-400">{t("None")}</span>}</div>
                                <div><strong className="text-slate-500 font-mono text-[9px] block">{t("Changes Needed:")}</strong> {item.changesNeeded || <span className="italic text-slate-400">{t("None")}</span>}</div>
                              </>
                            )}
                            {reportQuarter === "3rd" && (
                              <div><strong className="text-slate-500 font-mono text-[9px] block">{t("Next Growth Step:")}</strong> {item.nextStep || <span className="italic text-slate-400">{t("None")}</span>}</div>
                            )}
                          </div>
                        ) : (
                          <p className="italic text-slate-400">{t("Not filled out")}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CMO Review */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> {t("3. Critical Mission Objectives (CMO)")}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(viewFullSummaryDetails.cmo || []).map((c, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3 space-y-1.5 text-[11px]">
                      <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">{t("Objective #")}{idx + 1}</span>
                      <div><strong className="text-slate-500 font-mono text-[9px] block">{t("Goal description:")}</strong> {c.objective || "-"}</div>
                      <div><strong className="text-slate-500 font-mono text-[9px] block">{t("Expected outcome:")}</strong> {c.desiredResult || "-"}</div>
                      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-2 font-mono text-[10px]">
                        <span className="text-slate-400">{t("Completion:")}</span>
                        <span className="font-bold text-indigo-600">{c.percentageAchieved || 0}%</span>
                      </div>
                    </div>
                  ))}
                  {(!viewFullSummaryDetails.cmo || viewFullSummaryDetails.cmo.length === 0) && (
                    <p className="italic text-slate-400 col-span-3">{t("No critical mission objectives listed.")}</p>
                  )}
                </div>
              </div>

              {/* KDA Review */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> {t("4. Key Development Assignments (KDA)")}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(viewFullSummaryDetails.kda || []).map((k, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3 space-y-1.5 text-[11px]">
                      <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">{t("Assignment #")}{idx + 1}</span>
                      <div><strong className="text-slate-500 font-mono text-[9px] block">{t("Assignment:")}</strong> {k.assignment || "-"}</div>
                    </div>
                  ))}
                  {(!viewFullSummaryDetails.kda || viewFullSummaryDetails.kda.length === 0) && (
                    <p className="italic text-slate-400 col-span-2">{t("No development assignments listed.")}</p>
                  )}
                </div>
              </div>

              {/* Suggestions / Feedback */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800 pb-1.5">
                   {t("5. Suggestions for Improvement")}
                </h5>
                <ul className="list-decimal list-inside pl-1 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                  {(viewFullSummaryDetails.suggestions || []).map((s, idx) => (
                    <li key={idx} className={s ? "" : "italic text-slate-400 list-none"}>
                      {s || t("No suggestion provided for this item.")}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 6: Coach/Leader Evaluation */}
              <div className="bg-indigo-50/40 dark:bg-slate-950 p-4 rounded-xl border border-indigo-100 dark:border-slate-800 space-y-4">
                <h5 className="font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-wider text-[10px] border-b border-indigo-200 dark:border-slate-800 pb-1.5 flex items-center gap-1">
                   <Star className="w-3.5 h-3.5" /> {t("6. Coach's Evaluation")}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Overall Effectiveness:")}</span>
                    <strong className={`text-xs font-bold ${
                      viewFullSummaryDetails.evaluation?.overallEffectiveness === "One of the best" 
                        ? "text-emerald-600" 
                        : viewFullSummaryDetails.evaluation?.overallEffectiveness === "Satisfactory" 
                        ? "text-indigo-600" 
                        : "text-rose-600"
                    }`}>
                      {viewFullSummaryDetails.evaluation?.overallEffectiveness || t("Not rated yet")}
                    </strong>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Ready for Greater Responsibility?")}</span>
                    <strong>{viewFullSummaryDetails.evaluation?.readyForGreaterResp || t("No rating")}</strong>
                    {viewFullSummaryDetails.evaluation?.readyForGreaterResp === "Yes" && (
                      <div className="text-[10px] text-slate-500 mt-1 pl-1 border-l border-slate-300">
                        {viewFullSummaryDetails.evaluation?.greaterRespDetails?.position && (
                          <p>{t("Position:")} {viewFullSummaryDetails.evaluation.greaterRespDetails.position}</p>
                        )}
                        {viewFullSummaryDetails.evaluation?.greaterRespDetails?.when && (
                          <p>{t("Timeline:")} {viewFullSummaryDetails.evaluation.greaterRespDetails.when}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Strengths:")}</span>
                    <ul className="list-disc list-inside pl-1 text-slate-600 dark:text-slate-400">
                      {(viewFullSummaryDetails.evaluation?.strengths || []).filter(Boolean).map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                      {(viewFullSummaryDetails.evaluation?.strengths || []).filter(Boolean).length === 0 && (
                        <li className="italic text-slate-400 list-none">{t("No strengths listed yet")}</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Development Areas:")}</span>
                    <ul className="list-disc list-inside pl-1 text-slate-600 dark:text-slate-400">
                      {(viewFullSummaryDetails.evaluation?.weaknesses || []).filter(Boolean).map((weak, idx) => (
                        <li key={idx}>{weak}</li>
                      ))}
                      {(viewFullSummaryDetails.evaluation?.weaknesses || []).filter(Boolean).length === 0 && (
                        <li className="italic text-slate-400 list-none">{t("No weaknesses listed yet")}</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] border-t border-indigo-100 dark:border-slate-800 pt-3">
                  <div>
                    <span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Areas Lacking Confidence:")}</span>
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      "{viewFullSummaryDetails.evaluation?.lackConfidence || t("No comment left.")}"
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase text-slate-400 block">{t("Reassignment Recommendation:")}</span>
                    <strong>{viewFullSummaryDetails.evaluation?.recommendReassignment || t("No rating")}</strong>
                    {viewFullSummaryDetails.evaluation?.recommendReassignment === "Yes" && (
                      <div className="text-[10px] text-slate-500 mt-1 pl-1 border-l border-slate-300">
                        <p>{t("Suggested Location/Position:")} {viewFullSummaryDetails.evaluation.reassignmentDetails?.positionLocation || "-"}</p>
                        <p>{t("Justification:")} {viewFullSummaryDetails.evaluation.reassignmentDetails?.why || "-"}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Leader Sign-off */}
                <div className="bg-white dark:bg-slate-900 border border-indigo-50 dark:border-slate-800 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-400 uppercase">{t("Team Leader Signature:")}</span>
                    <span className="font-sans font-extrabold text-indigo-700 dark:text-indigo-400 block mt-0.5">
                      ✍ {viewFullSummaryDetails.evaluation?.teamLeaderSignature || t("Unsigned")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase">{t("Signature Date:")}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mt-0.5">
                      {viewFullSummaryDetails.evaluation?.teamLeaderSignatureDate || t("Pending")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setViewFullSummaryDetails(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                {t("Close Detailed View")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Consolidated 1-Page Report Modal */}
      {activeReportMember && (
        <div id="modal-consolidated-report" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fade-in print:max-h-full print:shadow-none print:border-none">
            
            {/* Header / Actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between print:hidden">
              <div>
                <span className="inline-flex px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold rounded-full uppercase mb-1">
                  {t("Consolidated Oversight Report")}
                </span>
                <h4 className="font-extrabold text-sm text-slate-950 dark:text-slate-100 uppercase tracking-wide">
                  {t("🎓 1-Page Consolidated Review Center")}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-print-consolidated-report"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t("Print Report")}</span>
                </button>
                <button 
                  onClick={() => setActiveReportMember(null)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Printable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-xs text-slate-700 dark:text-slate-300 print:overflow-visible print:p-0">
              
              {/* Report Cover and Info */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="font-sans font-black text-slate-900 dark:text-white text-lg tracking-tight uppercase">
                    {t("Consolidated Quarterly Review")}
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {t("Africa Region Leadership Development Framework")}
                  </p>
                </div>
                <div className="text-right sm:text-right text-[10px] font-mono">
                  <div>{t("Quarter:")} <strong className="text-slate-800 dark:text-slate-200">{reportQuarter} {t("Quarter")} ({reportYear})</strong></div>
                  <div>{t("Report Date:")} <strong>{new Date().toLocaleDateString()}</strong></div>
                </div>
              </div>

              {/* Staff Member Metadata */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                <div>
                  <span className="text-slate-400 font-mono text-[9px] uppercase block">{t("Staff Member:")}</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-xs font-bold">{activeReportMember.member.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-mono text-[9px] uppercase block">{t("Assigned Role:")}</span>
                  <strong>{activeReportMember.member.role}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-mono text-[9px] uppercase block">{t("Email Address:")}</span>
                  <strong>{activeReportMember.member.email}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-mono text-[9px] uppercase block">{t("Assigned Coaches:")}</span>
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {activeReportMember.coachSummaries.map(c => c.coachName).join(", ") || t("None assigned yet")}
                  </strong>
                </div>
              </div>

              {/* Side-by-Side Self Review & Coach Evaluation Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Staff Self-Draft Summary (4 Columns) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                    <h5 className="font-sans font-extrabold text-[11px] uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      {t("Staff Self-Draft Highlights")}
                    </h5>

                    {activeReportMember.baseSummary ? (
                      <div className="space-y-4 text-[11px]">
                        {/* PDP Goals */}
                        <div className="space-y-1.5">
                          <span className="font-mono text-[10px] text-slate-400 uppercase">{t("Personal Development Goals:")}</span>
                          <div className="space-y-1 pl-2 border-l-2 border-slate-200">
                            <div><strong className="font-semibold text-slate-700">{t("Walk with God:")}</strong> {activeReportMember.baseSummary.pdp?.heart?.goal || t("None set")}</div>
                            <div><strong className="font-semibold text-slate-700">{t("Personal Life:")}</strong> {activeReportMember.baseSummary.pdp?.personalLife?.goal || t("None set")}</div>
                            <div><strong className="font-semibold text-slate-700">{t("Relational Life:")}</strong> {activeReportMember.baseSummary.pdp?.relationalLife?.goal || t("None set")}</div>
                          </div>
                        </div>

                        {/* CMO Objectives */}
                        <div className="space-y-1.5">
                          <span className="font-mono text-[10px] text-slate-400 uppercase">{t("Critical Mission Goals:")}</span>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                            {activeReportMember.baseSummary.cmo?.filter(c => !!c.objective).map((c, i) => (
                              <li key={i}>{c.objective} <span className="font-mono text-[9px] text-indigo-600">({c.percentageAchieved || 0}%)</span></li>
                            ))}
                            {(!activeReportMember.baseSummary.cmo || activeReportMember.baseSummary.cmo.filter(c => !!c.objective).length === 0) && (
                              <li className="italic text-slate-400 list-none">{t("No critical objectives draft compiled.")}</li>
                            )}
                          </ul>
                        </div>

                        {/* Suggestions */}
                        <div className="space-y-1.5">
                          <span className="font-mono text-[10px] text-slate-400 uppercase">{t("Department Suggestions:")}</span>
                          <ul className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                            {activeReportMember.baseSummary.suggestions?.filter(Boolean).map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                            {(!activeReportMember.baseSummary.suggestions || activeReportMember.baseSummary.suggestions.filter(Boolean).length === 0) && (
                              <li className="italic text-slate-400 list-none">{t("No suggestions submitted.")}</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500 italic">
                        {t("No base self-evaluation summary compiled for this quarter yet.")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Coach Multi-Evaluations (7 Columns) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                    <h5 className="font-sans font-extrabold text-[11px] uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-indigo-500" />
                       {t("Evaluations")}
                    </h5>

                    {activeReportMember.coachSummaries.length === 0 ? (
                      <div className="p-8 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 italic">
                        {t("Awaiting coach evaluations. Assigned coaches will complete their assessments inside the Oversight portal.")}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeReportMember.coachSummaries.map((s, idx) => (
                          <div key={s.id || idx} className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-150 dark:border-slate-850 space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/60 pb-2">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{s.coachName || t("Coach")}</span>
                                <span className="text-[9px] font-mono text-slate-400 block">{t("Submitted:")} {new Date(s.updatedAt || Date.now()).toLocaleDateString()}</span>
                              </div>
                              <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-400 font-bold text-[10px] rounded">
                                {t("Rating:")} {s.evaluation?.overallEffectiveness || t("Not rated")}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                              <div>
                                <span className="font-mono text-[9px] text-slate-400 uppercase block">{t("Identified Strengths:")}</span>
                                <ul className="list-disc list-inside pl-1 text-slate-600 dark:text-slate-400 space-y-0.5">
                                  {s.evaluation?.strengths?.filter(Boolean).map((str, i) => (
                                    <li key={i}>{str}</li>
                                  ))}
                                  {(!s.evaluation?.strengths || s.evaluation.strengths.filter(Boolean).length === 0) && (
                                    <li className="italic text-slate-400 list-none">{t("No strengths listed.")}</li>
                                  )}
                                </ul>
                              </div>
                              <div>
                                <span className="font-mono text-[9px] text-slate-400 uppercase block">{t("Development Areas:")}</span>
                                <ul className="list-disc list-inside pl-1 text-slate-600 dark:text-slate-400 space-y-0.5">
                                  {s.evaluation?.weaknesses?.filter(Boolean).map((weak, i) => (
                                    <li key={i}>{weak}</li>
                                  ))}
                                  {(!s.evaluation?.weaknesses || s.evaluation.weaknesses.filter(Boolean).length === 0) && (
                                    <li className="italic text-slate-400 list-none">{t("No weaknesses listed.")}</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                            
                            <div className="text-[11px] pt-1 border-t border-slate-200/40">
                              <span className="font-mono text-[9px] text-slate-400 uppercase block">{t("Reassignments/Next Steps:")}</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium italic">
                                {s.evaluation?.recommendReassignment === "Yes" 
                                  ? `${t("Recommend Reassignment:")} ${s.evaluation.reassignmentDetails?.positionLocation || "-"} (${s.evaluation.reassignmentDetails?.why || "-"})`
                                  : t("Maintains current assignment.")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-2 print:hidden">
              <button 
                onClick={() => setActiveReportMember(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                {t("Close Report")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
