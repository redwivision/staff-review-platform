import { DevelopmentReview, QuarterlySummary, ReviewSectionData, FollowUpTask } from "./types";

const createEmptySection = (): ReviewSectionData => ({
  strengths: ["", "", ""],
  needsImprovement: ["", "", ""],
  suggestedActionPoints: ["", "", ""]
});

export const createNewReview = (
  userId: string,
  quarter: "1st" | "2nd" | "3rd",
  year: string,
  staffName: string,
  role: string
): DevelopmentReview => {
  return {
    id: `${userId}_${quarter}_${year.replace("/", "-")}`,
    userId,
    quarter,
    year,
    status: "Draft",
    staffMemberName: staffName,
    ministryAssignment: "",
    supervisorName: "",
    monthsCovered: quarter === "1st" ? "July - October 2025" : quarter === "2nd" ? "November 2025 - February 2026" : "March - June 2026",
    heart: createEmptySection(),
    personalLife: createEmptySection(),
    relationalLife: createEmptySection(),
    ministryEffectiveness: createEmptySection(),
    updatedAt: Date.now(),
    lastUpdatedBy: "Team Member"
  };
};

export const createNewSummary = (
  userId: string,
  quarter: "1st" | "2nd" | "3rd",
  year: string,
  staffName: string,
  role: string
): QuarterlySummary => {
  return {
    id: `${userId}_${quarter}_${year.replace("/", "-")}_summary`,
    userId,
    status: "Draft",
    quarter,
    year,
    date: new Date().toISOString().split("T")[0],
    staffName,
    teamLeaderName: "",
    dateJoinedStaff: "",
    reviewerNamePosition: "",
    supervisedBySince: "",
    presentPositionSince: "",
    position: role,
    suggestions: ["", ""],
    pdp: {
      heart: { goal: "", desiredResult: "", progressMade: "", changesNeeded: "", nextStep: "", s: false, o: false, ni: false },
      personalLife: { goal: "", desiredResult: "", progressMade: "", changesNeeded: "", nextStep: "", s: false, o: false, ni: false },
      relationalLife: { goal: "", desiredResult: "", progressMade: "", changesNeeded: "", nextStep: "", s: false, o: false, ni: false }
    },
    cmo: [
      { objective: "", desiredResult: "", progressMade: "", changesNeeded: "", nextStep: "", s: false, o: false, ni: false },
      { objective: "", desiredResult: "", progressMade: "", changesNeeded: "", nextStep: "", s: false, o: false, ni: false },
      { objective: "", desiredResult: "", progressMade: "", changesNeeded: "", nextStep: "", s: false, o: false, ni: false }
    ],
    kda: [
      { assignment: "", progressMade: "", changesNeeded: "", nextStep: "" },
      { assignment: "", progressMade: "", changesNeeded: "", nextStep: "" }
    ],
    evaluation: {
      overallEffectiveness: "",
      strengths: ["", "", ""],
      weaknesses: ["", "", ""],
      lackConfidence: "",
      readyForGreaterResp: "",
      greaterRespDetails: { position: "", when: "" },
      recommendReassignment: "",
      reassignmentDetails: { positionLocation: "", why: "" },
      teamLeaderSignature: "",
      teamLeaderSignatureDate: "",
      formReviewedByNameSigDate: ""
    },
    additionalComments: "",
    updatedAt: Date.now()
  };
};

export const getPdfDefaultTasks = (): FollowUpTask[] => [
  {
    id: "pdf_task_1",
    focus: "1.Heart",
    coachLeader: "Bayush. T",
    coaches: ["Bayush", "Tef", "BT"],
    currentStage: "Post event",
    status: "Completed",
    dueDate: "September, 2026",
    coordinatorFollowup: "All five Staff members finished their Heart questions forms.",
    updatedAt: Date.now()
  },
  {
    id: "pdf_task_2",
    focus: "2. Personal Life",
    coachLeader: "BT",
    coaches: ["Tef", "BT"],
    currentStage: "Day of",
    status: "In progress",
    dueDate: "September, 2026",
    coordinatorFollowup: "Bayush has finished the review with … and … 2 staff member left to meet",
    updatedAt: Date.now()
  },
  {
    id: "pdf_task_3",
    focus: "3. Relational Life",
    coachLeader: "BT",
    coaches: ["Tef", "BT", "Bayush"],
    currentStage: "Pre event",
    status: "Not started",
    dueDate: "September, 2026",
    coordinatorFollowup: "Staff are still answering",
    updatedAt: Date.now()
  },
  {
    id: "pdf_task_4",
    focus: "4. Ministry Effectiveness",
    coachLeader: "BT",
    coaches: ["BT", "Tef"],
    currentStage: "Pre event",
    status: "Blocked",
    dueDate: "September, 2026",
    coordinatorFollowup: "Bayush is stuck trying to answer",
    updatedAt: Date.now()
  }
];

