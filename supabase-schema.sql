-- Staff Review Platform - Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  email TEXT UNIQUE NOT NULL,
  is_leader BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- 2. Development Reviews
CREATE TABLE IF NOT EXISTS development_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(uid),
  quarter TEXT NOT NULL CHECK (quarter IN ('1st', '2nd', '3rd')),
  year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted')),
  staff_member_name TEXT NOT NULL,
  ministry_assignment TEXT NOT NULL DEFAULT '',
  supervisor_name TEXT NOT NULL DEFAULT '',
  months_covered TEXT NOT NULL DEFAULT '',
  heart JSONB NOT NULL DEFAULT '{"strengths":["","",""],"needsImprovement":["","",""],"suggestedActionPoints":["","",""]}',
  personal_life JSONB NOT NULL DEFAULT '{"strengths":["","",""],"needsImprovement":["","",""],"suggestedActionPoints":["","",""]}',
  relational_life JSONB NOT NULL DEFAULT '{"strengths":["","",""],"needsImprovement":["","",""],"suggestedActionPoints":["","",""]}',
  ministry_effectiveness JSONB NOT NULL DEFAULT '{"strengths":["","",""],"needsImprovement":["","",""],"suggestedActionPoints":["","",""]}',
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  last_updated_by TEXT NOT NULL DEFAULT '',
  leader_section_comments JSONB DEFAULT NULL
);

-- 3. Quarterly Summaries
CREATE TABLE IF NOT EXISTS quarterly_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(uid),
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'CoachSubmitted', 'Declined')),
  coach_uid TEXT,
  coach_name TEXT,
  quarter TEXT NOT NULL CHECK (quarter IN ('1st', '2nd', '3rd')),
  year TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  staff_name TEXT NOT NULL,
  team_leader_name TEXT NOT NULL DEFAULT '',
  date_joined_staff TEXT NOT NULL DEFAULT '',
  reviewer_name_position TEXT NOT NULL DEFAULT '',
  supervised_by_since TEXT NOT NULL DEFAULT '',
  present_position_since TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  suggestions JSONB NOT NULL DEFAULT '["",""]',
  decline_reason TEXT,
  declined_at TEXT,
  declined_by TEXT,
  pdp JSONB NOT NULL DEFAULT '{"heart":{},"personalLife":{},"relationalLife":{}}',
  cmo JSONB NOT NULL DEFAULT '[]',
  kda JSONB NOT NULL DEFAULT '[]',
  evaluation JSONB NOT NULL DEFAULT '{"overallEffectiveness":"","strengths":["","",""],"weaknesses":["","",""],"lackConfidence":"","readyForGreaterResp":"","greaterRespDetails":{"position":"","when":""},"recommendReassignment":"","reassignmentDetails":{"positionLocation":"","why":""},"teamLeaderSignature":"","teamLeaderSignatureDate":"","formReviewedByNameSigDate":"","formReviewedBy":"","formReviewedByDate":""}',
  additional_comments TEXT,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- 4. Follow-up Tasks
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id TEXT PRIMARY KEY,
  focus TEXT NOT NULL DEFAULT '',
  coach_leader TEXT NOT NULL DEFAULT '',
  coaches JSONB NOT NULL DEFAULT '[]',
  current_stage TEXT NOT NULL DEFAULT 'Pre event',
  status TEXT NOT NULL DEFAULT 'Not started' CHECK (status IN ('Completed', 'In progress', 'Not started', 'Blocked')),
  due_date TEXT NOT NULL DEFAULT '',
  coordinator_followup TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  user_id TEXT,
  staff_name TEXT,
  quarter TEXT,
  year TEXT,
  is_override BOOLEAN DEFAULT false
);

-- 5. Requirement Settings (single global row)
CREATE TABLE IF NOT EXISTS requirement_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  heart_required BOOLEAN NOT NULL DEFAULT true,
  personal_life_required BOOLEAN NOT NULL DEFAULT true,
  relational_life_required BOOLEAN NOT NULL DEFAULT true,
  ministry_effectiveness_required BOOLEAN NOT NULL DEFAULT true
);

-- 6. Review Schedules
CREATE TABLE IF NOT EXISTS review_schedules (
  quarter TEXT PRIMARY KEY CHECK (quarter IN ('1st', '2nd', '3rd')),
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 7. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  edited_by TEXT NOT NULL,
  editor_uid TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('review', 'summary')),
  quarter TEXT NOT NULL CHECK (quarter IN ('1st', '2nd', '3rd')),
  year TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- 8. Coaching Requests
CREATE TABLE IF NOT EXISTS coaching_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES users(uid),
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  accepted_by_coach TEXT NOT NULL DEFAULT 'pending' CHECK (accepted_by_coach IN ('pending', 'accepted', 'rejected')),
  coach_reject_reason TEXT,
  coach_uid TEXT,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- 9. Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  staff_uid TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  quarter TEXT NOT NULL,
  year TEXT NOT NULL,
  meeting_date TEXT NOT NULL DEFAULT '',
  meeting_time TEXT NOT NULL DEFAULT '',
  meeting_type TEXT NOT NULL DEFAULT 'In Person',
  notes TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON development_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_quarter ON development_reviews(quarter, year);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON quarterly_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_quarter ON quarterly_summaries(quarter, year);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_requests_member_id ON coaching_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_meetings_staff_uid ON meetings(staff_uid);

-- Row-Level Security (RLS) — enable per table
-- For now, allow all authenticated operations (tighten later)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Permissive policies (allow all for now — tighten after auth works)
CREATE POLICY "Allow all for authenticated" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON development_reviews FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON quarterly_summaries FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON follow_up_tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON requirement_settings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON review_schedules FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON coaching_requests FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON meetings FOR ALL USING (true);

-- Insert default requirement settings
INSERT INTO requirement_settings (id, heart_required, personal_life_required, relational_life_required, ministry_effectiveness_required)
VALUES ('global', true, true, true, true)
ON CONFLICT (id) DO NOTHING;
