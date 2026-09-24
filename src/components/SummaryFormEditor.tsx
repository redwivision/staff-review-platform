import React, { useState, useEffect } from "react";
import { QuarterlySummary, PDPQuarterItem, CMOQuarterItem, KDAQuarterItem } from "../types";
import { QUARTER_INFO, DEVELOPMENT_REVIEW_SECTIONS } from "../constants";
import { ClipboardList, Star, RefreshCw, Layers, CheckSquare, Save, UserCheck, ShieldAlert, ArrowLeftRight, HelpCircle, User, Briefcase, MessageSquare, ListChecks } from "lucide-react";
import GuidedSummaryForm from "./GuidedSummaryForm";
import { useLanguage } from "../i18n";

interface SummaryFormEditorProps {
  summary: QuarterlySummary;
  onSave: (updatedSummary: QuarterlySummary) => Promise<void>;
  onClose: () => void;
  isLeaderView: boolean;
  staffName: string;
  isOwner?: boolean;
  isCoachOrAdmin?: boolean;
  isAdmin?: boolean;
  hasVerifiedCoach?: boolean;
}

export default function SummaryFormEditor({
  summary,
  onSave,
  onClose,
  isLeaderView: isLeaderViewProp,
  staffName,
  isOwner = false,
  isCoachOrAdmin = false,
  isAdmin = false,
  hasVerifiedCoach = true
}: SummaryFormEditorProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<QuarterlySummary>({ ...summary });
  const [activeTab, setActiveTab] = useState<"header" | "pdp" | "cmo" | "kda" | "evaluation" | "comments">("header");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<"standard" | "guided">(
    isLeaderViewProp ? "standard" : "guided"
  );

  const isSubmittedByOwner = formData.status === "Submitted" || formData.status === "CoachSubmitted" || formData.status === "Declined";
  const isSubmittedByCoach = formData.status === "CoachSubmitted";

  // Dynamic evaluation of edit access depending on current tab context
  const isLeaderView = isAdmin || (activeTab === "evaluation" 
    ? (isCoachOrAdmin && !isSubmittedByCoach) 
    : (isOwner && !isSubmittedByOwner));

  useEffect(() => {
    setFormData({ ...summary });
  }, [summary]);

  // Scroll to the top of the summary editor container when activeTab changes
  useEffect(() => {
    const container = document.getElementById("summary-editor-container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeTab]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSuggestionChange = (index: number, value: string) => {
    setFormData(prev => {
      const suggestions = [...prev.suggestions];
      suggestions[index] = value;
      return { ...prev, suggestions };
    });
  };

  const handlePDPChange = (
    category: "heart" | "personalLife" | "relationalLife",
    field: keyof PDPQuarterItem,
    value: any
  ) => {
    setFormData(prev => {
      const pdp = { ...prev.pdp };
      pdp[category] = {
        ...pdp[category],
        [field]: value
      };
      return { ...prev, pdp };
    });
  };

  const handleCMOChange = (index: number, field: keyof CMOQuarterItem, value: any) => {
    setFormData(prev => {
      const cmo = [...prev.cmo];
      if (!cmo[index]) {
        cmo[index] = { objective: "", desiredResult: "" };
      }
      cmo[index] = {
        ...cmo[index],
        [field]: value
      };
      return { ...prev, cmo };
    });
  };

  const handleKDAChange = (index: number, field: keyof KDAQuarterItem, value: any) => {
    setFormData(prev => {
      const kda = [...prev.kda];
      if (!kda[index]) {
        kda[index] = { assignment: "" };
      }
      kda[index] = {
        ...kda[index],
        [field]: value
      };
      return { ...prev, kda };
    });
  };

  const handleEvaluationChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      evaluation: {
        ...prev.evaluation,
        [field]: value
      }
    }));
  };

  const handleEvaluationListChange = (field: "strengths" | "weaknesses", index: number, value: string) => {
    setFormData(prev => {
      const list = [...prev.evaluation[field]];
      list[index] = value;
      return {
        ...prev,
        evaluation: {
          ...prev.evaluation,
          [field]: list
        }
      };
    });
  };

  const handleEvaluationNestedChange = (parentField: "greaterRespDetails" | "reassignmentDetails", field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      evaluation: {
        ...prev.evaluation,
        [parentField]: {
          ...prev.evaluation[parentField],
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!(isOwner || isCoachOrAdmin || isAdmin)) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = {
        ...formData,
        updatedAt: Date.now()
      };
      await onSave(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save summary:", err);
    } finally {
      setSaving(false);
    }
  };

  const quarter = formData.quarter;
  const canSave = isAdmin || (isOwner && !isSubmittedByOwner) || (isCoachOrAdmin && !isSubmittedByCoach);

  return (
    <>
    {viewMode === "guided" ? (
      <GuidedSummaryForm
        summary={formData}
        onSave={onSave}
        onClose={onClose}
        isLeaderView={isLeaderViewProp}
        staffName={staffName}
        isOwner={isOwner}
        isCoachOrAdmin={isCoachOrAdmin}
        isAdmin={isAdmin}
        onSwitchStandard={() => setViewMode("standard")}
      />
    ) : (
    <div id="summary-editor-container" className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300 bg-indigo-950/70 px-3 py-1 rounded-full border border-indigo-500/30">
              {t("Quarterly Review Summary Form")}
            </span>
            <h2 className="text-2xl font-sans font-bold tracking-tight mt-2 text-white">
              {QUARTER_INFO[quarter].name}{t(" Summary for ")}{staffName}
            </h2>
            <p className="text-xs text-indigo-200/80 font-mono mt-1">
              {t("Coverage Period: ")}{QUARTER_INFO[quarter].months}{t(" • ")}{
                isAdmin ? t("Admin Mode (Full Access)") :
                isCoachOrAdmin ? t("Coach Mode (Evaluation Access)") :
                isOwner ? t("Staff Member Mode (Summary Access)") :
                t("View Only Mode")
              }
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="toggle-guided-mode-btn"
              onClick={() => setViewMode("guided")}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <ListChecks className="w-4 h-4" />
              {t("Easy mode")}
            </button>
            {canSave && (
              <button
                id="save-summary-btn"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-950/20 text-white cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving 
                  ? t("Saving Summary...") 
                  : isOwner 
                    ? t("Save Summary Draft") 
                    : t("Save Evaluation")}
              </button>
            )}

            {isOwner && (!formData.status || formData.status === "Draft") && (
              <button
                id="submit-summary-to-coach-btn"
                onClick={async () => {
                  if (!hasVerifiedCoach) {
                    alert(t("You don't have a confirmed coach yet. You can keep filling and saving your form — just submit it to your coach once they've accepted your coaching request."));
                    return;
                  }
                  if (!formData.presentPositionSince || !formData.teamLeaderName) {
                    alert(t("Please fill out the Team Leader Name and In Present Position Since fields in Section 1 (General Information) before submitting."));
                    return;
                  }
                  if (confirm(t("Are you sure you want to submit your summary to your coach? This will lock your sections for editing."))) {
                    setSaving(true);
                    try {
                      const updated = {
                        ...formData,
                        status: "Submitted" as const,
                        updatedAt: Date.now()
                      };
                      setFormData(updated);
                      await onSave(updated);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 3000);
                    } catch (err) {
                      console.error("Failed to submit summary to coach:", err);
                    } finally {
                      setSaving(false);
                    }
                  }
                }}
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950/20 text-white cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                {t("Submit to Coach")}
              </button>
            )}

            {!isOwner && (isCoachOrAdmin || isAdmin) && (formData.status === "Submitted" || formData.status === "Declined") && (
              <button
                id="submit-eval-to-admin-btn"
                onClick={async () => {
                  if (!formData.evaluation.overallEffectiveness) {
                    alert(t("Please select an Overall Effectiveness Rating under the TL Evaluation tab before submitting."));
                    return;
                  }
                  if (!formData.evaluation.teamLeaderSignature) {
                    alert(t("Please sign the evaluation (Team Leader Signature) under the TL Evaluation tab before submitting."));
                    return;
                  }
                  if (confirm(t("Are you sure you want to submit this evaluation to the Admin? This will lock the evaluation."))) {
                    setSaving(true);
                    try {
                      const updated = {
                        ...formData,
                        status: "CoachSubmitted" as const,
                        updatedAt: Date.now()
                      };
                      setFormData(updated);
                      await onSave(updated);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 3000);
                    } catch (err) {
                      console.error("Failed to submit evaluation to admin:", err);
                    } finally {
                      setSaving(false);
                    }
                  }
                }}
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950/20 text-white cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                {formData.status === "Declined" ? t("Resubmit to Admin") : t("Submit to Admin")}
              </button>
            )}

            <button
              id="close-summary-btn"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-indigo-900/50 rounded-lg transition-colors text-slate-300"
            >
              {t("Close")}
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 text-sm flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            {t("Summary form changes successfully compiled.")}
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200 bg-slate-50 flex overflow-x-auto">
        <button
          id="sum-tab-header"
          onClick={() => setActiveTab("header")}
          className={`px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "header" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          {t("General & Suggestions")}
        </button>
        <button
          id="sum-tab-pdp"
          onClick={() => setActiveTab("pdp")}
          className={`px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "pdp" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Star className="w-4 h-4" />
          {t("Personal Development Plan (PDP)")}
          <span className="block text-[10px] font-normal text-slate-400">{t("Your growth plan")}</span>
        </button>

        <button
          id="sum-tab-cmo"
          onClick={() => setActiveTab("cmo")}
          className={`px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "cmo" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          {t("Critical Mission Objectives (CMO)")}
          <span className="block text-[10px] font-normal text-slate-400">{t("Your key goals")}</span>
        </button>

        <button
          id="sum-tab-kda"
          onClick={() => setActiveTab("kda")}
          className={`px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "kda" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          {t("Key Deliverable Assignments (KDA)")}
          <span className="block text-[10px] font-normal text-slate-400">{t("Your main tasks")}</span>
        </button>

        <button
          id="sum-tab-evaluation"
          onClick={() => setActiveTab("evaluation")}
          className={`px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "evaluation" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          {t("Team Leader (TL) Evaluation")}
          <span className="block text-[10px] font-normal text-slate-400">{t("Coach's review")}</span>
        </button>
        
        {quarter === "3rd" && (
          <button
            id="sum-tab-comments"
            onClick={() => setActiveTab("comments")}
            className={`px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === "comments" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {t("Additional Comments")}
          </button>
        )}
      </div>

      {/* Main Content Pane */}
      <div className="p-6 md:p-8">
        {formData.status === "Declined" && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-xl text-sm font-medium flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 animate-pulse" />
              <span className="font-bold">
                {t("⚠ Admin Requested Changes (Declined Evaluation)")}
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/60 p-3.5 rounded-lg border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300">
              <div className="text-xs uppercase font-bold text-rose-800 dark:text-rose-400 font-mono mb-1">
                {t("Decline Reason:")}
              </div>
              <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">
                {formData.declineReason || t("No explanation provided.")}
              </p>
              {(formData.declinedBy || formData.declinedAt) && (
                <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center gap-2">
                  <span>{t("Declined by: ")}<strong>{formData.declinedBy || t("Admin")}</strong></span>
                  <span>•</span>
                  <span>{t("On: ")}{formData.declinedAt || t("N/A")}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-rose-600/90 leading-normal">
              {!isOwner 
                ? t("As the Coach, please review the reason above, make the necessary corrections in the 'TL Evaluation' tab, and click 'Resubmit to Admin' to send it back.") 
                : t("The Admin has sent the evaluation back to your Coach for changes. You can review the details, but no action is needed on your part unless your coach contacts you.")}
            </p>
          </div>
        )}
        {formData.status === "Submitted" && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 shrink-0 text-amber-600" />
              <span>
                {isOwner 
                  ? t("✓ Summary submitted to your coach! Waiting for coach's review.") 
                   : t("✓ Staff summary received. You can now fill out the TL Evaluation and submit to Admin.")}
              </span>
            </div>
            {!isOwner && (isCoachOrAdmin || isAdmin) && (
              <span className="text-[10px] font-bold bg-amber-200/60 text-amber-900 uppercase font-mono px-2 py-0.5 rounded-full">
                {t("Action Required")}
              </span>
            )}
          </div>
        )}
        {formData.status === "CoachSubmitted" && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
            <CheckSquare className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{t("✓ Coach's Evaluation Submitted to Admin. This form is now locked (read-only).")}</span>
          </div>
        )}
        {isOwner && (!formData.status || formData.status === "Draft") && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 text-indigo-800 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
            <ClipboardList className="w-5 h-5 shrink-0 text-indigo-600" />
            <span>{t("You are drafting your Quarterly Review Summary. Please complete sections 1–4 (PDP, CMO, KDA, Suggestions). The ")}<strong>TL Evaluation</strong>{t(" tab is restricted and will be filled out by your Coach.")}</span>
          </div>
        )}
        {isCoachOrAdmin && !isOwner && (!formData.status || formData.status === "Draft") && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
            <UserCheck className="w-5 h-5 shrink-0 text-yellow-600" />
            <span>{t("⚠ The member has not submitted their summary to you yet. You can read their draft, but please wait for them to submit before completing the evaluation.")}</span>
          </div>
        )}
        {isCoachOrAdmin && !isOwner && formData.status === "Submitted" && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
            <UserCheck className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{t("You are reviewing this summary as the approved Coach. Sections 1–4 are read-only. Please complete your evaluation in the ")}<strong>TL Evaluation</strong>{t(" tab.")}</span>
          </div>
        )}
        {!isOwner && !isCoachOrAdmin && (
          <div className="mb-6 bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-xl text-sm">
            {t("Note: You are viewing this evaluation summary in View Only mode. Edit access is restricted to the member and their approved coaches.")}
          </div>
        )}

        {/* TAB 1: HEADER & GENERAL SUGGESTIONS */}
        {activeTab === "header" && (
          <div className="space-y-6 max-w-4xl animate-fade-in">
            <h3 className="text-lg font-sans font-bold text-slate-800 border-b border-slate-100 pb-2">
              {t("Section 1 — General Information & Staff Suggestions")}
            </h3>

            {/* Card 1: Staff Identity */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <User className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{t("Your Details")}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Staff Member Name")}</label>
                  <input
                    type="text"
                    name="staffName"
                    id="sum-staff-name"
                    value={formData.staffName || ""}
                    onChange={handleTextChange}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 disabled:bg-white disabled:text-slate-500"
                    placeholder={t("Full name of the staff member")}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t("The person being reviewed")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Team Leader Name")}</label>
                  <input
                    type="text"
                    name="teamLeaderName"
                    id="sum-team-leader-name"
                    value={formData.teamLeaderName || ""}
                    onChange={handleTextChange}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 disabled:bg-white disabled:text-slate-500"
                    placeholder={t("Name of the direct supervisor")}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t("Direct supervisor of this staff member")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Reviewer Name & Position")}</label>
                  <input
                    type="text"
                    name="reviewerNamePosition"
                    id="sum-reviewer"
                    value={formData.reviewerNamePosition || ""}
                    onChange={handleTextChange}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 disabled:bg-white disabled:text-slate-500"
                    placeholder={t("e.g. John Doe (Regional Coordinator)")}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t("Only needed if reviewer is not the Team Leader")}</p>
                </div>
              </div>
            </div>

            {/* Card 2: Role & Timeline */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{t("Role & Timeline")}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Current Position / Role")}</label>
                  <input
                    type="text"
                    name="position"
                    id="sum-position"
                    value={formData.position || ""}
                    onChange={handleTextChange}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 disabled:bg-white disabled:text-slate-500"
                    placeholder={t("e.g. Youth Ministry Coordinator")}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t("Official job title or role")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Date Joined Staff")}</label>
                  <input
                    type="text"
                    name="dateJoinedStaff"
                    id="sum-date-joined"
                    value={formData.dateJoinedStaff || ""}
                    onChange={handleTextChange}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 disabled:bg-white disabled:text-slate-500"
                    placeholder={t("e.g. September 2018")}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t("When the staff member first joined the organization")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("In Present Position Since")}</label>
                  <input
                    type="text"
                    name="presentPositionSince"
                    id="sum-position-since"
                    value={formData.presentPositionSince || ""}
                    onChange={handleTextChange}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 disabled:bg-white disabled:text-slate-500"
                    placeholder={t("e.g. January 2023")}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t("Month/Year the staff member started this role")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Supervised By Current Team Leader Since")}</label>
                  <input
                    type="text"
                    name="supervisedBySince"
                    id="sum-supervised-since"
                    value={formData.supervisedBySince || ""}
                    onChange={handleTextChange}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 disabled:bg-white disabled:text-slate-500"
                    placeholder={t("e.g. March 2024")}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t("Month/Year when the current Team Leader started supervising")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Date Completed")}</label>
                  <input
                    type="date"
                    name="date"
                    id="sum-date"
                    value={formData.date || ""}
                    onChange={handleTextChange}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 disabled:bg-white disabled:text-slate-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t("Date this summary was filled out")}</p>
                </div>
              </div>
            </div>

            {/* Card 3: Staff Suggestions */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {t("Suggestions for Improvement")}
                </h4>
              </div>
              <p className="text-xs text-slate-500">{t("What suggestions do you (staff member) have for the improvement of your team or department?")}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("Suggestion 1")}</label>
                  <textarea
                    id="sum-suggestion-0"
                    value={formData.suggestions[0] || ""}
                    onChange={(e) => handleSuggestionChange(0, e.target.value)}
                    disabled={!isLeaderView}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-sm disabled:bg-white disabled:text-slate-500"
                    placeholder={t("First suggestion for team or department improvement...")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("Suggestion 2")}</label>
                  <textarea
                    id="sum-suggestion-1"
                    value={formData.suggestions[1] || ""}
                    onChange={(e) => handleSuggestionChange(1, e.target.value)}
                    disabled={!isLeaderView}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-sm disabled:bg-white disabled:text-slate-500"
                    placeholder={t("Second suggestion for team or department improvement...")}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL DEVELOPMENT PLAN (PDP) */}
        {activeTab === "pdp" && (
          <div className="space-y-6 max-w-5xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-sans font-bold text-slate-800">
                  {t("Personal Development Plan (PDP)")}
                </h3>
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400">{t("Your growth plan — ")}</span>
                  {quarter === "1st" && t("Define priorities and desired SMART goals.")}
                  {quarter === "2nd" && t("Measure progress made and changes needed.")}
                  {quarter === "3rd" && t("Assign S/O/NI ratings and record the next steps.")}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {(["heart", "personalLife", "relationalLife"] as const).map(category => {
                const categoryLabel = category === "heart" ? "Heart" : category === "personalLife" ? "Personal Life" : "Relational Life";
                const catData = formData.pdp[category];

                return (
                  <div key={category} className="bg-slate-50 dark:bg-slate-950 rounded-xl p-5 border border-slate-150 dark:border-slate-850 space-y-4">
                    <h4 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-base border-b border-slate-200 dark:border-slate-800 pb-2 capitalize">
                      {t(categoryLabel + " Priority")}
                    </h4>

                    {/* Descriptions and Self-Reflecting Questions */}
                    {DEVELOPMENT_REVIEW_SECTIONS[category] && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="lg:col-span-5 space-y-2">
                          <h5 className="font-sans font-bold text-indigo-700 dark:text-indigo-450 border-b border-slate-100 dark:border-slate-800 pb-1 uppercase tracking-wider text-[10px]">
                            {t("Core Focus Areas")}
                          </h5>
                          <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                            {DEVELOPMENT_REVIEW_SECTIONS[category].bullets.map((b, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-indigo-400 dark:text-indigo-500 font-mono text-[10px] mt-0.5">{idx + 1}.</span>
                                <span className="leading-relaxed">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="lg:col-span-7 bg-slate-50/50 dark:bg-slate-950/40 rounded-lg p-3 border border-slate-150 dark:border-slate-850 space-y-2">
                          <h5 className="font-sans font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1">
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                            {t("Self-Reflection Guide Questions")}
                          </h5>
                          <div className="space-y-2 text-slate-700 dark:text-slate-300">
                            {DEVELOPMENT_REVIEW_SECTIONS[category].questions.map((q, idx) => (
                              <p key={idx} className="leading-relaxed pl-2.5 border-l-2 border-slate-200 dark:border-slate-800">
                                {q}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{t("PDP Goal / Priority for growth")}</label>
                        <textarea
                          id={`pdp-goal-${category}`}
                          value={catData.goal || ""}
                          onChange={(e) => handlePDPChange(category, "goal", e.target.value)}
                          disabled={!isLeaderView}
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{t("Desired SMART Result")}</label>
                        <textarea
                          id={`pdp-desiredResult-${category}`}
                          value={catData.desiredResult || ""}
                          onChange={(e) => handlePDPChange(category, "desiredResult", e.target.value)}
                          disabled={!isLeaderView}
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                        />
                      </div>

                      {/* 2nd Quarter Extra Fields */}
                      {quarter === "2nd" && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("Progress Made")}</label>
                            <textarea
                              id={`pdp-progress-${category}`}
                              value={catData.progressMade || ""}
                              onChange={(e) => handlePDPChange(category, "progressMade", e.target.value)}
                              disabled={!isLeaderView}
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("Changes Needed")}</label>
                            <textarea
                              id={`pdp-changes-${category}`}
                              value={catData.changesNeeded || ""}
                              onChange={(e) => handlePDPChange(category, "changesNeeded", e.target.value)}
                              disabled={!isLeaderView}
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                            />
                          </div>
                        </>
                      )}

                      {/* 3rd Quarter Extra Fields */}
                      {quarter === "3rd" && (
                        <>
                          <div className="flex flex-col md:flex-row md:items-center gap-6 py-2 bg-indigo-50/40 border border-indigo-100/50 rounded-lg px-4 md:col-span-2">
                            <span className="text-xs font-bold uppercase text-indigo-800 tracking-wider">{t("Evaluation:")}</span>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                <input
                                  type="checkbox"
                                  id={`pdp-s-${category}`}
                                  checked={catData.s || false}
                                  onChange={(e) => {
                                    handlePDPChange(category, "s", e.target.checked);
                                    if (e.target.checked) {
                                      handlePDPChange(category, "o", false);
                                      handlePDPChange(category, "ni", false);
                                    }
                                  }}
                                  disabled={!isLeaderView}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {t("S (Satisfactory)")}
                              </label>

                              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                <input
                                  type="checkbox"
                                  id={`pdp-o-${category}`}
                                  checked={catData.o || false}
                                  onChange={(e) => {
                                    handlePDPChange(category, "o", e.target.checked);
                                    if (e.target.checked) {
                                      handlePDPChange(category, "s", false);
                                      handlePDPChange(category, "ni", false);
                                    }
                                  }}
                                  disabled={!isLeaderView}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {t("O (Outstanding)")}
                              </label>

                              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                <input
                                  type="checkbox"
                                  id={`pdp-ni-${category}`}
                                  checked={catData.ni || false}
                                  onChange={(e) => {
                                    handlePDPChange(category, "ni", e.target.checked);
                                    if (e.target.checked) {
                                      handlePDPChange(category, "s", false);
                                      handlePDPChange(category, "o", false);
                                    }
                                  }}
                                  disabled={!isLeaderView}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {t("NI (Needs Improvement)")}
                              </label>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("Next Step")}</label>
                            <input
                              type="text"
                              id={`pdp-nextstep-${category}`}
                              value={catData.nextStep || ""}
                              onChange={(e) => handlePDPChange(category, "nextStep", e.target.value)}
                              disabled={!isLeaderView}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CRITICAL MISSION OBJECTIVES (CMO) */}
        {activeTab === "cmo" && (
          <div className="space-y-6 max-w-5xl animate-fade-in">
            <div>
              <h3 className="text-lg font-sans font-bold text-slate-800">
                {t("Critical Mission Objectives (CMO)")}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-slate-400">{t("Your key goals — ")}</span>{t("List your top 3 goals for this period and report on the results, progress, or evaluation of each.")}
              </p>
            </div>

            {/* Ministry Effectiveness Context — same description as the monthly form */}
            {DEVELOPMENT_REVIEW_SECTIONS.ministryEffectiveness && (
              <div className="bg-indigo-50/60 rounded-xl p-5 border border-indigo-100 space-y-4">
                <div>
                  <ul className="space-y-1.5 text-xs text-indigo-800">
                    {DEVELOPMENT_REVIEW_SECTIONS.ministryEffectiveness.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-400 font-mono text-[10px] mt-0.5">{i + 1}.</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm space-y-2">
                  <h5 className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                    {t("Self-Reflection Guide")}
                  </h5>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {DEVELOPMENT_REVIEW_SECTIONS.ministryEffectiveness.questions.map((q, i) => (
                      <p key={i} className="leading-relaxed pl-3 border-l-2 border-indigo-200">
                        {q}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {[0, 1, 2].map(index => {
                const item = formData.cmo[index] || { objective: "", desiredResult: "" };

                return (
                  <div key={index} className="bg-slate-50 rounded-xl p-5 border border-slate-150 space-y-4">
                    <h4 className="font-sans font-bold text-slate-700 text-sm uppercase tracking-wider">
                      {t("Objective ")}{index + 1}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{t("Role Objective")}</label>
                        <input
                          type="text"
                          id={`cmo-obj-${index}`}
                          value={item.objective || ""}
                          onChange={(e) => handleCMOChange(index, "objective", e.target.value)}
                          disabled={!isLeaderView}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{t("Desired SMART Result")}</label>
                        <input
                          type="text"
                          id={`cmo-res-${index}`}
                          value={item.desiredResult || ""}
                          onChange={(e) => handleCMOChange(index, "desiredResult", e.target.value)}
                          disabled={!isLeaderView}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                        />
                      </div>

                      {/* 2nd Quarter Extra Fields */}
                      {quarter === "2nd" && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("Progress Made")}</label>
                            <textarea
                              id={`cmo-progress-${index}`}
                              value={item.progressMade || ""}
                              onChange={(e) => handleCMOChange(index, "progressMade", e.target.value)}
                              disabled={!isLeaderView}
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("Changes Needed")}</label>
                            <textarea
                              id={`cmo-changes-${index}`}
                              value={item.changesNeeded || ""}
                              onChange={(e) => handleCMOChange(index, "changesNeeded", e.target.value)}
                              disabled={!isLeaderView}
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                            />
                          </div>
                        </>
                      )}

                      {/* 3rd Quarter Extra Fields */}
                      {quarter === "3rd" && (
                        <>
                          <div className="flex flex-col md:flex-row md:items-center gap-6 py-2 bg-indigo-50/40 border border-indigo-100/50 rounded-lg px-4 md:col-span-2">
                            <span className="text-xs font-bold uppercase text-indigo-800 tracking-wider">{t("Evaluation:")}</span>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                <input
                                  type="checkbox"
                                  id={`cmo-s-${index}`}
                                  checked={item.s || false}
                                  onChange={(e) => {
                                    handleCMOChange(index, "s", e.target.checked);
                                    if (e.target.checked) {
                                      handleCMOChange(index, "o", false);
                                      handleCMOChange(index, "ni", false);
                                    }
                                  }}
                                  disabled={!isLeaderView}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {t("S (Satisfactory)")}
                              </label>

                              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                <input
                                  type="checkbox"
                                  id={`cmo-o-${index}`}
                                  checked={item.o || false}
                                  onChange={(e) => {
                                    handleCMOChange(index, "o", e.target.checked);
                                    if (e.target.checked) {
                                      handleCMOChange(index, "s", false);
                                      handleCMOChange(index, "ni", false);
                                    }
                                  }}
                                  disabled={!isLeaderView}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {t("O (Outstanding)")}
                              </label>

                              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                <input
                                  type="checkbox"
                                  id={`cmo-ni-${index}`}
                                  checked={item.ni || false}
                                  onChange={(e) => {
                                    handleCMOChange(index, "ni", e.target.checked);
                                    if (e.target.checked) {
                                      handleCMOChange(index, "s", false);
                                      handleCMOChange(index, "o", false);
                                    }
                                  }}
                                  disabled={!isLeaderView}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {t("NI (Needs Improvement)")}
                              </label>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("Next Step")}</label>
                            <input
                              type="text"
                              id={`cmo-nextstep-${index}`}
                              value={item.nextStep || ""}
                              onChange={(e) => handleCMOChange(index, "nextStep", e.target.value)}
                              disabled={!isLeaderView}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: KEY DEVELOPMENT ASSIGNMENTS (KDA) */}
        {activeTab === "kda" && (
          <div className="space-y-6 max-w-5xl animate-fade-in">
            <div>
              <h3 className="text-lg font-sans font-bold text-slate-800">
                {t("Key Deliverable Assignments (KDA)")}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-slate-400">{t("Your main tasks — ")}</span>{t("Up to 2 key tasks assigned to you for leadership development.")}
              </p>
            </div>

            <div className="space-y-6">
              {[0, 1].map(index => {
                const item = formData.kda[index] || { assignment: "" };

                return (
                  <div key={index} className="bg-slate-50 rounded-xl p-5 border border-slate-150 space-y-4">
                    <h4 className="font-sans font-bold text-slate-700 text-sm uppercase tracking-wider">
                      {t("Assignment ")}{index + 1}
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{t("Assignment details / focus")}</label>
                        <input
                          type="text"
                          id={`kda-ass-${index}`}
                          value={item.assignment || ""}
                          onChange={(e) => handleKDAChange(index, "assignment", e.target.value)}
                          disabled={!isLeaderView}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white disabled:bg-slate-100"
                        />
                      </div>

                      {/* 2nd Quarter Extra Fields */}
                      {quarter === "2nd" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("Progress Made")}</label>
                            <textarea
                              id={`kda-progress-${index}`}
                              value={item.progressMade || ""}
                              onChange={(e) => handleKDAChange(index, "progressMade", e.target.value)}
                              disabled={!isLeaderView}
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{t("Changes Needed")}</label>
                            <textarea
                              id={`kda-changes-${index}`}
                              value={item.changesNeeded || ""}
                              onChange={(e) => handleKDAChange(index, "changesNeeded", e.target.value)}
                              disabled={!isLeaderView}
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* 3rd Quarter Extra Fields */}
                      {quarter === "3rd" && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">{t("Next Step")}</label>
                          <input
                            type="text"
                            id={`kda-nextstep-${index}`}
                            value={item.nextStep || ""}
                            onChange={(e) => handleKDAChange(index, "nextStep", e.target.value)}
                            disabled={!isLeaderView}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: EVALUATION (FOR TEAM LEADER USE) */}
        {activeTab === "evaluation" && (
          <div className="space-y-8 max-w-4xl animate-fade-in">
            <div>
              <h3 className="text-lg font-sans font-bold text-slate-800">
                {t("Coach's Evaluation")}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("Your coach fills this section after reviewing your summary.")}
              </p>
            </div>

            <div className="space-y-6">
              {/* Question 1: Overall Effectiveness */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <h4 className="font-sans font-semibold text-slate-800 text-sm">
                  {t("1. Check the box which best reflects your assessment of the staff member's overall effectiveness:")}
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  {["One of the best", "Satisfactory", "Ineffective"].map(option => (
                    <label key={option} className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        id={`eval-eff-${option.replace(/\s+/g, "-")}`}
                        name="overallEffectiveness"
                        value={option}
                        checked={formData.evaluation.overallEffectiveness === option}
                        onChange={(e) => handleEvaluationChange("overallEffectiveness", e.target.value)}
                        disabled={!isLeaderView}
                        className="text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      {option === "One of the best" ? t("One of the best in his/her position") : t(option)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Question 2: Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top 3 Strengths */}
                <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-5 space-y-4">
                  <h4 className="font-sans font-semibold text-emerald-800 text-sm border-b border-emerald-100 pb-2">
                    {t("Top 3 Strengths")}
                  </h4>
                  <div className="space-y-3">
                    {[0, 1, 2].map(index => (
                      <div key={index}>
                        <label className="block text-xs font-medium text-emerald-700 mb-1">{t("Strength ")}{index + 1}</label>
                        <input
                          type="text"
                          id={`eval-str-${index}`}
                          value={formData.evaluation.strengths[index] || ""}
                          onChange={(e) => handleEvaluationListChange("strengths", index, e.target.value)}
                          disabled={!isLeaderView}
                          className="w-full border border-emerald-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 3 Weaknesses */}
                <div className="bg-amber-50/20 border border-amber-100 rounded-xl p-5 space-y-4">
                  <h4 className="font-sans font-semibold text-amber-800 text-sm border-b border-amber-100 pb-2">
                    {t("Top 3 Weaknesses")}
                  </h4>
                  <div className="space-y-3">
                    {[0, 1, 2].map(index => (
                      <div key={index}>
                        <label className="block text-xs font-medium text-amber-700 mb-1">{t("Weakness ")}{index + 1}</label>
                        <input
                          type="text"
                          id={`eval-wk-${index}`}
                          value={formData.evaluation.weaknesses[index] || ""}
                          onChange={(e) => handleEvaluationListChange("weaknesses", index, e.target.value)}
                          disabled={!isLeaderView}
                          className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Question 3: Lack of Confidence Area */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
                <h4 className="font-sans font-semibold text-slate-800 text-sm">
                  {t("3. In what area(s) do you lack confidence in this staff member in their current role? (Please, explain):")}
                </h4>
                <textarea
                  id="eval-lack-confidence"
                  value={formData.evaluation.lackConfidence || ""}
                  onChange={(e) => handleEvaluationChange("lackConfidence", e.target.value)}
                  disabled={!isLeaderView}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-sm bg-white"
                  placeholder={t("Explain any areas of reservation or limited confidence...")}
                />
              </div>

              {/* Question 4: Ready for Greater Responsibility */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-b border-slate-200/60 pb-3">
                  <h4 className="font-sans font-semibold text-slate-800 text-sm">
                    {t("4. Is this person ready to move into a position of greater responsibility?")}
                  </h4>
                  <div className="flex items-center gap-4">
                    {["Yes", "No"].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          id={`eval-ready-${opt}`}
                          name="readyForGreaterResp"
                          value={opt}
                          checked={formData.evaluation.readyForGreaterResp === opt}
                          onChange={(e) => handleEvaluationChange("readyForGreaterResp", e.target.value)}
                          disabled={!isLeaderView}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        {t(opt)}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.evaluation.readyForGreaterResp === "Yes" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("If yes, what position?")}</label>
                      <input
                        type="text"
                        id="eval-ready-position"
                        value={formData.evaluation.greaterRespDetails.position || ""}
                        onChange={(e) => handleEvaluationNestedChange("greaterRespDetails", "position", e.target.value)}
                        disabled={!isLeaderView}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("When?")}</label>
                      <input
                        type="text"
                        id="eval-ready-when"
                        value={formData.evaluation.greaterRespDetails.when || ""}
                        onChange={(e) => handleEvaluationNestedChange("greaterRespDetails", "when", e.target.value)}
                        disabled={!isLeaderView}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Question 5: Recommend Re-assignment */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-b border-slate-200/60 pb-3">
                  <h4 className="font-sans font-semibold text-slate-800 text-sm">
                    {t("5. Do you recommend a re-assignment?")}
                  </h4>
                  <div className="flex items-center gap-4">
                    {["Yes", "No"].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          id={`eval-reassign-${opt}`}
                          name="recommendReassignment"
                          value={opt}
                          checked={formData.evaluation.recommendReassignment === opt}
                          onChange={(e) => handleEvaluationChange("recommendReassignment", e.target.value)}
                          disabled={!isLeaderView}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        {t(opt)}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.evaluation.recommendReassignment === "Yes" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("If yes, what position/location?")}</label>
                      <input
                        type="text"
                        id="eval-reassign-details"
                        value={formData.evaluation.reassignmentDetails.positionLocation || ""}
                        onChange={(e) => handleEvaluationNestedChange("reassignmentDetails", "positionLocation", e.target.value)}
                        disabled={!isLeaderView}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("Why?")}</label>
                      <input
                        type="text"
                        id="eval-reassign-why"
                        value={formData.evaluation.reassignmentDetails.why || ""}
                        onChange={(e) => handleEvaluationNestedChange("reassignmentDetails", "why", e.target.value)}
                        disabled={!isLeaderView}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-sm bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Team Leader Signature / Date")}</label>
                  <input
                    type="text"
                    id="eval-sig-leader"
                    value={formData.evaluation.teamLeaderSignature || ""}
                    onChange={(e) => handleEvaluationChange("teamLeaderSignature", e.target.value)}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm disabled:bg-slate-100"
                    placeholder={t("e.g. Roza Wesenu Date 20/26")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Staff Member Signature / Date")}</label>
                  <input
                    type="text"
                    id="eval-sig-member"
                    value={formData.evaluation.teamLeaderSignatureDate || ""}
                    onChange={(e) => handleEvaluationChange("teamLeaderSignatureDate", e.target.value)}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm disabled:bg-slate-100"
                    placeholder={t("e.g. Bayush Tilahun Date 20/26")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("Form Reviewed By (Name/Sig/Date)")}</label>
                  <input
                    type="text"
                    id="eval-sig-reviewed"
                    value={formData.evaluation.formReviewedByNameSigDate || ""}
                    onChange={(e) => handleEvaluationChange("formReviewedByNameSigDate", e.target.value)}
                    disabled={!isLeaderView}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm disabled:bg-slate-100"
                    placeholder={t("Name / Signature / Date")}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADDITIONAL COMMENTS (3RD QUARTER ONLY) */}
        {activeTab === "comments" && quarter === "3rd" && (
          <div className="space-y-6 max-w-4xl animate-fade-in">
            <h3 className="text-lg font-sans font-bold text-slate-800 border-b border-slate-100 pb-2">
              {t("Additional Comments")}
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t("3rd Quarter Final Comments")}</label>
              <textarea
                id="eval-additional-comments"
                value={formData.additionalComments || ""}
                onChange={(e) => handleTextChange(e)}
                name="additionalComments"
                disabled={!isLeaderView}
                rows={6}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-800 text-sm"
                placeholder={t("Record final closing comments for the year...")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
    )}
    </>
  );
}
