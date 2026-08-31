import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { DevelopmentReview, ReviewRequirementSettings } from "../types";
import { QUARTER_INFO, DEVELOPMENT_REVIEW_SECTIONS } from "../constants";
import {
  Save, Check, ChevronLeft, ChevronRight, ClipboardCheck, Heart, User, Users, Award, AlertCircle
} from "lucide-react";
import { useLanguage } from "../i18n";

interface GuidedReviewFormProps {
  review: DevelopmentReview;
  onSave: (updatedReview: DevelopmentReview) => Promise<void>;
  onClose: () => void;
  isLeaderView: boolean;
  staffName?: string;
  requiredSettings?: ReviewRequirementSettings;
  isAdmin?: boolean;
  isOwner?: boolean;
  onSwitchStandard?: () => void;
}

interface Step {
  id: string;
  heading: string;
  helper?: string;
}

type SectionKey = "heart" | "personalLife" | "relationalLife" | "ministryEffectiveness";
type SectionField = "strengths" | "needsImprovement" | "suggestedActionPoints";

const SECTION_KEYS: SectionKey[] = ["heart", "personalLife", "relationalLife", "ministryEffectiveness"];

const QUADRANTS: { key: SectionKey; label: string; icon: any }[] = [
  { key: "heart", label: "Walk with God", icon: Heart },
  { key: "personalLife", label: "Personal Life", icon: User },
  { key: "relationalLife", label: "Relational Life", icon: Users },
  { key: "ministryEffectiveness", label: "Ministry Impact", icon: Award }
];

const FIELD_LABELS: Record<string, string> = {
  strengths: "Strengths",
  needsImprovement: "Needs Improvement",
  suggestedActionPoints: "Suggested Action Points"
};

const FIELD_PROMPTS: Record<string, (label: string) => string> = {
  strengths: (label) => `In the ${label} area, what is one strength you have?`,
  needsImprovement: (label) => `In the ${label} area, what is one thing you want to improve?`,
  suggestedActionPoints: (label) => `In the ${label} area, what is one action you will take?`
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  strengths: "Write your strength here",
  needsImprovement: "Write what needs improvement here",
  suggestedActionPoints: "Write the action you will take here"
};