export const calculateReviewProgress = (review: DevelopmentReview | undefined) => {
  if (!review) {
    return {
      percentage: 0,
      heartFilled: 0,
      personalFilled: 0,
      relationalFilled: 0,
      ministryFilled: 0,
      totalFilled: 0,
      totalFields: 36
    };
  }

  const countFilled = (section: ReviewSectionData) => {
    let filled = 0;
    if (section && section.strengths) {
      section.strengths.forEach(s => { if (s && s.trim() !== "") filled++; });
    }
    if (section && section.needsImprovement) {
      section.needsImprovement.forEach(n => { if (n && n.trim() !== "") filled++; });
    }
    if (section && section.suggestedActionPoints) {
      section.suggestedActionPoints.forEach(a => { if (a && a.trim() !== "") filled++; });
    }
    return filled;
  };

  const heartFilled = countFilled(review.heart);
  const personalFilled = countFilled(review.personalLife);
  const relationalFilled = countFilled(review.relationalLife);
  const ministryFilled = countFilled(review.ministryEffectiveness);

  const totalFilled = heartFilled + personalFilled + relationalFilled + ministryFilled;
  const percentage = Math.round((totalFilled / 36) * 100);

  return {
    percentage,
    heartFilled,
    personalFilled,
    relationalFilled,
    ministryFilled,
    totalFilled,
    totalFields: 36
  };
};

export const getAutomatedFollowUpTasks = (
  userId: string,
  staffName: string,
  quarter: "1st" | "2nd" | "3rd",
  year: string,
  review: DevelopmentReview | undefined,
  overrides: FollowUpTask[]
): FollowUpTask[] => {
  const progress = calculateReviewProgress(review);

  const quadrants = [
    {
      focus: "1.Heart",
      defaultCoachLeader: "Bayush. T",
      defaultCoaches: ["Bayush", "Tef", "BT"],
      filledCount: progress.heartFilled,
      sectionKey: "heart" as const,
      sectionLabel: "Heart Walk"
    },
    {
      focus: "2. Personal Life",
      defaultCoachLeader: "BT",
      defaultCoaches: ["Tef", "BT"],
      filledCount: progress.personalFilled,
      sectionKey: "personalLife" as const,
      sectionLabel: "Personal Life"
    },
    {
      focus: "3. Relational Life",
      defaultCoachLeader: "BT",
      defaultCoaches: ["Tef", "BT", "Bayush"],
      filledCount: progress.relationalFilled,
      sectionKey: "relationalLife" as const,
      sectionLabel: "Relational Life"
    },
    {
      focus: "4. Ministry Effectiveness",
      defaultCoachLeader: "BT",
      defaultCoaches: ["BT", "Tef"],
      filledCount: progress.ministryFilled,
      sectionKey: "ministryEffectiveness" as const,
      sectionLabel: "Ministry Effectiveness"
    }
  ];

  return quadrants.map(q => {
    // Overrides are identified by matching userId, focus, quarter, year
    const override = overrides.find(t => 
      t.userId === userId && 
      t.focus === q.focus && 
      t.quarter === quarter && 
      t.year === year
    );

    if (override && override.isOverride) {
      return override;
    }

    let status: FollowUpTask["status"] = "Not started";
    let stage = "Pre event";
    let autoNotes = "";

    if (q.filledCount === 9) {
      status = "Completed";
      stage = review?.status === "Submitted" ? "Post event" : "Day of";
      autoNotes = `${staffName} has fully completed all 9 questions/fields in the ${q.sectionLabel} quadrant.`;
    } else if (q.filledCount > 0) {
      status = "In progress";
      stage = "Day of";
      autoNotes = `${staffName} is actively answering. Completed ${q.filledCount}/9 fields. (Draft)`;
    } else {
      status = "Not started";
      stage = "Pre event";
      autoNotes = `Staff member ${staffName} has not started answering the ${q.sectionLabel} quadrant yet.`;
    }

    if (review?.status === "Submitted" && stage === "Pre event") {
      stage = "Post event";
    }

    return {
      id: override?.id || `auto_${userId}_${q.focus.replace(/[^a-zA-Z0-9]/g, "")}_${quarter}_${year.replace("/", "-")}`,
      focus: q.focus,
      coachLeader: override?.coachLeader || q.defaultCoachLeader,
      coaches: override?.coaches || q.defaultCoaches,
      currentStage: override?.currentStage || stage,
      status: override?.status || status,
      dueDate: override?.dueDate || "September, 2026",
      coordinatorFollowup: override?.coordinatorFollowup || autoNotes,
      updatedAt: override?.updatedAt || Date.now(),
      userId,
      staffName,
      quarter,
      year,
      isOverride: false
    };
  });
};


