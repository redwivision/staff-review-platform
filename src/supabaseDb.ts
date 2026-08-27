import { supabase } from "./supabase";
import type {
  UserProfile,
  DevelopmentReview,
  QuarterlySummary,
  FollowUpTask,
  ReviewRequirementSettings,
  ActivityLog,
  CoachingRequest,
} from "./types";

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function supabaseSignUp(email: string, password: string, name: string, role: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned");

  const profile: UserProfile = {
    uid: data.user.id,
    name: name.trim(),
    role: email === "lewikb13@gmail.com" ? "Admin" : role.trim(),
    email: email.trim(),
    isLeader: email === "lewikb13@gmail.com",
    isAdmin: email === "lewikb13@gmail.com",
    createdAt: Date.now(),
  };

  const { error: dbError } = await supabase.from("users").upsert({
    uid: profile.uid,
    name: profile.name,
    role: profile.role,
    email: profile.email,
    is_leader: profile.isLeader,
    is_admin: profile.isAdmin,
    created_at: profile.createdAt,
  });
  if (dbError) throw dbError;

  return { user: data.user, profile };
}

export async function supabaseSignIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function supabaseSignOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function supabaseGetUser(uid: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("users").select("*").eq("uid", uid).single();
  if (error || !data) return null;
  return {
    uid: data.uid,
    name: data.name,
    role: data.role,
    email: data.email,
    isLeader: data.is_leader,
    isAdmin: data.is_admin,
    createdAt: data.created_at,
  };
}

export async function supabaseUpsertUser(profile: UserProfile) {
  if (!supabase) return;
  await supabase.from("users").upsert({
    uid: profile.uid,
    name: profile.name,
    role: profile.role,
    email: profile.email,
    is_leader: profile.isLeader,
    is_admin: profile.isAdmin,
    created_at: profile.createdAt,
  });
}

// ─── HELPER: Supabase → App type mappers ─────────────────────────────────────

function mapReview(row: any): DevelopmentReview {
  return {
    id: row.id,
    userId: row.user_id,
    quarter: row.quarter,
    year: row.year,
    status: row.status,
    staffMemberName: row.staff_member_name,
    ministryAssignment: row.ministry_assignment,
    supervisorName: row.supervisor_name,
    monthsCovered: row.months_covered,
    heart: row.heart,
    personalLife: row.personal_life,
    relationalLife: row.relational_life,
    ministryEffectiveness: row.ministry_effectiveness,
    updatedAt: row.updated_at,
    lastUpdatedBy: row.last_updated_by,
    leaderSectionComments: row.leader_section_comments,
  };
}

function mapSummary(row: any): QuarterlySummary {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    coachUid: row.coach_uid,
    coachName: row.coach_name,
    quarter: row.quarter,
    year: row.year,
    date: row.date,
    staffName: row.staff_name,
    teamLeaderName: row.team_leader_name,
    dateJoinedStaff: row.date_joined_staff,
    reviewerNamePosition: row.reviewer_name_position,
    supervisedBySince: row.supervised_by_since,
    presentPositionSince: row.present_position_since,
    position: row.position,
    suggestions: row.suggestions,
    declineReason: row.decline_reason,
    declinedAt: row.declined_at,
    declinedBy: row.declined_by,
    pdp: row.pdp,
    cmo: row.cmo,
    kda: row.kda,
    evaluation: row.evaluation,
    additionalComments: row.additional_comments,
    updatedAt: row.updated_at,
  };
}

function mapFollowUp(row: any): FollowUpTask {
  return {
    id: row.id,
    focus: row.focus,
    coachLeader: row.coach_leader,
    coaches: row.coaches,
    currentStage: row.current_stage,
    status: row.status,
    dueDate: row.due_date,
    coordinatorFollowup: row.coordinator_followup,
    updatedAt: row.updated_at,
    userId: row.user_id,
    staffName: row.staff_name,
    quarter: row.quarter,
    year: row.year,
    isOverride: row.is_override,
  };
}

