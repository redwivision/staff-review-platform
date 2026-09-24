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
    role: role.trim(),
    email: email.trim(),
    // Privilege flags are NOT set from the client. They are granted in the
    // database (users.is_leader / users.is_admin) by an admin or via the
    // secure promote_self_to_leader_if_verified() RPC. The client must never
    // be able to grant itself admin/leader, so a signup always starts as a
    // plain member regardless of email.
    isLeader: false,
    isAdmin: false,
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
    coachUid: data.coach_uid || null,
    createdAt: data.created_at,
  };
}

export async function supabaseUpsertUser(profile: UserProfile) {
  if (!supabase) return;
  const { error } = await supabase.from("users").upsert({
    uid: profile.uid,
    name: profile.name,
    role: profile.role,
    email: profile.email,
    is_leader: profile.isLeader,
    is_admin: profile.isAdmin,
    coach_uid: profile.coachUid ?? null,
    created_at: profile.createdAt,
  });
  if (error) throw error;
}

// Safely promote the current authenticated user to leader, but ONLY if they are
// a verified (approved + accepted) coach for at least one member. Enforcement is
// done inside a SECURITY DEFINER function on the database, so the client cannot
// grant itself privileges.
export async function supabasePromoteSelfToLeaderIfVerified(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("promote_self_to_leader_if_verified");
  if (error) {
    console.error("promote_self_to_leader_if_verified error:", error);
    return false;
  }
  return true;
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

// NOTE on data integrity: every get*() below THROWS on a database error rather
// than returning an empty result. Returned-[]-on-error is dangerous: a transient
// outage would render the UI as "no data", which looks identical to a genuinely
// empty result and can cause an admin to believe records have been deleted.
// Callers must catch errors and keep showing the last good data.

export async function getMyReviews(userId: string): Promise<DevelopmentReview[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("development_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReview);
}

export async function getAllReviews(): Promise<DevelopmentReview[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("development_reviews")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReview);
}

export async function getMySummaries(userId: string): Promise<QuarterlySummary[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("quarterly_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSummary);
}

export async function getAllSummaries(): Promise<QuarterlySummary[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("quarterly_summaries")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSummary);
}

export async function getAllStaff(): Promise<UserProfile[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("users").select("*").order("created_at");
  if (error) throw error;
  return (data || []).map((r) => ({
    uid: r.uid,
    name: r.name,
    role: r.role,
    email: r.email,
    isLeader: r.is_leader,
    isAdmin: r.is_admin,
    coachUid: r.coach_uid || null,
    createdAt: r.created_at,
  }));
}

export async function getFollowUpTasks(): Promise<FollowUpTask[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("follow_up_tasks").select("*");
  if (error) throw error;
  return (data || []).map(mapFollowUp);
}

export async function getRequirementSettings(): Promise<ReviewRequirementSettings | null> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("requirement_settings").select("*").eq("id", "global").single();
  if (error) throw error;
  if (!data) return null;
  return {
    heartRequired: data.heart_required,
    personalLifeRequired: data.personal_life_required,
    relationalLifeRequired: data.relational_life_required,
    ministryEffectivenessRequired: data.ministry_effectiveness_required,
  };
}

export async function getReviewSchedules(): Promise<Record<string, any>> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("review_schedules").select("*");
  if (error) throw error;
  const result: Record<string, any> = {};
  (data || []).forEach((r) => {
    result[r.quarter] = { startDate: r.start_date, endDate: r.end_date, isActive: r.is_active };
  });
  return result;
}

export async function getActivityLogs(userId?: string, limit = 100): Promise<ActivityLog[]> {
  if (!supabase) throw new Error("Supabase not configured");
  let query = supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(limit);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapActivityLog);
}

export async function getCoachingRequests(): Promise<CoachingRequest[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("coaching_requests").select("*");
  if (error) throw error;
  return (data || []).map(mapCoachingRequest);
}

