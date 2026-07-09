export interface UserProfile {
  uid: string;
  name: string;
  role: string;
  email: string;
  isLeader: boolean;
  isAdmin?: boolean;
  createdAt: number;
}

export interface ReviewSectionData {
  strengths: string[]; // 3 points
  needsImprovement: string[]; // 3 points
  suggestedActionPoints: string[]; // 3 points
}

export interface DevelopmentReview {
  id: string; // Document ID: e.g. "userId_quarter_year"
  userId: string;
  quarter: "1st" | "2nd" | "3rd";
  year: string; // e.g. "2025-2026"
  status: "Draft" | "Submitted";
  staffMemberName: string;
  ministryAssignment: string;
  supervisorName: string;
  monthsCovered: string;
  heart: ReviewSectionData;
  personalLife: ReviewSectionData;
  relationalLife: ReviewSectionData;
  ministryEffectiveness: ReviewSectionData;
  updatedAt: number;
  lastUpdatedBy: string; // Name/Email of the user who last updated this
  leaderSectionComments?: Record<string, string>; // Section-specific feedback by leaders
}

export interface PDPQuarterItem {
  goal: string;
  objective?: string;
  desiredResult: string;
  progressMade?: string; // For 2nd Quarter
  changesNeeded?: string; // For 2nd Quarter
  s?: boolean; // For 3rd Quarter (Satisfactory)
  o?: boolean; // For 3rd Quarter (Outstanding)
  ni?: boolean; // For 3rd Quarter (Needs Improvement)
  nextStep?: string; // For 3rd Quarter
}

export interface CMOQuarterItem {
  objective: string;
  desiredResult: string;
  progressMade?: string; // For 2nd Quarter
  changesNeeded?: string; // For 2nd Quarter
  s?: boolean; // For 3rd Quarter
  o?: boolean; // For 3rd Quarter
  ni?: boolean; // For 3rd Quarter
  nextStep?: string; // For 3rd Quarter
  percentageAchieved?: number;
}

export interface KDAQuarterItem {
  assignment: string;
  keyDeliverable?: string;
  comments?: string;
  percentageProgress?: number;
  progressMade?: string; // For 2nd Quarter
  changesNeeded?: string; // For 2nd Quarter
  nextStep?: string; // For 3rd Quarter
}

export interface QuarterlySummary {
  id: string; // Document ID: e.g. "userId_quarter_year_summary"
  userId: string;
  status?: "Draft" | "Submitted" | "CoachSubmitted" | "Declined";
  coachUid?: string;
  coachName?: string;
  quarter: "1st" | "2nd" | "3rd";
  year: string; // e.g. "2025-2026"
  date: string;
  staffName: string;
  teamLeaderName: string;
  dateJoinedStaff: string;
  reviewerNamePosition: string; // Reviewer's Name and Position (if other than Team Leader)
  supervisedBySince: string; // Supervised By Current Team Leader Since: (Month/Year)
  presentPositionSince: string; // In Present Position Since: (Month/Year)
  position: string;
  suggestions: string[]; // 2 items: What suggestions do you (staff member) have for the improvement of your team or department?
  
  declineReason?: string;
  declinedAt?: string;
  declinedBy?: string;
  
  // Action Plan sections
  pdp: {
    heart: PDPQuarterItem;
    personalLife: PDPQuarterItem;
    relationalLife: PDPQuarterItem;
  };
  cmo: CMOQuarterItem[]; // Up to 3 critical mission objectives
  kda: KDAQuarterItem[]; // Up to 2 key development assignments
  
  // Evaluation section (For Team Leader's Use)
  evaluation: {
    overallEffectiveness: "One of the best" | "Satisfactory" | "Ineffective" | "";
    strengths: string[]; // Top 3
    weaknesses: string[]; // Top 3
    lackConfidence: string; // In what area(s) do you lack confidence...
    readyForGreaterResp: "Yes" | "No" | "";
    greaterRespDetails: {
      position: string;
      when: string;
    };
    recommendReassignment: "Yes" | "No" | "";
    reassignmentDetails: {
      positionLocation: string;
      why: string;
    };
    teamLeaderSignature: string;
    teamLeaderSignatureDate: string;
    formReviewedByNameSigDate: string;
    formReviewedBy?: string;
    formReviewedByDate?: string;
  };
  
  additionalComments?: string; // For 3rd Quarter only
  updatedAt: number;
}

export interface FollowUpTask {
  id: string;
  focus: string; // Task/Focus (e.g. "1.Heart")
  coachLeader: string; // Coach/Leader (e.g. "Bayush. T")
  coaches: string[]; // List of coaches (numbered 1., 2. etc.)
  currentStage: string; // "Pre event" | "Day of" | "Post event" | string
  status: "Completed" | "In progress" | "Not started" | "Blocked";
  dueDate: string; // e.g. "September, 2026"
  coordinatorFollowup: string; // Detailed follow up status notes
  updatedAt: number;
  userId?: string;
  staffName?: string;
  quarter?: string;
  year?: string;
  isOverride?: boolean;
}

export interface ReviewRequirementSettings {
  heartRequired: boolean;
  personalLifeRequired: boolean;
  relationalLifeRequired: boolean;
  ministryEffectivenessRequired: boolean;
}

export interface ActivityLog {
  id: string; // unique ID
  userId: string; // The staff member whose record was edited
  staffName: string; // Staff member's name
  editedBy: string; // Editor's name / email
  editorUid: string; // Editor's uid
  activityType: "review" | "summary";
  quarter: "1st" | "2nd" | "3rd";
  year: string;
  action: string; // e.g., "Draft Saved", "Submitted Form", "Compiled Summary"
  timestamp: number;
}

export interface CoachingRequest {
  id: string; // Document ID: e.g. "req_memberUid_coachName"
  memberId: string;
  memberName: string;
  memberEmail: string;
  coachName: string; // The entered coach name (full name)
  status: "pending" | "approved" | "rejected"; // Admin's approval status
  adminNotes?: string;
  acceptedByCoach: "pending" | "accepted" | "rejected"; // Nominee's acceptance status
  coachRejectReason?: string; // Reason why the coach rejected
  coachUid?: string; // The uid of the coach, if they have registered
  updatedAt: number;
}