function mapCoachingRequest(row: any): CoachingRequest {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    memberEmail: row.member_email,
    coachName: row.coach_name,
    status: row.status,
    adminNotes: row.admin_notes,
    acceptedByCoach: row.accepted_by_coach,
    coachRejectReason: row.coach_reject_reason,
    coachUid: row.coach_uid,
    updatedAt: row.updated_at,
  };
}

function mapActivityLog(row: any): ActivityLog {
  return {
    id: row.id,
    userId: row.user_id,
    staffName: row.staff_name,
    editedBy: row.edited_by,
    editorUid: row.editor_uid,
    activityType: row.activity_type,
    quarter: row.quarter,
    year: row.year,
    action: row.action,
    timestamp: row.timestamp,
  };
}

// ─── DATA READS ──────────────────────────────────────────────────────────────

export async function getMyReviews(userId: string): Promise<DevelopmentReview[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("development_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) { console.error("getMyReviews error:", error); return []; }
  return (data || []).map(mapReview);
}

export async function getAllReviews(): Promise<DevelopmentReview[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("development_reviews")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) { console.error("getAllReviews error:", error); return []; }
  return (data || []).map(mapReview);
}

export async function getMySummaries(userId: string): Promise<QuarterlySummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("quarterly_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) { console.error("getMySummaries error:", error); return []; }
  return (data || []).map(mapSummary);
}

export async function getAllSummaries(): Promise<QuarterlySummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("quarterly_summaries")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) { console.error("getAllSummaries error:", error); return []; }
  return (data || []).map(mapSummary);
}

export async function getAllStaff(): Promise<UserProfile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("users").select("*").order("created_at");
  if (error) { console.error("getAllStaff error:", error); return []; }
  return (data || []).map((r) => ({
    uid: r.uid,
    name: r.name,
    role: r.role,
    email: r.email,
    isLeader: r.is_leader,
    isAdmin: r.is_admin,
    createdAt: r.created_at,
  }));
}

export async function getFollowUpTasks(): Promise<FollowUpTask[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("follow_up_tasks").select("*");
  if (error) { console.error("getFollowUpTasks error:", error); return []; }
  return (data || []).map(mapFollowUp);
}

export async function getRequirementSettings(): Promise<ReviewRequirementSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("requirement_settings").select("*").eq("id", "global").single();
  if (error || !data) return null;
  return {
    heartRequired: data.heart_required,
    personalLifeRequired: data.personal_life_required,
    relationalLifeRequired: data.relational_life_required,
    ministryEffectivenessRequired: data.ministry_effectiveness_required,
  };
}

export async function getReviewSchedules(): Promise<Record<string, any>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("review_schedules").select("*");
  if (error) return {};
  const result: Record<string, any> = {};
  (data || []).forEach((r) => {
    result[r.quarter] = { startDate: r.start_date, endDate: r.end_date, isActive: r.is_active };
  });
  return result;
}

export async function getActivityLogs(userId?: string, limit = 100): Promise<ActivityLog[]> {
  if (!supabase) return [];
  let query = supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(limit);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) return [];
  return (data || []).map(mapActivityLog);
}

export async function getCoachingRequests(): Promise<CoachingRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("coaching_requests").select("*");
  if (error) return [];
  return (data || []).map(mapCoachingRequest);
}

export async function getMeetings(): Promise<any[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("meetings").select("*");
  if (error) return [];
  return data || [];
}

// ─── SINGLE DOC READS (for opening forms) ───────────────────────────────────

export async function getReviewById(id: string): Promise<DevelopmentReview | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("development_reviews").select("*").eq("id", id).single();
  if (error || !data) return null;
  return mapReview(data);
}

export async function getSummaryById(id: string): Promise<QuarterlySummary | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("quarterly_summaries").select("*").eq("id", id).single();
  if (error || !data) return null;
  return mapSummary(data);
}

// ─── DATA WRITES ─────────────────────────────────────────────────────────────