export async function getMeetings(): Promise<any[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("meetings").select("*");
  if (error) throw error;
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
  const { error } = await supabase.from("activity_logs").delete().eq("user_id", userId);
  if (error) throw error;
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
  const { error } = await supabase.from("coaching_requests").delete().eq("id", id);
  if (error) throw error;
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

// ─── REALTIME SUBSCRIPTIONS ──────────────────────────────────────────────────
// Each subscription tries Supabase Realtime (push-based) first. Realtime is far
// more scalable than polling: changes arrive immediately and the DB is not
// hammered with full-table queries every 30s per connected user (critical when
// the platform grows to thousands of users).
//
// Realtime requires the "Realtime" beta AND per-table replication to be enabled
// in the Supabase dashboard (Database → Replication). If that is not configured,
// the channel reports CHANNEL_ERROR/TIMED_OUT and we transparently fall back to
// the previous 30s polling so behaviour never silently degrades.
//
// Returns an unsubscribe function.

type Unsubscribe = () => void;

const POLL_INTERVAL_MS = 30000;

interface RealtimeSubParams<T> {
  table: string;
  // Optional Postgres filter, e.g. "user_id=eq.<uuid>". When omitted, all rows.
  filter?: string;
  fetchData: () => Promise<T>;
  applyData: (data: T) => void;
}

function subscribeRealtimeOrPoll<T>({ table, filter, fetchData, applyData }: RealtimeSubParams<T>): Unsubscribe {
  if (!supabase) return () => {};
  let cancelled = false;
  let pollId: ReturnType<typeof setInterval> | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const refetch = async () => {
    try {
      const data = await fetchData();
      if (!cancelled) applyData(data);
    } catch (e) {
      // A DB error must not wipe the last good data shown to the user; log it.
      console.error(`Realtime refetch failed for ${table}:`, e);
    }
  };

  // Initial load (always).
  refetch();

  const startPolling = () => {
    if (!pollId && !cancelled) pollId = setInterval(refetch, POLL_INTERVAL_MS);
  };

  try {
    channel = supabase.channel(`realtime:${table}:${filter || "all"}`);
    channel.on("postgres_changes", {
      event: "*",
      schema: "public",
      table,
      ...(filter ? { filter } : {}),
    }, () => { refetch(); });
    channel.subscribe((status) => {
      // SUBSCRIBED => realtime is live, no polling needed.
      // CHANNEL_ERROR / TIMED_OUT => realtime unavailable => fall back to polling.
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") startPolling();
    });
  } catch (e) {
    console.error(`Realtime not available for ${table}, falling back to polling:`, e);
    startPolling();
  }

  return () => {
    cancelled = true;
    if (pollId) clearInterval(pollId);
    if (channel) {
      try { supabase?.removeChannel(channel); } catch (_e) { /* ignore */ }
    }
  };
}

export function subscribeReviews(callback: (reviews: DevelopmentReview[]) => void, userId?: string): Unsubscribe {
  return subscribeRealtimeOrPoll<DevelopmentReview[]>({
    table: "development_reviews",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    fetchData: () => (userId ? getMyReviews(userId) : getAllReviews()),
    applyData: callback,
  });
}

export function subscribeSummaries(callback: (summaries: QuarterlySummary[]) => void, userId?: string): Unsubscribe {
  return subscribeRealtimeOrPoll<QuarterlySummary[]>({
    table: "quarterly_summaries",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    fetchData: () => (userId ? getMySummaries(userId) : getAllSummaries()),
    applyData: callback,
  });
}

export function subscribeStaff(callback: (profiles: UserProfile[]) => void): Unsubscribe {
  return subscribeRealtimeOrPoll<UserProfile[]>({
    table: "users",
    fetchData: getAllStaff,
    applyData: callback,
  });
}

export function subscribeCoachingRequests(callback: (reqs: CoachingRequest[]) => void): Unsubscribe {
  return subscribeRealtimeOrPoll<CoachingRequest[]>({
    table: "coaching_requests",
    fetchData: getCoachingRequests,
    applyData: callback,
  });
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void, userId?: string): Unsubscribe {
  return subscribeRealtimeOrPoll<ActivityLog[]>({
    table: "activity_logs",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    fetchData: () => getActivityLogs(userId),
    applyData: callback,
  });
}

export function subscribeMeetings(callback: (meetings: any[]) => void): Unsubscribe {
  return subscribeRealtimeOrPoll<any[]>({
    table: "meetings",
    fetchData: getMeetings,
    applyData: callback,
  });
}

export function subscribeFollowUpTasks(callback: (tasks: FollowUpTask[]) => void): Unsubscribe {
  return subscribeRealtimeOrPoll<FollowUpTask[]>({
    table: "follow_up_tasks",
    fetchData: getFollowUpTasks,
    applyData: callback,
  });
}

export function subscribeRequirementSettings(callback: (s: ReviewRequirementSettings | null) => void): Unsubscribe {
  return subscribeRealtimeOrPoll<ReviewRequirementSettings | null>({
    table: "requirement_settings",
    fetchData: getRequirementSettings,
    applyData: callback,
  });
}

export function subscribeReviewSchedules(callback: (s: Record<string, any>) => void): Unsubscribe {
  return subscribeRealtimeOrPoll<Record<string, any>>({
    table: "review_schedules",
    fetchData: getReviewSchedules,
    applyData: callback,
  });
}
