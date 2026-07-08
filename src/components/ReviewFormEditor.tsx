import React, { useState, useEffect } from "react";
import { DevelopmentReview, ReviewSectionData, ReviewRequirementSettings } from "../types";
import { DEVELOPMENT_REVIEW_SECTIONS, QUARTER_INFO } from "../constants";
import { Heart, User, Clipboard, Users, ShieldAlert, Award, AlertCircle, Save, CheckCircle2, Check, MessageSquare } from "lucide-react";

interface ReviewFormEditorProps {
  review: DevelopmentReview;
  onSave: (updatedReview: DevelopmentReview) => Promise<void>;
  onClose: () => void;
  isLeaderView: boolean;
  staffName?: string;
  requiredSettings?: ReviewRequirementSettings;
  isAdmin?: boolean;
}

export default function ReviewFormEditor({
  review,
  onSave,
  onClose,
  isLeaderView,
  staffName,
  requiredSettings,
  isAdmin = false
}: ReviewFormEditorProps) {
  const [formData, setFormData] = useState<DevelopmentReview>({ ...review });
  const isReadOnly = !isLeaderView && !isAdmin && review.status === "Submitted";
  const [activeTab, setActiveTab] = useState<"header" | "heart" | "personal" | "relational" | "ministry">("header");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    setFormData({ ...review });
  }, [review]);

  const handleSubmitClick = () => {
    setValidationErrors([]);
    const errors: string[] = [];
    
    if (settings.heartRequired && !isSectionComplete("heart")) {
      errors.push("Heart Walk Quadrant: Please fill out all 3 points of Strengths, Needs Improvement, and Suggested Action Points.");
    }
    if (settings.personalLifeRequired && !isSectionComplete("personal")) {
      errors.push("Personal Life Quadrant: Please fill out all 3 points of Strengths, Needs Improvement, and Suggested Action Points.");
    }
    if (settings.relationalLifeRequired && !isSectionComplete("relational")) {
      errors.push("Relational Life Quadrant: Please fill out all 3 points of Strengths, Needs Improvement, and Suggested Action Points.");
    }
    if (settings.ministryEffectivenessRequired && !isSectionComplete("ministry")) {
      errors.push("Ministry Effectiveness Quadrant: Please fill out all 3 points of Strengths, Needs Improvement, and Suggested Action Points.");
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      const container = document.getElementById("review-editor-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirm(false);
    await handleSave("Submitted");
  };

  // Scroll to the top of the form editor container when activeTab changes
  useEffect(() => {
    const container = document.getElementById("review-editor-container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeTab]);

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSectionChange = (
    section: "heart" | "personalLife" | "relationalLife" | "ministryEffectiveness",
    field: keyof ReviewSectionData,
    index: number,
    value: string
  ) => {
    setFormData(prev => {
      const sectionData = { ...prev[section] };
      const list = [...sectionData[field]];
      list[index] = value;
      sectionData[field] = list;
      return {
        ...prev,
        [section]: sectionData
      };
    });
  };

  const handleCommentChange = (section: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      leaderSectionComments: {
        ...(prev.leaderSectionComments || {}),
        [section]: value
      }
    }));
  };

  const getSectionKey = (tab: string) => {
    if (tab === "heart") return "heart";
    if (tab === "personal") return "personalLife";
    if (tab === "relational") return "relationalLife";
    if (tab === "ministry") return "ministryEffectiveness";
    return "";
  };

  const settings = requiredSettings || {
    heartRequired: true,
    personalLifeRequired: true,
    relationalLifeRequired: true,
    ministryEffectivenessRequired: true
  };

  const isSectionComplete = (tabId: string) => {
    if (tabId === "header") return true;
    const sKey = getSectionKey(tabId);
    if (!sKey) return true;
    const sec = formData[sKey as "heart" | "personalLife" | "relationalLife" | "ministryEffectiveness"];
    return (
      sec.strengths.every(s => s && s.trim() !== "") &&
      sec.needsImprovement.every(n => n && n.trim() !== "") &&
      sec.suggestedActionPoints.every(a => a && a.trim() !== "")
    );
  };

  const isRequired = (tabId: string) => {
    if (tabId === "heart") return settings.heartRequired;
    if (tabId === "personal") return settings.personalLifeRequired;
    if (tabId === "relational") return settings.relationalLifeRequired;
    if (tabId === "ministry") return settings.ministryEffectivenessRequired;
    return false;
  };

  const handleSave = async (statusOverride?: "Draft" | "Submitted") => {
    setSaving(true);
    setSaveSuccess(false);
    setValidationErrors([]);
    try {
      const targetStatus = statusOverride !== undefined ? statusOverride : formData.status;
      if (targetStatus === "Submitted" && !isLeaderView) {
        const errors: string[] = [];
        
        if (settings.heartRequired && !isSectionComplete("heart")) {
          errors.push("Heart Walk Quadrant: Please fill out all 3 points of Strengths, Needs Improvement, and Suggested Action Points.");
        }
        if (settings.personalLifeRequired && !isSectionComplete("personal")) {
          errors.push("Personal Life Quadrant: Please fill out all 3 points of Strengths, Needs Improvement, and Suggested Action Points.");
        }
        if (settings.relationalLifeRequired && !isSectionComplete("relational")) {
          errors.push("Relational Life Quadrant: Please fill out all 3 points of Strengths, Needs Improvement, and Suggested Action Points.");
        }
        if (settings.ministryEffectivenessRequired && !isSectionComplete("ministry")) {
          errors.push("Ministry Effectiveness Quadrant: Please fill out all 3 points of Strengths, Needs Improvement, and Suggested Action Points.");
        }

        if (errors.length > 0) {
          setValidationErrors(errors);
          setSaving(false);
          const container = document.getElementById("review-editor-container");
          if (container) {
            container.scrollIntoView({ behavior: "smooth" });
          }
          return;
        }
      }

      const updated = {
        ...formData,
        status: targetStatus,
        updatedAt: Date.now(),
        lastUpdatedBy: isLeaderView ? "Team Leader" : "Team Member"
      };
      await onSave(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onClose();
    } catch (err) {
      console.error("Failed to save review:", err);
    } finally {
      setSaving(false);
    }
  };

  // Sections definitions for mapping tabs
  const tabs = [
    { id: "header" as const, label: "Form Info", icon: Clipboard },
    { id: "heart" as const, label: "Heart Walk", icon: Heart },
    { id: "personal" as const, label: "Personal Life", icon: User },
    { id: "relational" as const, label: "Relational Life", icon: Users },
    { id: "ministry" as const, label: "Ministry Effectiveness", icon: Award }
  ];

  const currentSectionKey = getSectionKey(activeTab);
  const currentSectionData = currentSectionKey 
    ? (DEVELOPMENT_REVIEW_SECTIONS[currentSectionKey as keyof typeof DEVELOPMENT_REVIEW_SECTIONS])
    : null;

  return (
    <div id="review-editor-container" className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-500/30">
              {QUARTER_INFO[review.quarter].name} Review Form
            </span>
            <h2 className="text-2xl font-sans font-bold tracking-tight mt-2 text-white">
              {isLeaderView ? `Review for ${staffName || review.staffMemberName}` : "My Development Review"}
            </h2>
            <p className="text-xs text-slate-300 font-mono mt-1">
              Status: <span className={review.status === "Submitted" ? "text-emerald-400" : "text-amber-400 font-semibold"}>{formData.status}</span>
              {isLeaderView && " • Editing as Team Leader"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLeaderView ? (
              <button
                id="leader-save-actions-btn"
                onClick={() => handleSave()}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-900/10 text-white"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving Changes..." : "Save Feedback & Actions"}
              </button>
            ) : (
              <>
                <button
                  id="save-draft-btn"
                  onClick={() => handleSave("Draft")}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-slate-600"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  id="submit-review-btn"
                  onClick={handleSubmitClick}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-900/10 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? "Submitting..." : "Submit to Leader"}
                </button>
              </>
            )}
            <button
              id="close-editor-btn"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 text-sm flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            Your review form changes have been successfully saved to the cloud.
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-slate-50 flex overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const required = isRequired(tab.id);
          const complete = isSectionComplete(tab.id);
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                isActive
                  ? "border-slate-800 text-slate-800 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-slate-800" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              
              {required && (
                <span className="text-rose-500 font-extrabold text-xs" title="Required section">
                  *
                </span>
              )}

              {tab.id !== "header" && (
                complete ? (
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Fully Completed" />
                ) : required ? (
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" title="Incomplete required quadrant" />
                ) : null
              )}
            </button>
          );
        })}
      </div>

      {/* Editor Content Area */}
      <div className="p-6 md:p-8">
        {/* Dynamic Validation Errors Banner */}
        {validationErrors.length > 0 && (
          <div id="validation-errors-banner" className="mb-6 bg-rose-50 border-2 border-rose-200 rounded-xl p-5 text-rose-900 animate-scale-up">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-sm text-rose-950">Submission Blocked: Missing Mandatory Information</h4>
                <p className="text-xs text-rose-700">
                  Your supervisor has set completion requirements. You cannot submit this review until you provide all three bullet points for Strengths, Needs Improvement, and Suggested Action Points in each required section:
                </p>
                <ul className="list-disc pl-5 text-xs text-rose-800 space-y-1.5 font-semibold">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {/* TAB 1: HEADER INFO */}
        {activeTab === "header" && (
          <div className="space-y-6 max-w-3xl animate-fade-in">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 text-sm text-blue-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Development Review Instructions</h4>
                <p className="leading-relaxed">
                  Development review is designed for National Ministries in the Africa Region based on the Leadership Development Framework.
                  Fill in your general assignment details here before proceeding to assess the core quadrants.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Staff Member Name</label>
                <input
                  type="text"
                  name="staffMemberName"
                  id="input-staff-member-name"
                  value={formData.staffMemberName || ""}
                  onChange={handleHeaderChange}
                  disabled={isReadOnly}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder="e.g. Bayush Tilahun"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ministry Assignment</label>
                <input
                  type="text"
                  name="ministryAssignment"
                  id="input-ministry-assignment"
                  value={formData.ministryAssignment || ""}
                  onChange={handleHeaderChange}
                  disabled={isReadOnly}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder="e.g. National Headquarters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Supervisor / Team Leader Name</label>
                <input
                  type="text"
                  name="supervisorName"
                  id="input-supervisor-name"
                  value={formData.supervisorName || ""}
                  onChange={handleHeaderChange}
                  disabled={isReadOnly}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder="e.g. Roza Wesenu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Months Covered</label>
                <input
                  type="text"
                  name="monthsCovered"
                  id="input-months-covered"
                  value={formData.monthsCovered || ""}
                  onChange={handleHeaderChange}
                  disabled={isReadOnly}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder="e.g. July - October 2025"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                id="next-btn-heart"
                onClick={() => setActiveTab("heart")}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Continue to Heart Walk
              </button>
            </div>
          </div>
        )}

        {/* CORE QUADRANT TABS */}
        {currentSectionData && currentSectionKey && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Main Form Content */}
            <div className="xl:col-span-8 space-y-8">
              {/* Guide Info */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 rounded-xl p-6 border border-slate-150">
                <div className="lg:col-span-5 space-y-3.5">
                  <h3 className="font-sans font-bold text-slate-800 text-base border-b border-slate-200 pb-2">
                    {currentSectionData.title}
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {currentSectionData.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-slate-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-7 bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    Self-Reflection Guide Questions
                  </h4>
                  <div className="space-y-2.5 text-sm text-slate-700">
                    {currentSectionData.questions.map((q, i) => (
                      <p key={i} className="leading-relaxed pl-3 border-l-2 border-slate-300">
                        {q}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Matrix Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* STRENGTHS */}
                <div className="bg-emerald-50/20 border border-emerald-100/55 rounded-xl p-5 space-y-4">
                  <div className="border-b border-emerald-100 pb-2">
                    <h4 className="font-sans font-semibold text-emerald-800 text-sm uppercase tracking-wider">
                      Strengths
                    </h4>
                    <p className="text-xs text-emerald-600 mt-0.5">Where do you demonstrate strengths?</p>
                  </div>
                  <div className="space-y-3">
                    {[0, 1, 2].map(index => (
                      <div key={index}>
                        <label className="block text-xs font-medium text-emerald-700 mb-1">Point {index + 1}</label>
                        <textarea
                          id={`textarea-strength-${currentSectionKey}-${index}`}
                          value={formData[currentSectionKey as "heart" | "personalLife" | "relationalLife" | "ministryEffectiveness"].strengths[index] || ""}
                          onChange={(e) => handleSectionChange(
                            currentSectionKey as any,
                            "strengths",
                            index,
                            e.target.value
                          )}
                          rows={2}
                          disabled={isReadOnly}
                          className="w-full border border-emerald-200/60 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white animate-fade-in disabled:bg-slate-100 disabled:text-slate-400"
                          placeholder="Describe your strength..."
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* NEEDS IMPROVEMENT */}
                <div className="bg-amber-50/20 border border-amber-100/55 rounded-xl p-5 space-y-4">
                  <div className="border-b border-amber-100 pb-2">
                    <h4 className="font-sans font-semibold text-amber-800 text-sm uppercase tracking-wider">
                      Needs Improvement
                    </h4>
                    <p className="text-xs text-amber-600 mt-0.5">Which areas require growth?</p>
                  </div>
                  <div className="space-y-3">
                    {[0, 1, 2].map(index => (
                      <div key={index}>
                        <label className="block text-xs font-medium text-amber-700 mb-1">Point {index + 1}</label>
                        <textarea
                          id={`textarea-improve-${currentSectionKey}-${index}`}
                          value={formData[currentSectionKey as "heart" | "personalLife" | "relationalLife" | "ministryEffectiveness"].needsImprovement[index] || ""}
                          onChange={(e) => handleSectionChange(
                            currentSectionKey as any,
                            "needsImprovement",
                            index,
                            e.target.value
                          )}
                          rows={2}
                          disabled={isReadOnly}
                          className="w-full border border-amber-200/60 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white animate-fade-in disabled:bg-slate-100 disabled:text-slate-400"
                          placeholder="Describe what needs improvement..."
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SUGGESTED ACTION POINTS */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h4 className="font-sans font-semibold text-slate-800 text-sm uppercase tracking-wider">
                      Suggested Action Points
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Suggested points to discuss with supervisor</p>
                  </div>
                  <div className="space-y-3">
                    {[0, 1, 2].map(index => (
                      <div key={index}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Point {index + 1}</label>
                        <textarea
                          id={`textarea-actions-${currentSectionKey}-${index}`}
                          value={formData[currentSectionKey as "heart" | "personalLife" | "relationalLife" | "ministryEffectiveness"].suggestedActionPoints[index] || ""}
                          onChange={(e) => handleSectionChange(
                            currentSectionKey as any,
                            "suggestedActionPoints",
                            index,
                            e.target.value
                          )}
                          rows={2}
                          disabled={isReadOnly}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 bg-white animate-fade-in disabled:bg-slate-100 disabled:text-slate-400"
                          placeholder="Agreed actionable outcome..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Next Quadrant Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <button
                  type="button"
                  id={`prev-btn-${activeTab}`}
                  onClick={() => {
                    if (activeTab === "heart") setActiveTab("header");
                    else if (activeTab === "personal") setActiveTab("heart");
                    else if (activeTab === "relational") setActiveTab("personal");
                    else if (activeTab === "ministry") setActiveTab("relational");
                  }}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Previous Section
                </button>

                <button
                  type="button"
                  id={`next-btn-${activeTab}`}
                  onClick={() => {
                    if (activeTab === "heart") setActiveTab("personal");
                    else if (activeTab === "personal") setActiveTab("relational");
                    else if (activeTab === "relational") setActiveTab("ministry");
                    else if (activeTab === "ministry") {
                      handleSave("Draft");
                    }
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {activeTab === "ministry" ? "Save Progress Draft" : "Next Section"}
                </button>
              </div>
            </div>

            {/* Comment Sidebar */}
            <div className="xl:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm sticky top-4">
              <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="font-sans font-bold text-slate-900 text-sm">
                    Leader Section Comments
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Specific, inline feedback on individual sections
                  </p>
                </div>
              </div>               {isLeaderView ? (
                <div className="space-y-4">
                  <p className="text-slate-600 text-xs leading-relaxed">
                    As a Team Leader, leave specific inline comments and coaching points on the staff member's self-reflection in this specific section.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Feedback for {currentSectionData.title}
                    </label>
                    <textarea
                      id={`leader-comment-${currentSectionKey}`}
                      value={formData.leaderSectionComments?.[currentSectionKey] || ""}
                      onChange={(e) => handleCommentChange(currentSectionKey, e.target.value)}
                      rows={6}
                      className="w-full border border-slate-250 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder-slate-400 font-medium"
                      placeholder={`Provide constructive suggestions or feedback for ${currentSectionData.title} quadrant...`}
                    />
                  </div>

                  {/* Form Submission Control / Leader Actions */}
                  <div className="border-t border-slate-200 pt-4 mt-2 space-y-3">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Form Status Action</label>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Choose if this review should remain locked or be unlocked for user edits based on your feedback:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        formData.status === "Submitted"
                          ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                        <input
                          type="radio"
                          name="leader-action"
                          checked={formData.status === "Submitted"}
                          onChange={() => setFormData(prev => ({ ...prev, status: "Submitted" }))}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-800 block">🔒 Finalize & Keep Locked</span>
                          <span className="text-[9px] text-slate-500 mt-0.5 block leading-normal">Keep form status as Submitted. The member can view your comments but cannot edit their self-reflection.</span>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        formData.status === "Draft"
                          ? "bg-amber-50 border-amber-200 text-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                        <input
                          type="radio"
                          name="leader-action"
                          checked={formData.status === "Draft"}
                          onChange={() => setFormData(prev => ({ ...prev, status: "Draft" }))}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-amber-700 block">🔓 Request Revision</span>
                          <span className="text-[9px] text-slate-500 mt-0.5 block leading-normal">Sets form status back to Draft (submitted check set to false). Unlocks the form so the team member can edit and re-submit it.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-lg p-2.5 border border-slate-200/60 leading-normal">
                    💡 Inline comments and status actions are saved to the cloud when you click "Save Feedback & Actions" in the top bar.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-600 text-xs leading-relaxed">
                    View specific feedback or guidance left by your team leader specifically for this section.
                  </p>
                  {formData.leaderSectionComments?.[currentSectionKey] ? (
                    <div className="bg-indigo-50/40 border border-indigo-100/85 rounded-xl p-4 space-y-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">Feedback from Team Leader</span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                        {formData.leaderSectionComments[currentSectionKey]}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 bg-white border border-dashed border-slate-200 rounded-xl">
                      <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                      <p className="text-[11px] font-bold text-slate-500">No Comments yet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Your team leader has not written any inline feedback for this quadrant yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 md:p-8 animate-scale-up space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-lg">
                  {isLeaderView ? "Finalize Development Review?" : "Submit Development Review?"}
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Please review the status of each section below before completing your submission.
                </p>
              </div>
            </div>

            {/* Sections Summary */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Quadrant Completion Status
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { id: "heart", label: "1. Heart Walk", required: settings.heartRequired },
                  { id: "personal", label: "2. Personal Life", required: settings.personalLifeRequired },
                  { id: "relational", label: "3. Relational Life", required: settings.relationalLifeRequired },
                  { id: "ministry", label: "4. Ministry Effectiveness", required: settings.ministryEffectivenessRequired },
                ].map((sec) => {
                  const complete = isSectionComplete(sec.id);
                  return (
                    <div key={sec.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-150">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{sec.label}</span>
                        {sec.required && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100" title="Required quadrant">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {complete ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            Incomplete
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-xs text-rose-900 leading-relaxed">
              <span className="font-extrabold text-rose-950 uppercase block mb-1">⚠️ Important Warning</span>
              {isLeaderView ? (
                <span>
                  Finalizing this review is <strong>final</strong> and locks the form entries. It will automatically compile/update the dynamic coordinator follow-up grid and make this feedback available to the staff member.
                </span>
              ) : (
                <span>
                  This submission is <strong>final</strong> and cannot be edited. Once submitted, your Team Leader/Supervisor will be notified to review your assessment and proceed to the dialogue stage.
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="cancel-submit-modal-btn"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-colors"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                id="confirm-submit-review-btn"
                onClick={handleConfirmSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-md shadow-emerald-900/10 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