export async function saveReview(review: DevelopmentReview) {
  if (!supabase) return;
  const { error } = await supabase.from("development_reviews").upsert({
    id: review.id,
    user_id: review.userId,
    quarter: review.quarter,
    year: review.year,
    status: review.status,
    staff_member_name: review.staffMemberName,
    ministry_assignment: review.ministryAssignment,
    supervisor_name: review.supervisorName,
    months_covered: review.monthsCovered,
    heart: review.heart,
    personal_life: review.personalLife,
    relational_life: review.relationalLife,
    ministry_effectiveness: review.ministryEffectiveness,
    updated_at: review.updatedAt,
    last_updated_by: review.lastUpdatedBy,
    leader_section_comments: review.leaderSectionComments,
  });
  if (error) throw error;
}

export async function saveSummary(summary: QuarterlySummary) {
  if (!supabase) return;
  const { error } = await supabase.from("quarterly_summaries").upsert({
    id: summary.id,
    user_id: summary.userId,
    status: summary.status,
    coach_uid: summary.coachUid,
    coach_name: summary.coachName,
    quarter: summary.quarter,
    year: summary.year,
    date: summary.date,
    staff_name: summary.staffName,
    team_leader_name: summary.teamLeaderName,
    date_joined_staff: summary.dateJoinedStaff,
    reviewer_name_position: summary.reviewerNamePosition,
    supervised_by_since: summary.supervisedBySince,
    present_position_since: summary.presentPositionSince,
    position: summary.position,
    suggestions: summary.suggestions,
    decline_reason: summary.declineReason,
    declined_at: summary.declinedAt,
    declined_by: summary.declinedBy,
    pdp: summary.pdp,
    cmo: summary.cmo,
    kda: summary.kda,
    evaluation: summary.evaluation,
    additional_comments: summary.additionalComments,
    updated_at: summary.updatedAt,
  });
  if (error) throw error;
}

export async function saveFollowUpTask(task: FollowUpTask) {
  if (!supabase) return;
  const { error } = await supabase.from("follow_up_tasks").upsert({
    id: task.id,
    focus: task.focus,
    coach_leader: task.coachLeader,
    coaches: task.coaches,
    current_stage: task.currentStage,
    status: task.status,
    due_date: task.dueDate,
    coordinator_followup: task.coordinatorFollowup,
    updated_at: task.updatedAt,
    user_id: task.userId,
    staff_name: task.staffName,
    quarter: task.quarter,
    year: task.year,
    is_override: task.isOverride,
  });
  if (error) throw error;
}

export async function saveRequirementSettings(settings: ReviewRequirementSettings) {
  if (!supabase) return;
  const { error } = await supabase.from("requirement_settings").upsert({
    id: "global",
    heart_required: settings.heartRequired,
    personal_life_required: settings.personalLifeRequired,
    relational_life_required: settings.relationalLifeRequired,
    ministry_effectiveness_required: settings.ministryEffectivenessRequired,
  });
  if (error) throw error;
}

export async function saveReviewSchedule(quarter: string, schedule: any) {
  if (!supabase) return;
  const { error } = await supabase.from("review_schedules").upsert({
    quarter,
    start_date: schedule.startDate || "",
    end_date: schedule.endDate || "",
    is_active: schedule.isActive ?? true,
  });
  if (error) throw error;
}

export async function saveActivityLog(log: ActivityLog) {
  if (!supabase) return;
  const { error } = await supabase.from("activity_logs").upsert({
    id: log.id,
    user_id: log.userId,
    staff_name: log.staffName,
    edited_by: log.editedBy,
    editor_uid: log.editorUid,
    activity_type: log.activityType,
    quarter: log.quarter,
    year: log.year,
    action: log.action,
    timestamp: log.timestamp,
  });
  if (error) throw error;
}

export async function deleteActivityLogsByUser(userId: string) {
  if (!supabase) return;
  await supabase.from("activity_logs").delete().eq("user_id", userId);
}

export async function saveCoachingRequest(req: CoachingRequest) {
  if (!supabase) return;
  const { error } = await supabase.from("coaching_requests").upsert({
    id: req.id,
    member_id: req.memberId,
    member_name: req.memberName,
    member_email: req.memberEmail,
    coach_name: req.coachName,
    status: req.status,
    admin_notes: req.adminNotes,
    accepted_by_coach: req.acceptedByCoach,
    coach_reject_reason: req.coachRejectReason,
    coach_uid: req.coachUid,
    updated_at: req.updatedAt,
  });
  if (error) throw error;
}

