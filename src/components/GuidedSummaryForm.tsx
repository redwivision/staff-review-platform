import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { QuarterlySummary, PDPQuarterItem, CMOQuarterItem, KDAQuarterItem } from "../types";
import {
  QUARTER_INFO, DEVELOPMENT_REVIEW_SECTIONS
} from "../constants";
import {
  Check, ChevronLeft, ChevronRight, ClipboardCheck, AlertCircle, Send
} from "lucide-react";
import { useLanguage } from "../i18n";

interface GuidedSummaryFormProps {
  summary: QuarterlySummary;
  onSave: (updatedSummary: QuarterlySummary) => Promise<void>;
  onClose: () => void;
  isLeaderView: boolean;
  staffName: string;
  isOwner?: boolean;
  isCoachOrAdmin?: boolean;
  isAdmin?: boolean;
  onSwitchStandard?: () => void;
}

type CMOField = keyof CMOQuarterItem;
type KDAField = keyof KDAQuarterItem;

type PDPField = "goal" | "desiredResult" | "progressMade" | "changesNeeded" | "nextStep";

type EvalField = keyof QuarterlySummary["evaluation"];

interface Step {
  id: string;
  heading: string;
  helper?: string;
}

const CATEGORIES: { key: "heart" | "personalLife" | "relationalLife"; label: string }[] = [
  { key: "heart", label: "Heart" },
  { key: "personalLife", label: "Personal Life" },
  { key: "relationalLife", label: "Relational Life" }
];

function getPDPHelper(quarter: string): string {
  if (quarter === "2nd") return "Measure progress made and changes needed.";
  if (quarter === "3rd") return "Assign S/O/NI ratings and record the next steps.";
  return "Define priorities and desired SMART goals.";
}

function getRating(item: { o?: boolean; s?: boolean; ni?: boolean }): "o" | "s" | "ni" | null {
  if (item.o) return "o";
  if (item.s) return "s";
  if (item.ni) return "ni";
  return null;
}