export default function GuidedReviewForm({
  review,
  onSave,
  onClose,
  isLeaderView,
  staffName,
  requiredSettings,
  isAdmin = false,
  isOwner = false,
  onSwitchStandard
}: GuidedReviewFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<DevelopmentReview>(() => ({
    ...review,
    heart: { strengths: [...(review.heart?.strengths || ["", "", ""])], needsImprovement: [...(review.heart?.needsImprovement || ["", "", ""])], suggestedActionPoints: [...(review.heart?.suggestedActionPoints || ["", "", ""])] },
    personalLife: { strengths: [...(review.personalLife?.strengths || ["", "", ""])], needsImprovement: [...(review.personalLife?.needsImprovement || ["", "", ""])], suggestedActionPoints: [...(review.personalLife?.suggestedActionPoints || ["", "", ""])] },
    relationalLife: { strengths: [...(review.relationalLife?.strengths || ["", "", ""])], needsImprovement: [...(review.relationalLife?.needsImprovement || ["", "", ""])], suggestedActionPoints: [...(review.relationalLife?.suggestedActionPoints || ["", "", ""])] },
    ministryEffectiveness: { strengths: [...(review.ministryEffectiveness?.strengths || ["", "", ""])], needsImprovement: [...(review.ministryEffectiveness?.needsImprovement || ["", "", ""])], suggestedActionPoints: [...(review.ministryEffectiveness?.suggestedActionPoints || ["", "", ""])] }
  }));
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const quarter = formData.quarter;

  const canEdit = isOwner || isLeaderView || isAdmin;
  const locked = !canEdit;

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [
      { id: "h0", heading: t("Your name"), helper: t("The name of the staff member being reviewed.") },
      { id: "h1", heading: t("Your ministry assignment"), helper: t("Where are you assigned? e.g. National Headquarters.") },
      { id: "h2", heading: t("Your supervisor / Team Leader"), helper: t("The person you report to.") },
      { id: "h3", heading: t("Months covered"), helper: t("Which months does this review cover? e.g. July - October 2025.") }
    ];

    QUADRANTS.forEach(q => {
      const sec = DEVELOPMENT_REVIEW_SECTIONS[q.key];
      for (let idx = 0; idx < 3; idx++) {
        list.push({ id: `${q.key}-s${idx}`, heading: `${t(q.label)} · ${t("Strength")} ${idx + 1}`, helper: sec ? sec.questions[0] : undefined });
        list.push({ id: `${q.key}-n${idx}`, heading: `${t(q.label)} · ${t("Needs Improvement")} ${idx + 1}`, helper: sec ? sec.questions[1] : undefined });
        list.push({ id: `${q.key}-a${idx}`, heading: `${t(q.label)} · ${t("Action Point")} ${idx + 1}`, helper: sec ? sec.questions[2] : undefined });
      }
    });

    return list;
  }, [quarter, t]);

  const totalSteps = steps.length;
  const isLast = stepIndex === totalSteps - 1;
  const current = steps[stepIndex];

  const stepCtx = (id: string) => {
    const parts = id.split("-");
    const key = parts[0];
    const type = parts[1];
    const idx = Number(parts[2]);
    if (!["heart", "personalLife", "relationalLife", "ministryEffectiveness"].includes(key)) return null;
    if (!["s", "n", "a"].includes(type)) return null;
    const field = type === "s" ? "strengths" : type === "n" ? "needsImprovement" : "suggestedActionPoints";
    return { key: key as SectionKey, field: field as SectionField, idx };
  };

  const autosave = useCallback(async () => {
    if (!canEdit) return;
    if (submittingRef.current) return;
    try {
      await onSave({ ...formData, status: formData.status, updatedAt: Date.now() });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (e) {
      console.error("Guided review save failed:", e);
    }
  }, [formData, onSave, canEdit]);

  const submittingRef = useRef(false);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!canEdit) return;
    const t = setTimeout(() => {
      autosave();
    }, 900);
    return () => clearTimeout(t);
  }, [formData, canEdit, autosave]);

  const updateHeader = (field: keyof DevelopmentReview, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateSection = (
    key: SectionKey,
    field: SectionField,
    idx: number,
    value: string
  ) => {
    setFormData(prev => {
      const sec = { ...prev[key] };
      const list = [...(sec[field] || ["", "", ""])];
      list[idx] = value;
      sec[field] = list;
      return { ...prev, [key]: sec };
    });
  };

  const isSectionComplete = (key: SectionKey) => {
    const sec = formData[key];
    return (
      sec.strengths.every(s => s && s.trim() !== "") &&
      sec.needsImprovement.every(n => n && n.trim() !== "") &&
      sec.suggestedActionPoints.every(a => a && a.trim() !== "")
    );
  };

  const settings = requiredSettings || {
    heartRequired: true,
    personalLifeRequired: true,
    relationalLifeRequired: true,
    ministryEffectivenessRequired: true
  };

  const missingSections = () => {
    return SECTION_KEYS.filter(k => {
      const required = k === "heart" ? settings.heartRequired : k === "personalLife" ? settings.personalLifeRequired : k === "relationalLife" ? settings.relationalLifeRequired : settings.ministryEffectivenessRequired;
      return required && !isSectionComplete(k);
    });
  };

  const handleNext = () => {
    if (isLast) return;
    autosave();
    setStepIndex(i => Math.min(i + 1, totalSteps - 1));
  };

  const handleBack = () => {
    autosave();
    setStepIndex(i => Math.max(i - 1, 0));
  };

  const handleSaveDraft = async () => {
    if (!canEdit) return;
    submittingRef.current = true;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave({ ...formData, status: "Draft", updatedAt: Date.now() });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (e: any) {
      console.error("Guided review draft save failed:", e);
      setSubmitError(e?.message || t("Failed to save your draft. Please try again."));
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (locked) {
      onClose();
      return;
    }
    submittingRef.current = true;
    try {
      if (isLeaderView || isAdmin) {
        await onSave({ ...formData, status: formData.status, updatedAt: Date.now() });
        onClose();
        return;
      }
      const missing = missingSections();
      if (missing.length > 0) {
        const labels = missing.map(k => {
          const q = QUADRANTS.find(x => x.key === k);
          return q ? q.label : k;
        });
        setSubmitError(`${t("Please fill all required answers for:")} ${labels.map(l => t(l)).join(", ")} ${t("before submitting.")}`);
        submittingRef.current = false;
        return;
      }
      setSaving(true);
      setSubmitError("");
      await onSave({ ...formData, status: "Submitted", updatedAt: Date.now() });
      onClose();
    } catch (e: any) {
      console.error("Guided review submit failed:", e);
      setSubmitError(e?.message || t("Failed to submit your review. Please try again."));
      submittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (canEdit) {
      try { await onSave({ ...formData, updatedAt: Date.now() }); } catch (e) { console.error("Final review save failed:", e); }
    }
    onClose();
  };

  const sectionOf = (step: Step): string => {
    if (step.id.startsWith("h")) return t("About you");
    const ctx = stepCtx(step.id);
    if (!ctx) return "";
    const q = QUADRANTS.find(x => x.key === ctx.key);
    return q ? t(q.label) : "";
  };

  const currentSection = sectionOf(current);
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const BigTextarea = ({ value, onChange, rows = 3, placeholder }: {
    value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
  }) => (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={locked}
      rows={rows}
      placeholder={placeholder}
      className="w-full border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl px-5 py-4 text-lg text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 resize-y"
    />
  );

  const BigText = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={locked}
      placeholder={placeholder}
      className="w-full border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl px-5 py-4 text-lg text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500"
    />
  );

  const renderStep = () => {
    const step = current;
    if (step.id === "h0") return <BigText value={formData.staffMemberName} onChange={(v) => updateHeader("staffMemberName", v)} placeholder={t("Full name")} />;
    if (step.id === "h1") return <BigText value={formData.ministryAssignment} onChange={(v) => updateHeader("ministryAssignment", v)} placeholder={t("e.g. National Headquarters")} />;
    if (step.id === "h2") return <BigText value={formData.supervisorName} onChange={(v) => updateHeader("supervisorName", v)} placeholder={t("Your supervisor's name")} />;
    if (step.id === "h3") return <BigText value={formData.monthsCovered} onChange={(v) => updateHeader("monthsCovered", v)} placeholder={t("e.g. July - October 2025")} />;

    const ctx = stepCtx(step.id);
    if (ctx) {
      const value = formData[ctx.key][ctx.field][ctx.idx] || "";
      return <BigTextarea value={value} onChange={(v) => updateSection(ctx.key, ctx.field, ctx.idx, v)} placeholder={t(FIELD_PLACEHOLDERS[ctx.field])} rows={3} />;
    }

    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300 bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-500/30">
              {t("Easy mode · Step by step")}
            </span>
            <h2 className="text-xl font-sans font-bold mt-2">
              {QUARTER_INFO[quarter].name} {t("Development Review")}
            </h2>
            <p className="text-xs text-slate-300 font-mono mt-1">
              {isLeaderView ? `${t("Review for")} ${staffName || formData.staffMemberName}` : `${t("Status:")} ${formData.status}`} {locked && t(" • Read-only")}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors"
          >
            {t("Save & Close")}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 pt-5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1.5">
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5 text-indigo-500" />
            {currentSection || t("About you")}
          </span>
          <span>{stepIndex + 1} {t("of")} {totalSteps}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 max-w-2xl mx-auto">
        {locked && (
          <div className="mb-4 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
            {t("This review was submitted and is read-only. You can view each question but not change the answers.")}
          </div>
        )}
        {submitError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}
        <div key={current.id} className="animate-fade-in">
          <h3 className="text-xl font-sans font-bold text-slate-900 mb-1">{current.heading}</h3>
          {current.helper && <p className="text-sm text-slate-500 mb-5">{current.helper}</p>}
          <div className={!current.helper ? "mt-4" : ""}>{renderStep()}</div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {t("Back")}
          </button>

          <div className="flex items-center gap-2">
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 animate-fade-in">
                <Check className="w-3.5 h-3.5" strokeWidth={3} /> {t("Saved")}
              </span>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                <Check className="w-4 h-4" strokeWidth={3} /> {saving ? t("Saving...") : isLeaderView || isAdmin ? t("Finish") : t("Submit to Leader")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                {t("Next")} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Draft save + switch */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {canEdit && !isLeaderView && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> {t("Save Draft")}
              </button>
            )}
            <span className="text-xs text-slate-400">{t("Your answers are saved as you move between questions.")}</span>
          </div>
          {onSwitchStandard && canEdit && (
            <button
              type="button"
              onClick={() => { autosave(); onSwitchStandard(); }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {t("Switch to full form")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