export async function updateCoachingRequest(id: string, updates: Partial<CoachingRequest>) {
  if (!supabase) return;
  const dbUpdates: any = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.adminNotes !== undefined) dbUpdates.admin_notes = updates.adminNotes;
  if (updates.acceptedByCoach !== undefined) dbUpdates.accepted_by_coach = updates.acceptedByCoach;
  if (updates.coachRejectReason !== undefined) dbUpdates.coach_reject_reason = updates.coachRejectReason;
  if (updates.coachUid !== undefined) dbUpdates.coach_uid = updates.coachUid;
  dbUpdates.updated_at = Date.now();
  const { error } = await supabase.from("coaching_requests").update(dbUpdates).eq("id", id);
  if (error) throw error;
}

export async function deleteCoachingRequest(id: string) {
  if (!supabase) return;
  await supabase.from("coaching_requests").delete().eq("id", id);
}

export async function saveMeeting(meeting: any) {
  if (!supabase) return;
  const { error } = await supabase.from("meetings").upsert({
    id: meeting.id,
    staff_uid: meeting.staffUid,
    staff_name: meeting.staffName,
    quarter: meeting.quarter,
    year: meeting.year,
    meeting_date: meeting.meetingDate,
    meeting_time: meeting.meetingTime,
    meeting_type: meeting.meetingType,
    notes: meeting.notes,
    created_at: meeting.createdAt,
  });
  if (error) throw error;
}

// ─── REALTIME SUBSCRIPTIONS (polling-based for reliability) ───────────────────
// Returns an unsubscribe function. Fetches data immediately then polls every 30s.

type Unsubscribe = () => void;

function pollTable(intervalMs: number, callback: () => void): Unsubscribe {
  const id = setInterval(callback, intervalMs);
  return () => clearInterval(id);
}

export function subscribeReviews(callback: (reviews: DevelopmentReview[]) => void, userId?: string): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try {
      const reviews = userId ? await getMyReviews(userId) : await getAllReviews();
      callback(reviews);
    } catch (e) { console.error("subscribeReviews fetch error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}

export function subscribeSummaries(callback: (summaries: QuarterlySummary[]) => void, userId?: string): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try {
      const summaries = userId ? await getMySummaries(userId) : await getAllSummaries();
      callback(summaries);
    } catch (e) { console.error("subscribeSummaries fetch error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}

export function subscribeStaff(callback: (profiles: UserProfile[]) => void): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try { callback(await getAllStaff()); } catch (e) { console.error("subscribeStaff error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}

export function subscribeCoachingRequests(callback: (reqs: CoachingRequest[]) => void): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try { callback(await getCoachingRequests()); } catch (e) { console.error("subscribeCoachingRequests error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void, userId?: string): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try { callback(await getActivityLogs(userId)); } catch (e) { console.error("subscribeActivityLogs error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}

export function subscribeMeetings(callback: (meetings: any[]) => void): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try { callback(await getMeetings()); } catch (e) { console.error("subscribeMeetings error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}

export function subscribeFollowUpTasks(callback: (tasks: FollowUpTask[]) => void): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try { callback(await getFollowUpTasks()); } catch (e) { console.error("subscribeFollowUpTasks error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}

export function subscribeRequirementSettings(callback: (s: ReviewRequirementSettings | null) => void): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try { callback(await getRequirementSettings()); } catch (e) { console.error("subscribeRequirementSettings error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}

export function subscribeReviewSchedules(callback: (s: Record<string, any>) => void): Unsubscribe {
  if (!supabase) return () => {};
  const fetchAndNotify = async () => {
    try { callback(await getReviewSchedules()); } catch (e) { console.error("subscribeReviewSchedules error:", e); }
  };
  fetchAndNotify();
  return pollTable(30000, fetchAndNotify);
}