export default function GuidedSummaryForm({
  summary,
  onSave,
  onClose,
  isLeaderView,
  staffName,
  isOwner = false,
  isCoachOrAdmin = false,
  isAdmin = false,
  onSwitchStandard
}: GuidedSummaryFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<QuarterlySummary>(() => {
    const s = summary;
    const emptyPDP: PDPQuarterItem = { goal: "", desiredResult: "" };
    return {
      ...s,
      pdp: {
        heart: { ...emptyPDP, ...(s.pdp?.heart || {}) },
        personalLife: { ...emptyPDP, ...(s.pdp?.personalLife || {}) },
        relationalLife: { ...emptyPDP, ...(s.pdp?.relationalLife || {}) }
      },
      cmo: s.cmo && s.cmo.length ? s.cmo : [{ objective: "", desiredResult: "" }],
      kda: s.kda && s.kda.length ? s.kda : [{ assignment: "" }],
      suggestions: s.suggestions && s.suggestions.length ? s.suggestions : ["", ""],
      evaluation: {
        overallEffectiveness: s.evaluation?.overallEffectiveness || "",
        strengths: s.evaluation?.strengths?.length ? s.evaluation.strengths : ["", "", ""],
        weaknesses: s.evaluation?.weaknesses?.length ? s.evaluation.weaknesses : ["", "", ""],
        lackConfidence: s.evaluation?.lackConfidence || "",
        readyForGreaterResp: s.evaluation?.readyForGreaterResp || "",
        greaterRespDetails: {
          position: s.evaluation?.greaterRespDetails?.position || "",
          when: s.evaluation?.greaterRespDetails?.when || ""
        },
        recommendReassignment: s.evaluation?.recommendReassignment || "",
        reassignmentDetails: {
          positionLocation: s.evaluation?.reassignmentDetails?.positionLocation || "",
          why: s.evaluation?.reassignmentDetails?.why || ""
        },
        teamLeaderSignature: s.evaluation?.teamLeaderSignature || "",
        teamLeaderSignatureDate: s.evaluation?.teamLeaderSignatureDate || "",
        formReviewedByNameSigDate: s.evaluation?.formReviewedByNameSigDate || ""
      }
    };
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const quarter = formData.quarter;

  const canEdit = isAdmin || isOwner || isCoachOrAdmin;
  const locked = !canEdit;
  const evalLocked = !(isAdmin || isCoachOrAdmin);

  // Build ordered steps
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [
      { id: "header0", heading: t("Your name"), helper: t("The name of the staff member being reviewed.") },
      { id: "header1", heading: t("Your Team Leader"), helper: t("The person who supervises you.") },
      { id: "header2", heading: t("Your role"), helper: t("Your current position or job title.") },
      { id: "header3", heading: t("When did you join staff?"), helper: t("Month and year, e.g. September 2018.") },
      { id: "header4", heading: t("In your current position since"), helper: t("When did you start your current role? Month and year.") },
      { id: "header5", heading: t("Reviewer Name & Position"), helper: t("Only needed if reviewer is not the Team Leader") },
      { id: "header6", heading: t("Supervised By Current Team Leader Since"), helper: t("Month/Year when the current Team Leader started supervising") },
      { id: "header7", heading: t("Date Completed"), helper: t("Date this summary was filled out") }
    ];

    CATEGORIES.forEach(cat => {
      list.push({
        id: `pdp-${cat.key}`,
        heading: `${t("PDP")} · ${t(cat.label)}`,
        helper: t(getPDPHelper(quarter))
      });
    });

    for (let i = 0; i < 3; i++) {
      list.push({ id: `cmo-g${i}`, heading: `${t("Goal")} ${i + 1} ${t("of 3")} · ${t("What is the goal?")}` });
      list.push({ id: `cmo-r${i}`, heading: `${t("Goal")} ${i + 1} ${t("of 3")} · ${t("What does success look like?")}`, helper: t("Describe the result you expect when you complete it.") });
      if (quarter === "2nd") {
        list.push({ id: `cmo-p${i}`, heading: `${t("Goal")} ${i + 1} ${t("of 3")} · ${t("Progress Made")}`, helper: t("Describe the progress you made on this goal.") });
        list.push({ id: `cmo-c${i}`, heading: `${t("Goal")} ${i + 1} ${t("of 3")} · ${t("Changes Needed")}`, helper: t("Write here") });
      }
      if (quarter === "3rd") {
        list.push({ id: `cmo-e${i}`, heading: `${t("Goal")} ${i + 1} ${t("of 3")} · ${t("How is this area going?")}` });
        list.push({ id: `cmo-n${i}`, heading: `${t("Goal")} ${i + 1} ${t("of 3")} · ${t("What will you do next?")}` });
      }
    }

    for (let i = 0; i < 2; i++) {
      list.push({ id: `kda-a${i}`, heading: `${t("Task")} ${i + 1} ${t("of 2")} · ${t("Assignment details")}`, helper: t("A task assigned for your leadership development.") });
      if (quarter === "2nd") {
        list.push({ id: `kda-p${i}`, heading: `${t("Task")} ${i + 1} ${t("of 2")} · ${t("Progress Made")}`, helper: t("Describe the progress you made on this goal.") });
        list.push({ id: `kda-c${i}`, heading: `${t("Task")} ${i + 1} ${t("of 2")} · ${t("Changes Needed")}`, helper: t("Write here") });
      }
      if (quarter === "3rd") {
        list.push({ id: `kda-n${i}`, heading: `${t("Task")} ${i + 1} ${t("of 2")} · ${t("What will you do next?")}` });
      }
    }

    list.push({ id: "sugg0", heading: t("A suggestion for your team"), helper: t("How could your team or department improve?") });
    list.push({ id: "sugg1", heading: t("Another suggestion (optional)"), helper: t("You can leave this blank if you have nothing else to add.") });

    if (quarter === "3rd") {
      list.push({ id: "comments", heading: t("Final comments (optional)"), helper: t("Any closing thoughts for this year.") });
    }

    // Team Leader (TL) Evaluation
    list.push({ id: "eval-q1", heading: t("1. Check the box which best reflects your assessment of the staff member's overall effectiveness:"), helper: t("Your coach fills this section after reviewing your summary.") });
    list.push({ id: "eval-q2s", heading: t("Top 3 Strengths"), helper: t("Write here") });
    list.push({ id: "eval-q2w", heading: t("Top 3 Weaknesses"), helper: t("Write here") });
    list.push({ id: "eval-q3", heading: t("3. In what area(s) do you lack confidence in this staff member in their current role? (Please, explain):"), helper: t("Explain any areas of reservation or limited confidence...") });
    list.push({ id: "eval-q4", heading: t("4. Is this person ready to move into a position of greater responsibility?") });
    list.push({ id: "eval-q5", heading: t("5. Do you recommend a re-assignment?") });
    list.push({ id: "eval-sig", heading: t("Signatures"), helper: t("Name / Signature / Date") });

    return list;
  }, [quarter, t]);

  const totalSteps = steps.length;
  const isLast = stepIndex === totalSteps - 1;
  const current = steps[stepIndex];

  const autosave = useCallback(async () => {
    if (!canEdit) return;
    if (submittingRef.current) return;
    try {
      await onSave({ ...formData, updatedAt: Date.now() });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (e) {
      console.error("Guided save failed:", e);
    }
  }, [formData, onSave, canEdit]);

  const submittingRef = useRef(false);

  const patch = useCallback((next: QuarterlySummary) => {
    setFormData(next);
  }, []);

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

  const updateHeader = (field: keyof QuarterlySummary, value: string) => {
    patch({ ...formData, [field]: value });
  };

  const updatePDP = (category: "heart" | "personalLife" | "relationalLife", field: PDPField, value: string) => {
    const pdp = { ...formData.pdp };
    pdp[category] = { ...pdp[category], [field]: value };
    patch({ ...formData, pdp });
  };

  const setPDPRating = (category: "heart" | "personalLife" | "relationalLife", rating: "o" | "s" | "ni") => {
    const pdp = { ...formData.pdp };
    pdp[category] = {
      ...pdp[category],
      o: rating === "o",
      s: rating === "s",
      ni: rating === "ni"
    };
    patch({ ...formData, pdp });
  };

  const updateCMO = (index: number, field: CMOField, value: string) => {
    const cmo = [...formData.cmo];
    if (!cmo[index]) cmo[index] = { objective: "", desiredResult: "" } as CMOQuarterItem;
    cmo[index] = { ...cmo[index], [field]: value };
    patch({ ...formData, cmo });
  };

  const setCMORating = (index: number, rating: "o" | "s" | "ni") => {
    const cmo = [...formData.cmo];
    if (!cmo[index]) cmo[index] = { objective: "", desiredResult: "" } as CMOQuarterItem;
    cmo[index] = { ...cmo[index], o: rating === "o", s: rating === "s", ni: rating === "ni" };
    patch({ ...formData, cmo });
  };

  const updateKDA = (index: number, field: KDAField, value: string) => {
    const kda = [...formData.kda];
    if (!kda[index]) kda[index] = { assignment: "" } as KDAQuarterItem;
    kda[index] = { ...kda[index], [field]: value };
    patch({ ...formData, kda });
  };

  const updateSugg = (index: number, value: string) => {
    const suggestions = [...formData.suggestions];
    suggestions[index] = value;
    patch({ ...formData, suggestions });
  };

  const updateEvalField = (field: EvalField, value: string) => {
    patch({ ...formData, evaluation: { ...formData.evaluation, [field]: value } });
  };

  const updateEvalList = (field: "strengths" | "weaknesses", index: number, value: string) => {
    const list = [...(formData.evaluation[field] || [])];
    list[index] = value;
    patch({ ...formData, evaluation: { ...formData.evaluation, [field]: list } });
  };

  const updateEvalNested = (parentField: "greaterRespDetails" | "reassignmentDetails", field: string, value: string) => {
    patch({
      ...formData,
      evaluation: {
        ...formData.evaluation,
        [parentField]: {
          ...formData.evaluation[parentField],
          [field]: value
        }
      }
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

  const handleClose = async () => {
    if (canEdit) {
      try { await onSave({ ...formData, updatedAt: Date.now() }); } catch (e) { console.error("Final save failed:", e); }
    }
    onClose();
  };

  const canSubmitToCoach = isOwner && canEdit && (!formData.status || formData.status === "Draft");

  const handleSubmitToCoach = async () => {
    if (!canSubmitToCoach) return;
    if (!formData.presentPositionSince || !formData.teamLeaderName) {
      setSubmitError(t("Please fill in your Team Leader's name and the 'In present position since' date before submitting. You can go back and add these in the 'About you' steps."));
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave({ ...formData, status: "Submitted", updatedAt: Date.now() });
      onClose();
    } catch (e: any) {
      setSubmitError(e?.message || t("Failed to submit. Please try again."));
      submittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  // Progress: section grouping for the top bar
  const sectionOf = (step: Step): string => {
    if (step.id.startsWith("header")) return t("About you");
    if (step.id.startsWith("pdp")) return t("Personal Development Plan (PDP)");
    if (step.id.startsWith("cmo")) return t("Key Goals (CMO)");
    if (step.id.startsWith("kda")) return t("Main Tasks (KDA)");
    if (step.id.startsWith("sugg")) return t("Suggestions");
    if (step.id.startsWith("eval")) return t("Team Leader (TL) Evaluation");
    return t("Final comments");
  };

  const currentSection = sectionOf(current);
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const BigTextarea = ({ value, onChange, rows = 3, placeholder, disabled }: {
    value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; disabled?: boolean
  }) => (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled !== undefined ? disabled : locked}
      rows={rows}
      placeholder={placeholder}
      className="w-full border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl px-5 py-4 text-lg text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 resize-y"
    />
  );

  const BigText = ({ value, onChange, placeholder, type = "text", disabled }: {
    value: string; onChange: (v: string) => void; placeholder?: string; type?: "text" | "date"; disabled?: boolean
  }) => (
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled !== undefined ? disabled : locked}
      placeholder={placeholder}
      className="w-full border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl px-5 py-4 text-lg text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500"
    />
  );

  const ChoiceButtons = ({ id, onPick, active, disabled }: {
    id: string; onPick: () => void; active?: boolean; disabled?: boolean
  }) => (
    <button
      type="button"
      id={id}
      onClick={onPick}
      disabled={disabled !== undefined ? disabled : locked}
      className={`w-full py-5 px-6 text-lg font-medium rounded-2xl border-2 transition-all flex items-center gap-3 ${
        active ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/40"
      } disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
    >
      <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 text-transparent"}`}>
        <Check className="w-4 h-4" strokeWidth={3} />
      </span>
      {t(id)}
    </button>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p className="text-sm text-slate-500 mb-2">{label}</p>
      {children}
    </div>
  );

  const catFor = (step: Step) => {
    if (!step.id.startsWith("pdp-")) return null;
    return CATEGORIES.find(c => c.key === step.id.replace("pdp-", "")) || null;
  };

  const cmoIdx = (step: Step) => step.id.startsWith("cmo-g") || step.id.startsWith("cmo-r") || step.id.startsWith("cmo-p") || step.id.startsWith("cmo-c") || step.id.startsWith("cmo-e") || step.id.startsWith("cmo-n") ? Number(step.id.match(/(\d+)$/)?.[1]) : null;

  const kdaIdx = (step: Step) => step.id.startsWith("kda-a") || step.id.startsWith("kda-p") || step.id.startsWith("kda-c") || step.id.startsWith("kda-n") ? Number(step.id.match(/(\d+)$/)?.[1]) : null;

  const suggIdx = (step: Step) => step.id.startsWith("sugg") ? Number(step.id.slice(-1)) : null;

  const renderStep = () => {
    const step = current;
    // HEADER
    if (step.id === "header0") return <BigText value={formData.staffName} onChange={(v) => updateHeader("staffName", v)} placeholder={t("Full name")} />;
    if (step.id === "header1") return <BigText value={formData.teamLeaderName} onChange={(v) => updateHeader("teamLeaderName", v)} placeholder={t("Team leader's name")} />;
    if (step.id === "header2") return <BigText value={formData.position} onChange={(v) => updateHeader("position", v)} placeholder={t("e.g. Ministry Coordinator")} />;
    if (step.id === "header3") return <BigText value={formData.dateJoinedStaff} onChange={(v) => updateHeader("dateJoinedStaff", v)} placeholder={t("e.g. September 2018")} />;
    if (step.id === "header4") return <BigText value={formData.presentPositionSince} onChange={(v) => updateHeader("presentPositionSince", v)} placeholder="e.g. January 2023" />;
    if (step.id === "header5") return <BigText value={formData.reviewerNamePosition} onChange={(v) => updateHeader("reviewerNamePosition", v)} placeholder={t("e.g. John Doe (Regional Coordinator)")} />;
    if (step.id === "header6") return <BigText value={formData.supervisedBySince} onChange={(v) => updateHeader("supervisedBySince", v)} placeholder="e.g. March 2024" />;
    if (step.id === "header7") return <BigText type="date" value={formData.date} onChange={(v) => updateHeader("date", v)} placeholder={t("e.g. September 2018")} />;

    // PDP
    const cat = catFor(step);
    if (step && cat) {
      const pdp: PDPQuarterItem = formData.pdp[cat.key];
      const rating = getRating(pdp);
      return (
        <div className="space-y-5">
          <Field label={t("PDP Goal / Priority for growth")}>
            <BigTextarea value={pdp.goal || ""} onChange={(v) => updatePDP(cat.key, "goal", v)} placeholder={t("Write here")} rows={2} />
          </Field>
          <Field label={t("Desired SMART Result")}>
            <BigTextarea value={pdp.desiredResult || ""} onChange={(v) => updatePDP(cat.key, "desiredResult", v)} placeholder={t("Describe the expected result")} rows={2} />
          </Field>
          {quarter === "2nd" && (
            <>
              <Field label={t("Progress Made")}>
                <BigTextarea value={pdp.progressMade || ""} onChange={(v) => updatePDP(cat.key, "progressMade", v)} placeholder={t("Write here")} rows={2} />
              </Field>
              <Field label={t("Changes Needed")}>
                <BigTextarea value={pdp.changesNeeded || ""} onChange={(v) => updatePDP(cat.key, "changesNeeded", v)} placeholder={t("Write here")} rows={2} />
              </Field>
            </>
          )}
          {quarter === "3rd" && (
            <>
              <Field label={t("How is this area going?")}>
                <div className="space-y-3">
                  <ChoiceButtons id="Satisfactory" active={rating === "s"} onPick={() => setPDPRating(cat.key, "s")} />
                  <ChoiceButtons id="Outstanding" active={rating === "o"} onPick={() => setPDPRating(cat.key, "o")} />
                  <ChoiceButtons id="Needs improvement" active={rating === "ni"} onPick={() => setPDPRating(cat.key, "ni")} />
                </div>
              </Field>
              <Field label={t("What will you do next?")}>
                <BigTextarea value={pdp.nextStep || ""} onChange={(v) => updatePDP(cat.key, "nextStep", v)} placeholder={t("Write your next step")} rows={2} />
              </Field>
            </>
          )}
        </div>
      );
    }

    // CMO
    if (step && step.id.startsWith("cmo-g")) {
      const i = cmoIdx(step)!;
      return (
        <div className="space-y-1">
          <div className="mb-3 bg-slate-50 rounded-2xl p-4 text-sm text-slate-600">{t(DEVELOPMENT_REVIEW_SECTIONS.ministryEffectiveness.bullets[0])}</div>
          <BigTextarea value={formData.cmo[i]?.objective || ""} onChange={(v) => updateCMO(i, "objective", v)} placeholder={t("Write your goal")} />
        </div>
      );
    }
    if (step && step.id.startsWith("cmo-r")) {
      const i = cmoIdx(step)!;
      return <BigTextarea value={formData.cmo[i]?.desiredResult || ""} onChange={(v) => updateCMO(i, "desiredResult", v)} placeholder={t("Describe the expected result")} />;
    }
    if (step && step.id.startsWith("cmo-p")) {
      const i = cmoIdx(step)!;
      return <BigTextarea value={formData.cmo[i]?.progressMade || ""} onChange={(v) => updateCMO(i, "progressMade", v)} placeholder={t("Write here")} />;
    }
    if (step && step.id.startsWith("cmo-c")) {
      const i = cmoIdx(step)!;
      return <BigTextarea value={formData.cmo[i]?.changesNeeded || ""} onChange={(v) => updateCMO(i, "changesNeeded", v)} placeholder={t("Write here")} />;
    }
    if (step && step.id.startsWith("cmo-e")) {
      const i = cmoIdx(step)!;
      const rating = getRating(formData.cmo[i] || {});
      return (
        <div className="space-y-3">
          <ChoiceButtons id="Satisfactory" active={rating === "s"} onPick={() => setCMORating(i, "s")} />
          <ChoiceButtons id="Outstanding" active={rating === "o"} onPick={() => setCMORating(i, "o")} />
          <ChoiceButtons id="Needs improvement" active={rating === "ni"} onPick={() => setCMORating(i, "ni")} />
        </div>
      );
    }
    if (step && step.id.startsWith("cmo-n")) {
      const i = cmoIdx(step)!;
      return <BigTextarea value={formData.cmo[i]?.nextStep || ""} onChange={(v) => updateCMO(i, "nextStep", v)} placeholder={t("Write your next step")} />;
    }

    // KDA
    if (step && step.id.startsWith("kda-a")) {
      const i = kdaIdx(step)!;
      return <BigText value={formData.kda[i]?.assignment || ""} onChange={(v) => updateKDA(i, "assignment", v)} placeholder={t("e.g. Lead a monthly discipleship group")} />;
    }
    if (step && step.id.startsWith("kda-p")) {
      const i = kdaIdx(step)!;
      return <BigTextarea value={formData.kda[i]?.progressMade || ""} onChange={(v) => updateKDA(i, "progressMade", v)} placeholder={t("Write here")} />;
    }
    if (step && step.id.startsWith("kda-c")) {
      const i = kdaIdx(step)!;
      return <BigTextarea value={formData.kda[i]?.changesNeeded || ""} onChange={(v) => updateKDA(i, "changesNeeded", v)} placeholder={t("Write here")} />;
    }
    if (step && step.id.startsWith("kda-n")) {
      const i = kdaIdx(step)!;
      return <BigTextarea value={formData.kda[i]?.nextStep || ""} onChange={(v) => updateKDA(i, "nextStep", v)} placeholder={t("Write your next step")} />;
    }

    // Suggestions
    if (step && step.id.startsWith("sugg")) {
      const i = suggIdx(step)!;
      return <BigTextarea value={formData.suggestions[i] || ""} onChange={(v) => updateSugg(i, v)} placeholder={i === 1 ? t("Optional — type here or leave blank") : t("Type your suggestion")} rows={2} />;
    }

    // Comments
    if (step && step.id === "comments") {
      return <BigTextarea value={formData.additionalComments || ""} onChange={(v) => updateHeader("additionalComments", v)} placeholder={t("Optional — type here or leave blank")} />;
    }

    // TL Evaluation
    if (step && step.id === "eval-q1") {
      return (
        <div className="space-y-3">
          <ChoiceButtons id="One of the best in his/her position" active={formData.evaluation.overallEffectiveness === "One of the best"} onPick={() => updateEvalField("overallEffectiveness", "One of the best")} disabled={evalLocked} />
          <ChoiceButtons id="Satisfactory" active={formData.evaluation.overallEffectiveness === "Satisfactory"} onPick={() => updateEvalField("overallEffectiveness", "Satisfactory")} disabled={evalLocked} />
          <ChoiceButtons id="Ineffective" active={formData.evaluation.overallEffectiveness === "Ineffective"} onPick={() => updateEvalField("overallEffectiveness", "Ineffective")} disabled={evalLocked} />
        </div>
      );
    }
    if (step && step.id === "eval-q2s") {
      return (
        <div className="space-y-4">
          {[0, 1, 2].map(index => (
            <BigText key={index} value={formData.evaluation.strengths[index] || ""} onChange={(v) => updateEvalList("strengths", index, v)} disabled={evalLocked} />
          ))}
        </div>
      );
    }
    if (step && step.id === "eval-q2w") {
      return (
        <div className="space-y-4">
          {[0, 1, 2].map(index => (
            <BigText key={index} value={formData.evaluation.weaknesses[index] || ""} onChange={(v) => updateEvalList("weaknesses", index, v)} disabled={evalLocked} />
          ))}
        </div>
      );
    }
    if (step && step.id === "eval-q3") {
      return <BigTextarea value={formData.evaluation.lackConfidence || ""} onChange={(v) => updateEvalField("lackConfidence", v)} placeholder={t("Explain any areas of reservation or limited confidence...")} disabled={evalLocked} />;
    }
    if (step && step.id === "eval-q4") {
      return (
        <div className="space-y-5">
          <div className="space-y-3">
            <ChoiceButtons id="Yes" active={formData.evaluation.readyForGreaterResp === "Yes"} onPick={() => updateEvalField("readyForGreaterResp", "Yes")} disabled={evalLocked} />
            <ChoiceButtons id="No" active={formData.evaluation.readyForGreaterResp === "No"} onPick={() => updateEvalField("readyForGreaterResp", "No")} disabled={evalLocked} />
          </div>
          {formData.evaluation.readyForGreaterResp === "Yes" && (
            <div className="space-y-5 animate-fade-in">
              <Field label={t("If yes, what position?")}>
                <BigText value={formData.evaluation.greaterRespDetails.position || ""} onChange={(v) => updateEvalNested("greaterRespDetails", "position", v)} disabled={evalLocked} />
              </Field>
              <Field label={t("When?")}>
                <BigText value={formData.evaluation.greaterRespDetails.when || ""} onChange={(v) => updateEvalNested("greaterRespDetails", "when", v)} disabled={evalLocked} />
              </Field>
            </div>
          )}
        </div>
      );
    }
    if (step && step.id === "eval-q5") {
      return (
        <div className="space-y-5">
          <div className="space-y-3">
            <ChoiceButtons id="Yes" active={formData.evaluation.recommendReassignment === "Yes"} onPick={() => updateEvalField("recommendReassignment", "Yes")} disabled={evalLocked} />
            <ChoiceButtons id="No" active={formData.evaluation.recommendReassignment === "No"} onPick={() => updateEvalField("recommendReassignment", "No")} disabled={evalLocked} />
          </div>
          {formData.evaluation.recommendReassignment === "Yes" && (
            <div className="space-y-5 animate-fade-in">
              <Field label={t("If yes, what position/location?")}>
                <BigText value={formData.evaluation.reassignmentDetails.positionLocation || ""} onChange={(v) => updateEvalNested("reassignmentDetails", "positionLocation", v)} disabled={evalLocked} />
              </Field>
              <Field label={t("Why?")}>
                <BigText value={formData.evaluation.reassignmentDetails.why || ""} onChange={(v) => updateEvalNested("reassignmentDetails", "why", v)} disabled={evalLocked} />
              </Field>
            </div>
          )}
        </div>
      );
    }
    if (step && step.id === "eval-sig") {
      return (
        <div className="space-y-5">
          <Field label={t("Team Leader Signature / Date")}>
            <BigText value={formData.evaluation.teamLeaderSignature || ""} onChange={(v) => updateEvalField("teamLeaderSignature", v)} placeholder={t("e.g. Roza Wesenu Date 20/26")} disabled={evalLocked} />
          </Field>
          <Field label={t("Staff Member Signature / Date")}>
            <BigText value={formData.evaluation.teamLeaderSignatureDate || ""} onChange={(v) => updateEvalField("teamLeaderSignatureDate", v)} placeholder={t("e.g. Bayush Tilahun Date 20/26")} disabled={evalLocked} />
          </Field>
          <Field label={t("Form Reviewed By (Name/Sig/Date)")}>
            <BigText value={formData.evaluation.formReviewedByNameSigDate || ""} onChange={(v) => updateEvalField("formReviewedByNameSigDate", v)} placeholder={t("Name / Signature / Date")} disabled={evalLocked} />
          </Field>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-300 bg-indigo-950/70 px-3 py-1 rounded-full border border-indigo-500/30">
              {t("Easy mode · Step by step")}
            </span>
            <h2 className="text-xl font-sans font-bold mt-2">
              {QUARTER_INFO[quarter].name} {t("Summary")}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-xs text-indigo-200 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 px-3 py-2 rounded-lg transition-colors"
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
            {currentSection}
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
            {t("This summary is read-only. You can view each question but not change the answers.")}
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
              <div className="flex items-center gap-2">
                {canSubmitToCoach && (
                  <button
                    type="button"
                    onClick={handleSubmitToCoach}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                  >
                    <Send className="w-4 h-4" strokeWidth={3} /> {saving ? t("Submitting...") : t("Submit to Coach")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  <Check className="w-4 h-4" strokeWidth={3} /> {t("Finish")}
                </button>
              </div>
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

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{t("Your answers are saved as you move between questions.")}</span>
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