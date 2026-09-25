import {
  saveReview as sbSaveReview,
  saveSummary as sbSaveSummary,
  saveCoachingRequest as sbSaveCoaching,
  updateCoachingRequest as sbUpdateCoaching,
  deleteCoachingRequest as sbDeleteCoaching,
  saveActivityLog as sbSaveLog,
  saveFollowUpTask as sbSaveTask,
  saveRequirementSettings as sbSaveSettings,
  saveReviewSchedule as sbSaveSchedule,
  saveMeeting as sbSaveMeeting,
  getReviewById as sbGetReviewById,
  getSummaryById as sbGetSummaryById,
} from "./supabaseDb";
import type {
  DevelopmentReview,
  QuarterlySummary,
  CoachingRequest,
  ActivityLog,
  FollowUpTask,
  ReviewRequirementSettings,
} from "./types";

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

export async function dataGetReviewById(id: string): Promise<DevelopmentReview | null> {
  return sbGetReviewById(id);
}

export async function dataSaveReview(review: DevelopmentReview) {
  return sbSaveReview(review);
}

// ─── SUMMARIES ───────────────────────────────────────────────────────────────

export async function dataGetSummaryById(id: string): Promise<QuarterlySummary | null> {
  return sbGetSummaryById(id);
}

export async function dataSaveSummary(summary: QuarterlySummary) {
  return sbSaveSummary(summary);
}

// ─── COACHING REQUESTS ───────────────────────────────────────────────────────

export async function dataSaveCoachingRequest(req: CoachingRequest) {
  return sbSaveCoaching(req);
}

export async function dataUpdateCoachingRequest(id: string, updates: Partial<CoachingRequest>) {
  return sbUpdateCoaching(id, updates);
}

export async function dataDeleteCoachingRequest(id: string) {
  return sbDeleteCoaching(id);
}

// ─── ACTIVITY LOGS ───────────────────────────────────────────────────────────

export async function dataSaveActivityLog(log: ActivityLog) {
  return sbSaveLog(log);
}

export async function dataDeleteAllActivityLogs() {
  const { supabase } = await import("./supabase");
  if (!supabase) return;
  const { error } = await supabase.from("activity_logs").delete().neq("id", "__none__");
  if (error) throw error;
}

// ─── FOLLOW-UP TASKS ─────────────────────────────────────────────────────────

export async function dataSaveFollowUpTask(task: FollowUpTask) {
  return sbSaveTask(task);
}

// ─── REQUIREMENT SETTINGS ────────────────────────────────────────────────────

export async function dataSaveRequirementSettings(settings: ReviewRequirementSettings) {
  return sbSaveSettings(settings);
}

// ─── REVIEW SCHEDULES ────────────────────────────────────────────────────────

export async function dataSaveReviewSchedule(quarter: string, schedule: any) {
  return sbSaveSchedule(quarter, schedule);
}

// ─── MEETINGS ────────────────────────────────────────────────────────────────

export async function dataSaveMeeting(meeting: any) {
  return sbSaveMeeting(meeting);
}

// ─── USER PROFILES ───────────────────────────────────────────────────────────

export async function dataUpdateUserProfile(uid: string, updates: Partial<{ isLeader: boolean; isAdmin: boolean; role: string }>) {
  const { supabase } = await import("./supabase");
  if (!supabase) return;
  const { error } = await supabase.from("users").update({
    ...(updates.isLeader !== undefined ? { is_leader: updates.isLeader } : {}),
    ...(updates.isAdmin !== undefined ? { is_admin: updates.isAdmin } : {}),
    ...(updates.role !== undefined ? { role: updates.role } : {}),
  }).eq("uid", uid);
  // A rejected update (e.g. RLS denying it) must be surfaced to the caller, not
  // silently swallowed, or the UI would claim success when nothing changed.
  if (error) throw error;
}

// Assigns (or clears) the coach linked to a staff member. Two RLS policies
// enforce this server-side: users_admin_update lets an admin change any row's
// coach_uid, and users_update_self pins coach_uid to its current value so a
// non-admin cannot change their own. Do not rely on a client-side check here.
export async function dataUpdateAssignedCoach(uid: string, coachUid: string | null) {
  const { supabase } = await import("./supabase");
  if (!supabase) return;
  const { error } = await supabase
    .from("users")
    .update({ coach_uid: coachUid })
    .eq("uid", uid);
  if (error) throw error;
}

// Safe self-promotion to leader via DB RPC (enforced server-side).
export async function dataPromoteSelfToLeaderIfVerified(): Promise<boolean> {
  const { supabasePromoteSelfToLeaderIfVerified } = await import("./supabaseDb");
  return supabasePromoteSelfToLeaderIfVerified();
}
