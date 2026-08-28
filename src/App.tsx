import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, hasSupabaseConfig } from "./supabase";
import {
  supabaseSignUp,
  supabaseSignIn,
  supabaseSignOut,
  supabaseGetUser,
  supabaseUpsertUser,
  subscribeReviews,
  subscribeSummaries,
  subscribeStaff,
  subscribeCoachingRequests,
  subscribeActivityLogs,
  subscribeMeetings,
  subscribeFollowUpTasks,
  subscribeRequirementSettings,
  subscribeReviewSchedules,
} from "./supabaseDb";
import { UserProfile, DevelopmentReview, QuarterlySummary, FollowUpTask, ReviewRequirementSettings, ActivityLog, CoachingRequest } from "./types";
import { createNewReview, createNewSummary, getPdfDefaultTasks, calculateReviewProgress } from "./utils";
import { exportEvaluationToPDF } from "./utils/pdfExport";
import { QUARTER_INFO } from "./constants";
import {
  dataSaveReview, dataGetReviewById, dataSaveSummary, dataGetSummaryById,
  dataSaveCoachingRequest, dataUpdateCoachingRequest, dataDeleteCoachingRequest,
  dataSaveActivityLog, dataDeleteAllActivityLogs, dataSaveFollowUpTask,
  dataSaveRequirementSettings, dataSaveReviewSchedule, dataSaveMeeting,
  dataUpdateUserProfile,
} from "./dataLayer";
import ReviewFormEditor from "./components/ReviewFormEditor";
import SummaryFormEditor from "./components/SummaryFormEditor";
import UserManagement from "./components/UserManagement";
import ActivityLogList from "./components/ActivityLog";
import CoachingNominations from "./components/CoachingNominations";
import CoachingInvitations from "./components/CoachingInvitations";
import AdminCoachingPanel from "./components/AdminCoachingPanel";
import AdminReports from "./components/AdminReports";
import { 
  Heart, 
  User, 
  Users, 
  ShieldCheck, 
  ShieldAlert,
  LogOut, 
  ChevronRight, 
  Plus, 
  Calendar, 
  FileText, 
  Lock, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  HelpCircle, 
  UserX,
  UserPlus,
  Send,
  Sparkles,
  Award,
  MessageSquare,
  Moon,
  Sun,
  Trash2,
  Search,
  FileCheck,
  BookOpen,
  X,
  Layers,
  TrendingUp,
  TrendingDown,
  Download,
  BellRing,
  Database,
  HeartHandshake,
  ClipboardList,
  ArrowRight,
  Mail
} from "lucide-react";

export default function App() {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authRole, setAuthRole] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");

  // Dark/Light Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("staff_development_theme");
    return saved === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("staff_development_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("staff_development_theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Application data states
  const [myReviews, setMyReviews] = useState<DevelopmentReview[]>([]);
  const [mySummaries, setMySummaries] = useState<QuarterlySummary[]>([]);
  const [allReviews, setAllReviews] = useState<DevelopmentReview[]>([]);
  const [allSummaries, setAllSummaries] = useState<QuarterlySummary[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<UserProfile[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [coachingRequests, setCoachingRequests] = useState<CoachingRequest[]>([]);

  // O(1) Memoized Lookup Maps for High-Scale (500+ users) Performance
  const summariesMap = useMemo(() => {
    const map = new Map<string, QuarterlySummary>();
    
    // First pass: set all base summaries
    allSummaries.forEach(s => {
      if (!s.coachUid) {
        map.set(`${s.userId}-${s.quarter}`, s);
      }
    });
    
    // Second pass: if user is logged in, overwrite with their coach-specific summaries
    if (user) {
      allSummaries.forEach(s => {
        if (s.coachUid === user.uid) {
          map.set(`${s.userId}-${s.quarter}`, s);
        }
      });
    }
    
    return map;
  }, [allSummaries, user]);

  const reviewsMap = useMemo(() => {
    const map = new Map<string, DevelopmentReview>();
    allReviews.forEach(r => {
      map.set(`${r.userId}-${r.quarter}`, r);
    });
    return map;
  }, [allReviews]);

  const coachesMap = useMemo(() => {
    const map = new Map<string, CoachingRequest[]>();
    coachingRequests.forEach(req => {
      if (req.status === "approved" && req.acceptedByCoach === "accepted") {
        const existing = map.get(req.memberId) || [];
        existing.push(req);
        map.set(req.memberId, existing);
      }
    });
    return map;
  }, [coachingRequests]);

  // Navigation / UI active states
  const [currentTab, setCurrentTab] = useState<"my-reviews" | "team-reviews" | "admin" | "meetings">("my-reviews");
  const [adminSubTab, setAdminSubTab] = useState<"tracking" | "control" | "users">("tracking");
  const [selectedQuarter, setSelectedQuarter] = useState<"1st" | "2nd" | "3rd">("1st");
  const [selectedYear, setSelectedYear] = useState<string>("2025-2026");
  const [selectedStaffUid, setSelectedStaffUid] = useState<string | null>(null);
  const [activeReview, setActiveReview] = useState<DevelopmentReview | null>(null);
  const [activeSummary, setActiveSummary] = useState<QuarterlySummary | null>(null);
  const [activeSummaryStaffName, setActiveSummaryStaffName] = useState("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [useMockData, setUseMockData] = useState<boolean>(() => {
    return localStorage.getItem("staff_review_use_mock_data") === "true";
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Follow-Up & Dynamic Requirements States
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [requirementSettings, setRequirementSettings] = useState<ReviewRequirementSettings>({
    heartRequired: true,
    personalLifeRequired: true,
    relationalLifeRequired: true,
    ministryEffectivenessRequired: true
  });
  const [reviewSchedules, setReviewSchedules] = useState<Record<string, { 
    startDate: string; 
    dueDate: string; 
    notifyAll: boolean; 
    notificationMessage?: string;
    quarterlyUnlocked?: boolean;
    quarterlyUnlockDate?: string;
    quarterlyUnlockTime?: string;
    updatedAt?: number;
  }>>({
    "1st": { startDate: "", dueDate: "", notifyAll: false, notificationMessage: "", quarterlyUnlocked: false, quarterlyUnlockDate: "", quarterlyUnlockTime: "", updatedAt: undefined },
    "2nd": { startDate: "", dueDate: "", notifyAll: false, notificationMessage: "", quarterlyUnlocked: false, quarterlyUnlockDate: "", quarterlyUnlockTime: "", updatedAt: undefined },
    "3rd": { startDate: "", dueDate: "", notifyAll: false, notificationMessage: "", quarterlyUnlocked: false, quarterlyUnlockDate: "", quarterlyUnlockTime: "", updatedAt: undefined }
  });

  const isQuarterlyUnlockedForUser = (qKey: string) => {
    const sched = reviewSchedules[qKey];
    if (!sched) return false;
    
    // 1. Check if explicitly unlocked manually
    if (sched.quarterlyUnlocked) return true;
    
    // 2. Check if a scheduled unlock date (and optional time) is set and passed
    if (sched.quarterlyUnlockDate) {
      const now = new Date();
      let unlockDateTimeStr = sched.quarterlyUnlockDate;
      if (sched.quarterlyUnlockTime) {
        unlockDateTimeStr += `T${sched.quarterlyUnlockTime}`;
      } else {
        unlockDateTimeStr += `T00:00:00`;
      }
      const unlockTime = new Date(unlockDateTimeStr);
      if (!isNaN(unlockTime.getTime()) && now >= unlockTime) {
        return true;
      }
    }
    return false;
  };

  // Scheduler modal / form state
  const [showScheduler, setShowScheduler] = useState(false);
  const [showPostSubmitCoachingModal, setShowPostSubmitCoachingModal] = useState(false);
  const [evaluationCenterSubTab, setEvaluationCenterSubTab] = useState<"manage" | "overview">("overview");
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewQuarter, setOverviewQuarter] = useState<"All" | "1st" | "2nd" | "3rd">("All");
  const [overviewEffectiveness, setOverviewEffectiveness] = useState<"All" | "One of the best" | "Satisfactory" | "Ineffective" | "Pending">("All");
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewViewMode, setOverviewViewMode] = useState<"matrix" | "evaluations">("evaluations");
  const [overviewSortBy, setOverviewSortBy] = useState<"rating" | "name" | "date">("name");
  const [activeTLEvaluation, setActiveTLEvaluation] = useState<{ member: UserProfile; quarter: "1st" | "2nd" | "3rd"; summary?: QuarterlySummary } | null>(null);
  const [modalSearchName, setModalSearchName] = useState("");
  const [showModalSuggestions, setShowModalSuggestions] = useState(false);
  const [modalError, setModalError] = useState("");
  const [scheduleStaffUid, setScheduleStaffUid] = useState("");
  const [scheduleQuarter, setScheduleQuarter] = useState<"1st" | "2nd" | "3rd">("1st");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [declineSummaryTarget, setDeclineSummaryTarget] = useState<{ summary: QuarterlySummary; memberName: string } | null>(null);
  const [declineReasonText, setDeclineReasonText] = useState("");
  const [selectedEvaluations, setSelectedEvaluations] = useState<string[]>([]);
  const [showBulkDeclineModal, setShowBulkDeclineModal] = useState(false);
  const [bulkDeclineReason, setBulkDeclineReason] = useState("");
  const [bulkActionProgress, setBulkActionProgress] = useState<{ total: number; current: number; type: 'decline' | 'export' | null }>({ total: 0, current: 0, type: null });

  // PDF Export Customizer State
  const [pdfExportConfig, setPdfExportConfig] = useState<{
    isOpen: boolean;
    member?: UserProfile;
    quarter?: "1st" | "2nd" | "3rd";
    summary?: QuarterlySummary;
    isBulk?: boolean;
    bulkItems?: Array<{ member: UserProfile; quarter: "1st" | "2nd" | "3rd"; summary: QuarterlySummary }>;
  } | null>(null);

  const [pdfIsDefaultOnly, setPdfIsDefaultOnly] = useState(true);
  const [pdfIncludePDP, setPdfIncludePDP] = useState(false);
  const [pdfIncludeCMO, setPdfIncludeCMO] = useState(false);
  const [pdfIncludeKDA, setPdfIncludeKDA] = useState(false);
  const [pdfIncludeSuggestions, setPdfIncludeSuggestions] = useState(false);

  const openPdfCustomizer = (
    member: UserProfile,
    quarter: "1st" | "2nd" | "3rd",
    summary?: QuarterlySummary
  ) => {
    setPdfIsDefaultOnly(true);
    setPdfIncludePDP(false);
    setPdfIncludeCMO(false);
    setPdfIncludeKDA(false);
    setPdfIncludeSuggestions(false);
    setPdfExportConfig({
      isOpen: true,
      member,
      quarter,
      summary,
      isBulk: false
    });
  };

  const openBulkPdfCustomizer = (
    itemsToExport: Array<{ member: UserProfile; quarter: "1st" | "2nd" | "3rd"; summary: QuarterlySummary }>
  ) => {
    setPdfIsDefaultOnly(true);
    setPdfIncludePDP(false);
    setPdfIncludeCMO(false);
    setPdfIncludeKDA(false);
    setPdfIncludeSuggestions(false);
    setPdfExportConfig({
      isOpen: true,
      isBulk: true,
      bulkItems: itemsToExport
    });
  };

  // Computed Coaching State Values
  const isAdmin = user && (user.isAdmin === true || user.email === "lewikb13@gmail.com" || user.role?.toLowerCase() === "admin");

  const myActiveCoachedUids = user
    ? coachingRequests
        .filter(req => req.status === "approved" && req.acceptedByCoach === "accepted" && (req.coachUid === user.uid || req.coachName.toLowerCase() === user.name.toLowerCase()))
        .map(req => req.memberId)
    : [];

  const filteredStaffProfiles = user
    ? (isAdmin
        ? staffProfiles.filter(s => s.uid !== user.uid)
        : staffProfiles.filter(s => myActiveCoachedUids.includes(s.uid) && s.uid !== user.uid))
    : [];

  const visibleReviews = user
    ? (isAdmin
        ? allReviews
        : allReviews.filter(r => myActiveCoachedUids.includes(r.userId) || r.userId === user.uid))
    : [];

  const visibleSummaries = user
    ? (isAdmin
        ? allSummaries
        : allSummaries.filter(s => myActiveCoachedUids.includes(s.userId) || s.userId === user.uid))
    : [];

  const pendingInvitations = user
    ? coachingRequests.filter(req => {
        const isNameMatch = req.coachName.toLowerCase() === user.name.toLowerCase();
        const isUidMatch = req.coachUid === user.uid;
        return (isNameMatch || isUidMatch) && req.status === "approved" && req.acceptedByCoach === "pending";
      })
    : [];

  const hasPendingInvitation = pendingInvitations.length > 0;

  const isLeaderOrCoach = user
    ? (user.isLeader || myActiveCoachedUids.length > 0 || hasPendingInvitation || isAdmin)
    : false;

  const pendingInvitationsCount = pendingInvitations.length;

  // Tab-aware "Next Step" panel — walks the user through what to do on the
  // current tab, focused ONLY on the Quarterly Summary workflow.
  const myNextStep = (() => {
    if (!user) return null;
    const quarters: ("1st" | "2nd" | "3rd")[] = ["1st", "2nd", "3rd"];
    const memberNominations = coachingRequests.filter(req => req.memberId === user.uid);

    // MY REVIEWS — staff member's quarterly self-review journey
    if (currentTab === "my-reviews") {
      // A coach only counts as "set" once they're verified: admin-approved AND they accepted.
      const hasVerifiedCoach = memberNominations.some(r => r.status === "approved" && r.acceptedByCoach === "accepted");

      // Step for the quarterly form (only when that quarter is unlocked)
      const draftOrDeclined = mySummaries.find(s =>
        (s.status === "Draft" || s.status === "Declined") &&
        isQuarterlyUnlockedForUser(s.quarter)
      );
      const unlockedQ = quarters.find(q => !mySummaries.some(ss => ss.quarter === q) && isQuarterlyUnlockedForUser(q));

      // Already submitted to their coach → keep it with the coach.
      if (mySummaries.some(s => s.status === "Submitted" || s.status === "CoachSubmitted")) {
        return { type: "wait" as const, quarter: null, label: "Great job — it's with your coach", description: "Your quarterly form is submitted to your coach. They'll add their evaluation and send it to Admin.", btn: "View Coach" };
      }

      // Form is ready AND the coach is verified → move to Step 2.
      if ((draftOrDeclined || unlockedQ) && hasVerifiedCoach) {
        if (draftOrDeclined) {
          return { type: "fill-summary" as const, quarter: draftOrDeclined.quarter, label: "Step 2 · Continue your quarterly form", description: `Finish the ${QUARTER_INFO[draftOrDeclined.quarter].name} Quarterly Summary, then press "Submit to Coach".`, btn: "Continue Form" };
        }
        return { type: "fill-summary" as const, quarter: unlockedQ, label: "Step 2 · Start your quarterly form", description: `Open the ${QUARTER_INFO[unlockedQ].name} Quarterly Summary, fill it in, then press "Submit to Coach".`, btn: "Start Form" };
      }

      // Otherwise surface the coach step — never show a "locked" state, and
      // never jump to the form until the coach is verified.
      if (memberNominations.length === 0) {
        return { type: "nominate" as const, quarter: null, label: "Step 1 · Pick your coach", description: "Choose the Team Leader who will guide your review. Your form will open once your coach is confirmed.", btn: "View Coach" };
      }
      if (!hasVerifiedCoach) {
        return { type: "nominate" as const, quarter: null, label: "Waiting for your coach to accept", description: "Admin has your request and your coach needs to accept. You can start your form as soon as they're confirmed.", btn: "View Coach" };
      }
      return { type: "nominate" as const, quarter: null, label: "Your coach is ready", description: "Your coach is confirmed. Your form will open here once it's ready.", btn: "View Coach" };
    }

    // TEAM REVIEWS — coach/leader evaluates their staff's summaries
    if (currentTab === "team-reviews") {
      if (hasPendingInvitation) {
        return { type: "invitation" as const, quarter: null, label: "Respond to your coaching request", description: "A staff member wants you as their Team Leader and coach. Accept or decline to keep things moving.", btn: "Respond" };
      }
      return { type: "leader" as const, quarter: null, label: "Evaluate your team's summaries", description: "Open a staff member's submitted Quarterly Summary, fill the TL Evaluation, then press \"Submit to Admin\".", btn: "Open Summaries" };
    }

    // ADMIN — approve/decline & export
    if (currentTab === "admin") {
      return { type: "admin" as const, quarter: null, label: "Approve & manage evaluations", description: "Review the summaries coaches have submitted, approve or decline them, and export reports or PDFs.", btn: "Go to Reports" };
    }

    // MEETINGS
    if (currentTab === "meetings") {
      return { type: "meeting" as const, quarter: null, label: "Schedule a review meeting", description: "Book a meeting to go over a staff member's quarterly review together.", btn: "Schedule" };
    }

    return null;
  })();

  // Reset overview tab page number on filter changes
  useEffect(() => {
    setOverviewPage(1);
  }, [overviewSearch, overviewQuarter, overviewEffectiveness]);

  // Listen to Auth State
  useEffect(() => {
    // If it's a completely fresh tab/session, clear the bypass user and sign out
    if (!sessionStorage.getItem("has_init_session")) {
      localStorage.removeItem("staff_review_bypass_user");
      supabaseSignOut();
      sessionStorage.setItem("has_init_session", "true");
    }

    // Check local storage first for bypass mode user
    const savedLocalUser = localStorage.getItem("staff_review_bypass_user");
    if (savedLocalUser) {
      try {
        const profile = JSON.parse(savedLocalUser) as UserProfile;
        setUser(profile);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem("staff_review_bypass_user");
      }
    }

    // If Supabase is not configured, skip auth (bypass mode only)
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false);
      return;
    }

    // Supabase auth listener
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const profile = await supabaseGetUser(session.user.id);
          if (profile) {
            if (profile.email === "lewikb13@gmail.com" && (!profile.isLeader || !profile.isAdmin)) {
              profile.isLeader = true;
              profile.isAdmin = true;
              profile.role = "Admin";
              await supabaseUpsertUser(profile);
            }
            setUser(profile);
          } else {
            const fallbackProfile: UserProfile = {
              uid: session.user.id,
              name: session.user.user_metadata?.name || "Staff Member",
              role: session.user.email === "lewikb13@gmail.com" ? "Admin" : "Assigned Staff",
              email: session.user.email || "",
              isLeader: session.user.email === "lewikb13@gmail.com",
              isAdmin: session.user.email === "lewikb13@gmail.com",
              createdAt: Date.now()
            };
            await supabaseUpsertUser(fallbackProfile);
            setUser(fallbackProfile);
          }
        } catch (e) {
          console.error("Error loading user profile:", e);
          // Still create a basic profile from auth metadata so the app works
          const fallbackProfile: UserProfile = {
            uid: session.user.id,
            name: session.user.user_metadata?.name || "Staff Member",
            role: session.user.email === "lewikb13@gmail.com" ? "Admin" : "Assigned Staff",
            email: session.user.email || "",
            isLeader: session.user.email === "lewikb13@gmail.com",
            isAdmin: session.user.email === "lewikb13@gmail.com",
            createdAt: Date.now()
          };
          setUser(fallbackProfile);
        }
      } else {
        if (!localStorage.getItem("staff_review_bypass_user")) setUser(null);
      }
      setLoading(false);
    }).catch((err) => {
      console.error("getSession failed:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const profile = await supabaseGetUser(session.user.id);
          if (profile) setUser(profile);
        } else {
          if (!localStorage.getItem("staff_review_bypass_user")) setUser(null);
        }
      } catch (e) {
        console.error("onAuthStateChange error:", e);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  // Listen to Dynamic Database updates when Logged In
  useEffect(() => {
    if (!user) return;

    if (user.uid.startsWith("bypass_")) {
      // Local Storage Bypass Data Syncer
      const syncLocalData = () => {
        // Load reviews
        const localReviewsStr = localStorage.getItem("staff_review_bypass_reviews") || "[]";
        const localReviews = JSON.parse(localReviewsStr) as DevelopmentReview[];
        setMyReviews(localReviews.filter(r => r.userId === user.uid));
        setAllReviews(localReviews);

        // Load summaries
        const localSummariesStr = localStorage.getItem("staff_review_bypass_summaries") || "[]";
        const localSummaries = JSON.parse(localSummariesStr) as QuarterlySummary[];
        setMySummaries(localSummaries.filter(s => s.userId === user.uid));
        setAllSummaries(localSummaries);

        // Load meetings
        const localMeetingsStr = localStorage.getItem("staff_review_bypass_meetings") || "[]";
        const localMeetings = JSON.parse(localMeetingsStr);
        setMeetings(localMeetings);

        // Load follow-up tasks
        const localTasksStr = localStorage.getItem("staff_review_bypass_followup_tasks") || "[]";
        let localTasks = JSON.parse(localTasksStr) as FollowUpTask[];
        if (localTasks.length === 0) {
          localTasks = getPdfDefaultTasks();
          localStorage.setItem("staff_review_bypass_followup_tasks", JSON.stringify(localTasks));
        }
        setFollowUpTasks(localTasks);

        // Load requirement settings
        const localSettingsStr = localStorage.getItem("staff_review_bypass_requirement_settings");
        if (localSettingsStr) {
          setRequirementSettings(JSON.parse(localSettingsStr));
        } else {
          const defaultSettings = {
            heartRequired: true,
            personalLifeRequired: true,
            relationalLifeRequired: true,
            ministryEffectivenessRequired: true
          };
          localStorage.setItem("staff_review_bypass_requirement_settings", JSON.stringify(defaultSettings));
          setRequirementSettings(defaultSettings);
        }

        // Load activity logs
        const localLogsStr = localStorage.getItem("staff_review_bypass_activity_logs") || "[]";
        const localLogs = JSON.parse(localLogsStr) as ActivityLog[];
        setActivityLogs(localLogs);

        // Load coaching requests
        const localCoachingStr = localStorage.getItem("staff_review_bypass_coaching_requests") || "[]";
        const localCoaching = JSON.parse(localCoachingStr) as CoachingRequest[];
        setCoachingRequests(localCoaching);

        // Seed default mock staff members for testing
        const localUsersStr = localStorage.getItem("staff_review_bypass_users") || "[]";
        let localUsers = JSON.parse(localUsersStr) as UserProfile[];
        if (localUsers.length === 0) {
          localUsers = [
            {
              uid: "bypass_john_staff_example_com",
              name: "John Staff",
              role: "Ministry Coordinator",
              email: "john.staff@example.com",
              isLeader: false,
              createdAt: Date.now()
            },
            {
              uid: "bypass_anna_coordinator_example_com",
              name: "Anna Coordinator",
              role: "National Coordinator",
              email: "anna.coord@example.com",
              isLeader: false,
              createdAt: Date.now()
            },
            {
              uid: "bypass_peter_field_example_com",
              name: "Peter Field Officer",
              role: "Field Representative",
              email: "peter.field@example.com",
              isLeader: false,
              createdAt: Date.now()
            }
          ];
          localStorage.setItem("staff_review_bypass_users", JSON.stringify(localUsers));
        }
        // Ensure current logged in user is in local users list
        if (!localUsers.some(u => u.uid === user.uid)) {
          localUsers.push(user);
          localStorage.setItem("staff_review_bypass_users", JSON.stringify(localUsers));
        }
        setStaffProfiles(localUsers);
      };

      syncLocalData();
      return;
    }

    // ─── SUPABASE REALTIME SUBSCRIPTIONS ────────────────────────────────────
    const isLeaderOrCoachNow = user.isLeader || isAdmin;
    const unsubMyReviews = subscribeReviews((reviews) => setMyReviews(reviews.filter(r => r.userId === user.uid)), user.uid);
    const unsubAllReviews = subscribeReviews((reviews) => setAllReviews(reviews));
    const unsubMySummaries = subscribeSummaries((summaries) => setMySummaries(summaries.filter(s => s.userId === user.uid)), user.uid);
    const unsubAllSummaries = subscribeSummaries((summaries) => setAllSummaries(summaries));
    const unsubStaff = subscribeStaff((profiles) => setStaffProfiles(profiles));
    const unsubCoaching = subscribeCoachingRequests((reqs) => setCoachingRequests(reqs));
    const unsubMeetings = subscribeMeetings((meetings) => setMeetings(meetings));
    const unsubFollowUp = subscribeFollowUpTasks((tasks) => setFollowUpTasks(tasks));
    const unsubSettings = subscribeRequirementSettings((s) => setRequirementSettings(s || {
      heartRequired: true, personalLifeRequired: true, relationalLifeRequired: true, ministryEffectivenessRequired: true
    }));
    const unsubSchedules = subscribeReviewSchedules((schedules) => {
      const defaultSchedules: any = {
        "1st": { startDate: "", dueDate: "", notifyAll: false, notificationMessage: "", quarterlyUnlocked: false, quarterlyUnlockDate: "", quarterlyUnlockTime: "", updatedAt: undefined },
        "2nd": { startDate: "", dueDate: "", notifyAll: false, notificationMessage: "", quarterlyUnlocked: false, quarterlyUnlockDate: "", quarterlyUnlockTime: "", updatedAt: undefined },
        "3rd": { startDate: "", dueDate: "", notifyAll: false, notificationMessage: "", quarterlyUnlocked: false, quarterlyUnlockDate: "", quarterlyUnlockTime: "", updatedAt: undefined }
      };
      Object.keys(schedules).forEach(k => { defaultSchedules[k] = { ...defaultSchedules[k], ...schedules[k] }; });
      setReviewSchedules(defaultSchedules);
    });
    const unsubLogs = subscribeActivityLogs((logs) => setActivityLogs(logs), isLeaderOrCoachNow ? undefined : user.uid);

    return () => {
      unsubMyReviews();
      unsubAllReviews();
      unsubMySummaries();
      unsubAllSummaries();
      unsubStaff();
      unsubCoaching();
      unsubMeetings();
      unsubFollowUp();
      unsubSettings();
      unsubSchedules();
      unsubLogs();
    };
  }, [user]);

  // Handle Authentication submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      if (hasSupabaseConfig) {
        // Supabase auth
        if (isSignUp) {
          if (!authName.trim()) throw new Error("Please fill in your full name.");
          if (!authRole.trim()) throw new Error("Please fill in your specific organizational role.");
          const { profile } = await supabaseSignUp(authEmail, authPassword, authName, authRole);
          setUser(profile);
        } else {
          await supabaseSignIn(authEmail, authPassword);
          // Explicitly load and set the user profile after login
          const { data: sessionData } = await supabase!.auth.getSession();
          if (sessionData.session?.user) {
            const profile = await supabaseGetUser(sessionData.session.user.id);
            if (profile) {
              setUser(profile);
            } else {
              const fallbackProfile: UserProfile = {
                uid: sessionData.session.user.id,
                name: sessionData.session.user.user_metadata?.name || "Staff Member",
                role: sessionData.session.user.email === "lewikb13@gmail.com" ? "Admin" : "Assigned Staff",
                email: sessionData.session.user.email || "",
                isLeader: sessionData.session.user.email === "lewikb13@gmail.com",
                isAdmin: sessionData.session.user.email === "lewikb13@gmail.com",
                createdAt: Date.now()
              };
              try { await supabaseUpsertUser(fallbackProfile); } catch {}
              setUser(fallbackProfile);
            }
          }
        }
      } else {
        setAuthError("No authentication provider configured. Please use the Bypass buttons below.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  // Bypass Authentication Login Helper
  const seedMockDataToLocalStorage = () => {
    // 1. Users list
    const mockUsers: UserProfile[] = [
      {
        uid: "bypass_lewikb13_gmail_com",
        name: "Lewis KB",
        role: "Platform Owner",
        email: "lewikb13@gmail.com",
        isLeader: true,
        isAdmin: true,
        createdAt: Date.now()
      },
      {
        uid: "bypass_leader_example_com",
        name: "Sarah Leader",
        role: "Regional Coordinator",
        email: "leader@example.com",
        isLeader: true,
        createdAt: Date.now()
      },
      {
        uid: "bypass_john_staff_example_com",
        name: "John Staff",
        role: "Ministry Coordinator",
        email: "john.staff@example.com",
        isLeader: false,
        createdAt: Date.now()
      },
      {
        uid: "bypass_anna_coordinator_example_com",
        name: "Anna Coordinator",
        role: "National Coordinator",
        email: "anna.coord@example.com",
        isLeader: false,
        createdAt: Date.now()
      },
      {
        uid: "bypass_peter_field_example_com",
        name: "Peter Field Officer",
        role: "Field Representative",
        email: "peter.field@example.com",
        isLeader: false,
        createdAt: Date.now()
      }
    ];
    localStorage.setItem("staff_review_bypass_users", JSON.stringify(mockUsers));

    // 2. Coaching requests (approved and accepted so Sarah Leader is their coach)
    const mockRequests: CoachingRequest[] = [
      {
        id: "req_bypass_john_staff_example_com_Sarah_Leader",
        memberId: "bypass_john_staff_example_com",
        memberName: "John Staff",
        memberEmail: "john.staff@example.com",
        coachName: "Sarah Leader",
        status: "approved",
        acceptedByCoach: "accepted",
        coachUid: "bypass_leader_example_com",
        updatedAt: Date.now()
      },
      {
        id: "req_bypass_anna_coordinator_example_com_Sarah_Leader",
        memberId: "bypass_anna_coordinator_example_com",
        memberName: "Anna Coordinator",
        memberEmail: "anna.coord@example.com",
        coachName: "Sarah Leader",
        status: "approved",
        acceptedByCoach: "accepted",
        coachUid: "bypass_leader_example_com",
        updatedAt: Date.now()
      },
      {
        id: "req_bypass_peter_field_example_com_Sarah_Leader",
        memberId: "bypass_peter_field_example_com",
        memberName: "Peter Field Officer",
        memberEmail: "peter.field@example.com",
        coachName: "Sarah Leader",
        status: "approved",
        acceptedByCoach: "accepted",
        coachUid: "bypass_leader_example_com",
        updatedAt: Date.now()
      },
      {
        id: "req_bypass_leader_example_com_Lewis_KB",
        memberId: "bypass_leader_example_com",
        memberName: "Sarah Leader",
        memberEmail: "leader@example.com",
        coachName: "Lewis KB",
        status: "approved",
        acceptedByCoach: "accepted",
        coachUid: "bypass_lewikb13_gmail_com",
        updatedAt: Date.now()
      },
      {
        id: "req_bypass_peter_field_example_com_Sarah_Leader",
        memberId: "bypass_peter_field_example_com",
        memberName: "Peter Field Officer",
        memberEmail: "peter.field@example.com",
        coachName: "Sarah Leader",
        status: "approved",
        acceptedByCoach: "accepted",
        coachUid: "bypass_leader_example_com",
        updatedAt: Date.now()
      }
    ];
    localStorage.setItem("staff_review_bypass_coaching_requests", JSON.stringify(mockRequests));

    // 3. Reviews:
    const mockReviews: DevelopmentReview[] = [
      // John Staff - 1st Quarter - Submitted
      {
        id: "bypass_john_staff_example_com_1st_2025-2026",
        userId: "bypass_john_staff_example_com",
        quarter: "1st",
        year: "2025-2026",
        status: "Submitted",
        staffMemberName: "John Staff",
        ministryAssignment: "Campus Discipleship",
        supervisorName: "Sarah Leader",
        monthsCovered: "July - October 2025",
        heart: {
          strengths: ["Consistently starts the day with deep prayer", "Deeply cares about individual student growth", "Eager to learn and digest spiritual reading"],
          needsImprovement: ["Occasionally neglects Sabbath rest under peak deadlines", "Hesitant to ask team members for prayer support", "Slowing down to reflect on learnings"],
          suggestedActionPoints: ["Schedule a monthly Sabbath reflection day", "Share one personal prayer need in weekly standup", "Keep a learning journal"]
        },
        personalLife: {
          strengths: ["Highly disciplined gym and exercise routine", "Healthy boundaries between work and family hours", "Keeps a simple, humble lifestyle"],
          needsImprovement: ["Inconsistent hydration and eating habits on campus", "Struggles with sleep consistency", "Reluctant to delegate trivial household chores"],
          suggestedActionPoints: ["Set a daily water intake tracker", "Adhere to a 10 PM screens-off routine", "Involve family members in meal preparation"]
        },
        relationalLife: {
          strengths: ["Warm, welcoming, and easy to build trust with", "Speaks with encouragement and constructive words", "Quick to apologize when mistakes happen"],
          needsImprovement: ["Overcommitting to social visits out of guilt", "Occasionally delayed with team email responses", "Difficult conversation avoidance"],
          suggestedActionPoints: ["Limit social commitments to 2 per week", "Dedicate the first 30 mins of the day to emails", "Use a structured talking-points frame for tough meetings"]
        },
        ministryEffectiveness: {
          strengths: ["Leads dynamic, well-attended student Bible studies", "Mobilizes student volunteers beautifully", "Outstanding coordination of campus events"],
          needsImprovement: ["Late submission of weekly progress trackers", "Handling complex financial tracking/expense reports", "Setting strategic, measurable local ministry goals"],
          suggestedActionPoints: ["Fill and submit logs every Friday afternoon", "Spend 1 hour with team administrative assistant", "Draft quarterly local objectives with coach"]
        },
        updatedAt: Date.now() - 3600 * 24 * 5 * 1000,
        lastUpdatedBy: "John Staff",
        leaderSectionComments: {
          "heart": "John, your heart for God and students is beautiful. Keep up this depth!",
          "personalLife": "Excellent work protecting your family time, John.",
          "relationalLife": "Your transparency is a gift to the team.",
          "ministryEffectiveness": "Your campus outreach was stellar. Let's make sure administrative tracking is done weekly."
        }
      },
      // Anna Coordinator - 1st Quarter - Submitted
      {
        id: "bypass_anna_coordinator_example_com_1st_2025-2026",
        userId: "bypass_anna_coordinator_example_com",
        quarter: "1st",
        year: "2025-2026",
        status: "Submitted",
        staffMemberName: "Anna Coordinator",
        ministryAssignment: "National Office Administration",
        supervisorName: "Sarah Leader",
        monthsCovered: "July - October 2025",
        heart: {
          strengths: ["Exceptional integrity and alignment", "Calm spirit in times of transition", "Nurturing attitude towards staff"],
          needsImprovement: ["Overly self-critical during stressful weeks", "Finding quiet hours in a busy workspace", "Hesitancy to express weariness"],
          suggestedActionPoints: ["Book a quiet workspace afternoon on Tuesdays", "Commit to monthly peer-group sessions", "Write weekly reflections"]
        },
        personalLife: {
          strengths: ["Highly organized household planner", "Consistent evening walks", "Protects weekend rest fully"],
          needsImprovement: ["Struggles to turn off work notifications on phone", "Irregular lunch breaks due to back-to-back calls", "Lack of recreational hobbies outside work"],
          suggestedActionPoints: ["Disable work apps after 6:00 PM", "Block out a solid hour at 1:00 PM for lunch", "Enroll in a non-work local pottery class"]
        },
        relationalLife: {
          strengths: ["Superb active listener", "Always supports and builds up the team leadership", "Extremely dependable teammate"],
          needsImprovement: ["Reluctant to ask for help when overwhelmed", "Takes responsibility for others' shortcomings", "Hesitant to challenge poor work habits in peers"],
          suggestedActionPoints: ["Delegate 3 admin tasks to support staff", "Practice clear boundaries on role descriptions", "Read 'Fierce Conversations' and outline strategies"]
        },
        ministryEffectiveness: {
          strengths: ["Flawless coordination of national operations", "Brings absolute clarity to complex logistics", "Exceptional volunteer onboarding pipelines"],
          needsImprovement: ["Prone to over-polishing spreadsheets/slides", "Balancing long-term planning with daily requests", "Training other coordinators in database tools"],
          suggestedActionPoints: ["Set a time-limit for non-crucial presentation slides", "Allocate 20% of work week to high-level system strategy", "Record 5 quick video tutorials for other coordinators"]
        },
        updatedAt: Date.now() - 3600 * 24 * 8 * 1000,
        lastUpdatedBy: "Anna Coordinator"
      },
      // Peter Field Officer - 1st Quarter - Submitted
      {
        id: "bypass_peter_field_example_com_1st_2025-2026",
        userId: "bypass_peter_field_example_com",
        quarter: "1st",
        year: "2025-2026",
        status: "Submitted",
        staffMemberName: "Peter Field Officer",
        ministryAssignment: "Rural Evangelism & Field Operations",
        supervisorName: "Sarah Leader",
        monthsCovered: "July - October 2025",
        heart: {
          strengths: ["Deep passion for reaching unreached communities", "Consistent prayer life even in challenging field conditions", "Humble servant leadership among villagers"],
          needsImprovement: ["Rarely shares personal spiritual struggles with team", "Occasionally skips devotional time during travel", "Struggles to find mentors in remote locations"],
          suggestedActionPoints: ["Schedule monthly video calls with a spiritual mentor", "Carry a pocket devotional journal during field trips", "Share one vulnerability in each team meeting"]
        },
        personalLife: {
          strengths: ["Adapts well to艰苦 field conditions", "Excellent at living simply and within means", "Strong physical stamina for demanding travel"],
          needsImprovement: ["Neglects regular medical checkups due to schedule", "Inconsistent exercise routine when in remote areas", "Difficulty maintaining work-life boundaries during harvest seasons"],
          suggestedActionPoints: ["Schedule quarterly health checkups regardless of schedule", "Pack resistance bands for hotel room workouts", "Set firm return dates from field assignments"]
        },
        relationalLife: {
          strengths: ["Builds deep trust with local community leaders", "Excellent cross-cultural communication skills", "Patient mediator in team disagreements"],
          needsImprovement: ["Tends to work in isolation rather than collaborating", "Slow to report field challenges to leadership", "Limited interaction with office-based colleagues"],
          suggestedActionPoints: ["Send weekly field updates to the team", "Attend at least 2 virtual team meetings per month", "Invite a colleague on one field trip per quarter"]
        },
        ministryEffectiveness: {
          strengths: ["Established 3 new village contact points this quarter", "Strong rapport with local church pastors", "Creative use of storytelling in evangelism"],
          needsImprovement: ["Incomplete field activity documentation", "Needs better systems for tracking new believer follow-up", "Strategic planning for sustained village engagement"],
          suggestedActionPoints: ["Complete field reports within 48 hours of each visit", "Implement a simple follow-up tracking spreadsheet", "Draft a 6-month village engagement plan with coach"]
        },
        updatedAt: Date.now() - 3600 * 24 * 10 * 1000,
        lastUpdatedBy: "Peter Field Officer"
      }
    ];
    localStorage.setItem("staff_review_bypass_reviews", JSON.stringify(mockReviews));

    // 4. Summaries:
    const mockSummaries: QuarterlySummary[] = [
      // John Staff - 1st Quarter - CoachSubmitted (fully evaluated)
      {
        id: "bypass_john_staff_example_com_1st_2025-2026_summary",
        userId: "bypass_john_staff_example_com",
        status: "CoachSubmitted",
        coachUid: "bypass_leader_example_com",
        coachName: "Sarah Leader",
        quarter: "1st",
        year: "2025-2026",
        date: new Date(Date.now() - 3600 * 24 * 3 * 1000).toISOString().split("T")[0],
        staffName: "John Staff",
        teamLeaderName: "Sarah Leader",
        dateJoinedStaff: "2023-05-15",
        reviewerNamePosition: "Sarah Leader (Regional Coordinator)",
        supervisedBySince: "2024-01-01",
        presentPositionSince: "2023-06-01",
        position: "Ministry Coordinator",
        suggestions: [
          "I recommend providing more collaborative spaces for leaders across different zones to share resource packages.",
          "We could simplify the volunteer screening form to speed up our welcome pipeline."
        ],
        pdp: {
          heart: {
            goal: "Establish consistent, deep devotional habits daily",
            desiredResult: "30 minutes of undisturbed prayer and bible reading every morning before starting work",
            progressMade: "Managed about 4 days a week on average, but saw a massive difference on days completed.",
            changesNeeded: "Keep phone completely turned off in another room during the first hour of the day."
          },
          personalLife: {
            goal: "Consistently protect personal boundaries and family time",
            desiredResult: "At least one full rest day with absolutely zero work emails/Slack checking",
            progressMade: "Saturdays have been kept almost entirely clean of work interaction.",
            changesNeeded: "Explain boundaries explicitly to key student leaders so they respect weekend hours."
          },
          relationalLife: {
            goal: "Develop confidence in initiating healthy crucial conversations",
            desiredResult: "Directly resolve team tensions or volunteer friction within 48 hours instead of delaying",
            progressMade: "Had a positive discussion with our local volunteer leader regarding late event prep.",
            changesNeeded: "Practice scripting the first two opening lines before the meeting to stay calm and structured."
          }
        },
        cmo: [
          {
            objective: "Launch 2 brand new small-group fellowships",
            desiredResult: "15+ active student attendees participating in weekly sessions across both groups",
            progressMade: "Groups successfully launched! We currently have 18 registered and active students.",
            changesNeeded: "Encourage 2 senior students to co-lead so we build an active handoff plan.",
            percentageAchieved: 100
          },
          {
            objective: "Host the annual Fall Welcome Outreach Drive",
            desiredResult: "Reach 500 freshman contacts and follow up with at least 150 within 5 days",
            progressMade: "Reached 520 students, followed up with 110. Great team effort, but follow-up was delayed.",
            changesNeeded: "Automate the initial follow-up welcome text via email-to-sms templates.",
            percentageAchieved: 80
          }
        ],
        kda: [
          {
            assignment: "Coordinate student leadership training cohort",
            progressMade: "Ran 4 separate modules covering basic discipleship. 12 student leaders graduated.",
            changesNeeded: "Start the registration and manual printing process one week earlier next season."
          }
        ],
        evaluation: {
          overallEffectiveness: "One of the best",
          strengths: ["Exceptional spiritual leadership among students", "Highly organized event coordination", "Deep relational investment in volunteer development"],
          weaknesses: ["Occasional delays in administrative reporting", "Reluctance to delegate low-visibility tasks", "Needs to develop more strategic long-term ministry goals"],
          lackConfidence: "Financial budgeting and expense tracking",
          readyForGreaterResp: "Yes",
          greaterRespDetails: { position: "Campus Ministry Director", when: "Start of next fiscal year" },
          recommendReassignment: "No",
          reassignmentDetails: { positionLocation: "", why: "" },
          teamLeaderSignature: "Sarah Leader",
          teamLeaderSignatureDate: new Date(Date.now() - 3600 * 24 * 3 * 1000).toISOString().split("T")[0],
          formReviewedByNameSigDate: "Lewis KB (Admin) - Approved",
          formReviewedBy: "bypass_lewikb13_gmail_com",
          formReviewedByDate: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString().split("T")[0]
        },
        updatedAt: Date.now() - 3600 * 24 * 2 * 1000
      },
      // Anna Coordinator - 1st Quarter - CoachSubmitted (fully evaluated)
      {
        id: "bypass_anna_coordinator_example_com_1st_2025-2026_summary",
        userId: "bypass_anna_coordinator_example_com",
        status: "CoachSubmitted",
        coachUid: "bypass_leader_example_com",
        coachName: "Sarah Leader",
        quarter: "1st",
        year: "2025-2026",
        date: new Date(Date.now() - 3600 * 24 * 7 * 1000).toISOString().split("T")[0],
        staffName: "Anna Coordinator",
        teamLeaderName: "Sarah Leader",
        dateJoinedStaff: "2021-08-01",
        reviewerNamePosition: "Sarah Leader (Regional Coordinator)",
        supervisedBySince: "2022-01-01",
        presentPositionSince: "2021-09-01",
        position: "National Coordinator",
        suggestions: [
          "More budget allocated to database automation scripts will save coordinators roughly 5 hours weekly.",
          "We need a centralized repository for sharing meeting minutes with regional heads."
        ],
        pdp: {
          heart: {
            goal: "Maintain peace and focus amid heavy logistics schedules",
            desiredResult: "Spend 20 mins daily doing reflective silence and devotional tracking",
            progressMade: "Outstanding. Anna has established a serene workspace routine that is inspiring.",
            changesNeeded: "Keep protecting morning schedule from early phone calls."
          },
          personalLife: {
            goal: "Establish clear evening work boundaries",
            desiredResult: "Zero work calls after 6 PM, focus on hobbies and recovery",
            progressMade: "Extremely consistent. Anna reported much higher energy levels and clearer thinking.",
            changesNeeded: "Continue using do-not-disturb automated phone schedules."
          },
          relationalLife: {
            goal: "Constructive feedback delivery to administrative support staff",
            desiredResult: "Provide 1-on-1 development reviews for our assistants with clear action logs",
            progressMade: "Successfully conducted reviews with both support team members.",
            changesNeeded: "Create a simple template for them to self-rate before meeting."
          }
        },
        cmo: [
          {
            objective: "Coordinate the National Leaders Conference",
            desiredResult: "250+ delegates registered, perfect logistics scoring above 90% in surveys",
            progressMade: "Exceeded all expectations! 280 attended, logistics review scored 96% positive.",
            changesNeeded: "Source catering vendors earlier to negotiate a 10% volume discount.",
            percentageAchieved: 100
          },
          {
            objective: "Migrate database to the new central server",
            desiredResult: "Clean transition with zero data loss and all regional logins verified",
            progressMade: "Migration complete. Data verified. 3 accounts required login troubleshooting.",
            changesNeeded: "Send out simple, clear self-reset instructions in advance next time.",
            percentageAchieved: 95
          }
        ],
        kda: [
          {
            assignment: "Revamp National Internship Guidebook",
            progressMade: "Finished draft, secured design signoff, and printed 200 copies.",
            changesNeeded: "Collaborate earlier with local printer to ensure fast delivery."
          }
        ],
        evaluation: {
          overallEffectiveness: "One of the best",
          strengths: ["Flawless administrative detail", "Exceptional crisis coordination", "Encouraging and team-focused demeanor"],
          weaknesses: ["Takes on too much responsibility directly", "Reluctance to push back on unrealistic deadlines", "Over-formatting administrative sheets"],
          lackConfidence: "Technical server setup and API routing",
          readyForGreaterResp: "Yes",
          greaterRespDetails: {
            position: "Director of National Operations",
            when: "Next fiscal year budget approval"
          },
          recommendReassignment: "No",
          reassignmentDetails: { positionLocation: "", why: "" },
          teamLeaderSignature: "Sarah Leader",
          teamLeaderSignatureDate: new Date(Date.now() - 3600 * 24 * 7 * 1000).toISOString().split("T")[0],
          formReviewedByNameSigDate: "Lewis KB (Admin) - Approved on " + new Date(Date.now() - 3600 * 24 * 6 * 1000).toLocaleDateString(),
          formReviewedBy: "bypass_lewikb13_gmail_com",
          formReviewedByDate: new Date(Date.now() - 3600 * 24 * 6 * 1000).toISOString().split("T")[0]
        },
        updatedAt: Date.now() - 3600 * 24 * 6 * 1000
      },
      // Peter Field Officer - 1st Quarter - Submitted (awaiting coach evaluation)
      {
        id: "bypass_peter_field_example_com_1st_2025-2026_summary",
        userId: "bypass_peter_field_example_com",
        status: "Submitted",
        coachUid: "bypass_leader_example_com",
        coachName: "Sarah Leader",
        quarter: "1st",
        year: "2025-2026",
        date: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString().split("T")[0],
        staffName: "Peter Field Officer",
        teamLeaderName: "Sarah Leader",
        dateJoinedStaff: "2020-03-10",
        reviewerNamePosition: "Sarah Leader (Regional Coordinator)",
        supervisedBySince: "2023-06-01",
        presentPositionSince: "2022-01-01",
        position: "Field Representative",
        suggestions: [
          "We need better mobile connectivity in remote village assignment areas to enable real-time reporting.",
          "A shared resource library for field evangelism materials would save significant preparation time."
        ],
        pdp: {
          heart: {
            goal: "Deepen consistency in personal devotional life during field travel",
            desiredResult: "Daily devotional time maintained even during heavy travel days",
            progressMade: "Improved to 5 days a week on average. Field travel still disrupts routine.",
            changesNeeded: "Prepare audio devotionals for travel days when reading isn't practical."
          },
          personalLife: {
            goal: "Establish regular health and fitness routine despite field conditions",
            desiredResult: "Exercise at least 3 times per week regardless of location",
            progressMade: "Managed consistent exercise when in urban areas. Rural assignments break the routine.",
            changesNeeded: "Research bodyweight exercises that require no equipment for remote locations."
          },
          relationalLife: {
            goal: "Improve regular communication with home office team",
            desiredResult: "Weekly written updates sent every Friday without fail",
            progressMade: "Sent updates 3 out of 4 weeks. Missed one during a particularly remote assignment.",
            changesNeeded: "Set a recurring phone reminder for Friday 4 PM to send updates before connectivity drops."
          }
        },
        cmo: [
          {
            objective: "Establish 5 new village evangelism contact points",
            desiredResult: "Active relationships with 5 village leaders and regular gospel presentations scheduled",
            progressMade: "Successfully established contact with 3 villages. 2 more are in early conversations.",
            changesNeeded: "Partner with a local church pastor in each target village for ongoing follow-up.",
            percentageAchieved: 60
          }
        ],
        kda: [
          {
            assignment: "Develop Rural Field Operations Handbook",
            progressMade: "Draft outline completed. Gathered input from 4 field workers.",
            changesNeeded: "Schedule interviews with 3 more experienced field workers for case studies."
          }
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
        updatedAt: Date.now() - 3600 * 24 * 2 * 1000
      }
    ];
    localStorage.setItem("staff_review_bypass_summaries", JSON.stringify(mockSummaries));

    // 5. Meetings:
    const mockMeetings = [
      {
        id: "meet_john_1",
        staffUid: "bypass_john_staff_example_com",
        staffName: "John Staff",
        coachUid: "bypass_leader_example_com",
        coachName: "Sarah Leader",
        date: "2026-07-20",
        time: "10:00",
        topic: "1st Quarter Development Review Discussion",
        status: "Scheduled",
        notes: "Let's review the strengths and action points in the Heart and Ministry sections.",
        createdAt: Date.now()
      },
      {
        id: "meet_anna_1",
        staffUid: "bypass_anna_coordinator_example_com",
        staffName: "Anna Coordinator",
        coachUid: "bypass_leader_example_com",
        coachName: "Sarah Leader",
        date: "2026-07-12",
        time: "14:00",
        topic: "Quarterly Evaluation Compilation Meeting",
        status: "Completed",
        notes: "Completed the evaluation compilation. Anna is doing an outstanding job.",
        createdAt: Date.now() - 3600 * 24 * 4 * 1000
      }
    ];
    localStorage.setItem("staff_review_bypass_meetings", JSON.stringify(mockMeetings));

    // 6. Follow-up tasks:
    const mockTasks: FollowUpTask[] = [
      {
        id: "task_john_heart",
        focus: "1.Heart (Sabbath Day Reflection)",
        coachLeader: "Sarah Leader",
        coaches: ["Sarah Leader", "John Staff"],
        currentStage: "Pre event",
        status: "In progress",
        dueDate: "October, 2026",
        coordinatorFollowup: "John has scheduled a quiet weekend reflection day on his calendar.",
        updatedAt: Date.now(),
        userId: "bypass_john_staff_example_com",
        staffName: "John Staff",
        quarter: "1st",
        year: "2025-2026"
      },
      {
        id: "task_john_ministry",
        focus: "4. Ministry (Expense reports)",
        coachLeader: "Sarah Leader",
        coaches: ["Sarah Leader"],
        currentStage: "Post event",
        status: "Completed",
        dueDate: "September, 2026",
        coordinatorFollowup: "John met with the admin team and successfully resolved all outstanding receipts.",
        updatedAt: Date.now(),
        userId: "bypass_john_staff_example_com",
        staffName: "John Staff",
        quarter: "1st",
        year: "2025-2026"
      }
    ];
    localStorage.setItem("staff_review_bypass_followup_tasks", JSON.stringify(mockTasks));

    // 7. Activity logs:
    const mockLogs: ActivityLog[] = [
      {
        id: "log_1",
        userId: "bypass_john_staff_example_com",
        staffName: "John Staff",
        editedBy: "John Staff",
        editorUid: "bypass_john_staff_example_com",
        activityType: "review",
        quarter: "1st",
        year: "2025-2026",
        action: "Submitted Form",
        timestamp: Date.now() - 3600 * 24 * 5 * 1000
      },
      {
        id: "log_2",
        userId: "bypass_john_staff_example_com",
        staffName: "John Staff",
        editedBy: "Sarah Leader",
        editorUid: "bypass_leader_example_com",
        activityType: "summary",
        quarter: "1st",
        year: "2025-2026",
        action: "Evaluation Submitted to Admin",
        timestamp: Date.now() - 3600 * 24 * 2 * 1000
      },
      {
        id: "log_3",
        userId: "bypass_anna_coordinator_example_com",
        staffName: "Anna Coordinator",
        editedBy: "Sarah Leader",
        editorUid: "bypass_leader_example_com",
        activityType: "summary",
        quarter: "1st",
        year: "2025-2026",
        action: "Compiled Summary (Evaluation Submitted)",
        timestamp: Date.now() - 3600 * 24 * 6 * 1000
      },
      {
        id: "log_4",
        userId: "bypass_anna_coordinator_example_com",
        staffName: "Anna Coordinator",
        editedBy: "Lewis KB",
        editorUid: "bypass_lewikb13_gmail_com",
        activityType: "summary",
        quarter: "1st",
        year: "2025-2026",
        action: "Admin Approved Evaluation",
        timestamp: Date.now() - 3600 * 24 * 6 * 1000
      },
      {
        id: "log_5",
        userId: "bypass_peter_field_example_com",
        staffName: "Peter Field Officer",
        editedBy: "Peter Field Officer",
        editorUid: "bypass_peter_field_example_com",
        activityType: "review",
        quarter: "1st",
        year: "2025-2026",
        action: "Submitted Form",
        timestamp: Date.now() - 3600 * 24 * 10 * 1000
      },
      {
        id: "log_6",
        userId: "bypass_peter_field_example_com",
        staffName: "Peter Field Officer",
        editedBy: "Peter Field Officer",
        editorUid: "bypass_peter_field_example_com",
        activityType: "summary",
        quarter: "1st",
        year: "2025-2026",
        action: "Submitted to Coach",
        timestamp: Date.now() - 3600 * 24 * 2 * 1000
      }
    ];
    localStorage.setItem("staff_review_bypass_activity_logs", JSON.stringify(mockLogs));
  };

  const clearMockDataFromLocalStorage = () => {
    localStorage.removeItem("staff_review_bypass_reviews");
    localStorage.removeItem("staff_review_bypass_summaries");
    localStorage.removeItem("staff_review_bypass_meetings");
    localStorage.removeItem("staff_review_bypass_followup_tasks");
    localStorage.removeItem("staff_review_bypass_coaching_requests");
    localStorage.removeItem("staff_review_bypass_activity_logs");
    localStorage.removeItem("staff_review_bypass_users");
  };

  const handleBypassLogin = (email: string, name: string, role: string, isLeader: boolean, isAdminPriv?: boolean) => {
    const fallbackProfile: UserProfile = {
      uid: "bypass_" + email.replace(/[@.]/g, "_"),
      name,
      role,
      email,
      isLeader: isLeader || email === "lewikb13@gmail.com",
      isAdmin: isAdminPriv || email === "lewikb13@gmail.com",
      createdAt: Date.now()
    };

    if (useMockData) {
      seedMockDataToLocalStorage();
    } else {
      clearMockDataFromLocalStorage();
    }

    localStorage.setItem("staff_review_bypass_user", JSON.stringify(fallbackProfile));
    setUser(fallbackProfile);
  };

  const handleLogout = async () => {
    localStorage.removeItem("staff_review_bypass_user");
    await supabaseSignOut();
    setUser(null);
    setCurrentTab("my-reviews");
  };

  // Coaching Nomination and Invitation Handlers
  const handleAddCoachingRequest = async (coachName: string) => {
    if (!user) return;
    const requestId = `req_${user.uid}_${encodeURIComponent(coachName)}`;
    const newReq: CoachingRequest = {
      id: requestId,
      memberId: user.uid,
      memberName: user.name,
      memberEmail: user.email,
      coachName: coachName,
      status: "pending",
      acceptedByCoach: "pending",
      updatedAt: Date.now()
    };

    // Auto-fill coachUid if the nominee is already a registered user
    const matchedCoach = staffProfiles.find(u => u.name.toLowerCase() === coachName.toLowerCase());
    if (matchedCoach) {
      newReq.coachUid = matchedCoach.uid;
    }

    if (user.uid.startsWith("bypass_")) {
      const localCoachingStr = localStorage.getItem("staff_review_bypass_coaching_requests") || "[]";
      const localCoaching = JSON.parse(localCoachingStr) as CoachingRequest[];
      localCoaching.push(newReq);
      localStorage.setItem("staff_review_bypass_coaching_requests", JSON.stringify(localCoaching));
      setCoachingRequests(localCoaching);
      return;
    }

    await dataSaveCoachingRequest(newReq);
  };

  const handleNominateInModal = async (coachName: string) => {
    setModalError("");
    const trimmed = coachName.trim();
    if (!trimmed) return;

    if (user && trimmed.toLowerCase() === user.name.toLowerCase()) {
      setModalError("Validation Error: You cannot nominate yourself as your own coach.");
      return;
    }

    const userNominations = coachingRequests.filter(req => req.memberId === user?.uid);
    if (userNominations.some(r => r.coachName.toLowerCase() === trimmed.toLowerCase())) {
      setModalError("Validation Error: You have already nominated this coach.");
      return;
    }

    if (userNominations.length >= 1) {
      setModalError("Validation Error: You can only nominate exactly 1 coach or TL.");
      return;
    }

    try {
      await handleAddCoachingRequest(trimmed);
      setModalSearchName("");
      setShowModalSuggestions(false);
    } catch (e: any) {
      setModalError(e.message || "Failed to submit coaching nomination.");
    }
  };

  const handleDeleteCoachingRequest = async (requestId: string) => {
    if (!user) return;
    if (user.uid.startsWith("bypass_")) {
      const localCoachingStr = localStorage.getItem("staff_review_bypass_coaching_requests") || "[]";
      const localCoaching = JSON.parse(localCoachingStr) as CoachingRequest[];
      const filtered = localCoaching.filter(req => req.id !== requestId);
      localStorage.setItem("staff_review_bypass_coaching_requests", JSON.stringify(filtered));
      setCoachingRequests(filtered);
      return;
    }

    await dataDeleteCoachingRequest(requestId);
  };

  const handleApproveCoachingRequest = async (requestId: string) => {
    if (!user) return;
    if (user.uid.startsWith("bypass_")) {
      const localCoachingStr = localStorage.getItem("staff_review_bypass_coaching_requests") || "[]";
      const localCoaching = JSON.parse(localCoachingStr) as CoachingRequest[];
      const updated = localCoaching.map(req => {
        if (req.id === requestId) {
          return { ...req, status: "approved" as const, updatedAt: Date.now() };
        }
        return req;
      });
      localStorage.setItem("staff_review_bypass_coaching_requests", JSON.stringify(updated));
      setCoachingRequests(updated);
      return;
    }

    await dataUpdateCoachingRequest(requestId, { status: "approved" });
  };

  const handleRejectCoachingRequest = async (requestId: string, reason: string) => {
    if (!user) return;
    if (user.uid.startsWith("bypass_")) {
      const localCoachingStr = localStorage.getItem("staff_review_bypass_coaching_requests") || "[]";
      const localCoaching = JSON.parse(localCoachingStr) as CoachingRequest[];
      const updated = localCoaching.map(req => {
        if (req.id === requestId) {
          return { ...req, status: "rejected" as const, adminNotes: reason, updatedAt: Date.now() };
        }
        return req;
      });
      localStorage.setItem("staff_review_bypass_coaching_requests", JSON.stringify(updated));
      setCoachingRequests(updated);
      return;
    }

    await dataUpdateCoachingRequest(requestId, { status: "rejected", adminNotes: reason });
  };

  const handleAcceptCoachingInvitation = async (requestId: string) => {
    if (!user) return;
    if (user.uid.startsWith("bypass_")) {
      const localCoachingStr = localStorage.getItem("staff_review_bypass_coaching_requests") || "[]";
      const localCoaching = JSON.parse(localCoachingStr) as CoachingRequest[];
      const updated = localCoaching.map(req => {
        if (req.id === requestId) {
          return { ...req, acceptedByCoach: "accepted" as const, coachUid: user.uid, updatedAt: Date.now() };
        }
        return req;
      });
      localStorage.setItem("staff_review_bypass_coaching_requests", JSON.stringify(updated));
      setCoachingRequests(updated);

      // Promote nominee to leader locally
      const localUsersStr = localStorage.getItem("staff_review_bypass_users") || "[]";
      let localUsers = JSON.parse(localUsersStr) as UserProfile[];
      localUsers = localUsers.map(u => u.uid === user.uid ? { ...u, isLeader: true } : u);
      localStorage.setItem("staff_review_bypass_users", JSON.stringify(localUsers));
      setStaffProfiles(localUsers);

      const savedLocalUser = localStorage.getItem("staff_review_bypass_user");
      if (savedLocalUser) {
        const uObj = JSON.parse(savedLocalUser);
        if (uObj.uid === user.uid) {
          uObj.isLeader = true;
          localStorage.setItem("staff_review_bypass_user", JSON.stringify(uObj));
          setUser(prev => prev ? { ...prev, isLeader: true } : null);
        }
      }
      return;
    }

    await dataUpdateCoachingRequest(requestId, { acceptedByCoach: "accepted", coachUid: user.uid });

    await dataUpdateUserProfile(user.uid, { isLeader: true });
    setUser(prev => prev ? { ...prev, isLeader: true } : null);
  };

  const handleRejectCoachingInvitation = async (requestId: string, reason: string) => {
    if (!user) return;
    if (user.uid.startsWith("bypass_")) {
      const localCoachingStr = localStorage.getItem("staff_review_bypass_coaching_requests") || "[]";
      const localCoaching = JSON.parse(localCoachingStr) as CoachingRequest[];
      const updated = localCoaching.map(req => {
        if (req.id === requestId) {
          return { ...req, acceptedByCoach: "rejected" as const, coachRejectReason: reason, coachUid: user.uid, updatedAt: Date.now() };
        }
        return req;
      });
      localStorage.setItem("staff_review_bypass_coaching_requests", JSON.stringify(updated));
      setCoachingRequests(updated);
      return;
    }

    await dataUpdateCoachingRequest(requestId, { acceptedByCoach: "rejected", coachRejectReason: reason, coachUid: user.uid });
  };

  // Create or retrieve existing Development Review form
  const handleSelectMyReview = async (quarter: "1st" | "2nd" | "3rd") => {
    if (!user) return;
    const year = "2025/2026";
    const reviewId = `${user.uid}_${quarter}_${year.replace("/", "-")}`;
    
    if (user.uid.startsWith("bypass_")) {
      const localReviewsStr = localStorage.getItem("staff_review_bypass_reviews") || "[]";
      const localReviews = JSON.parse(localReviewsStr) as DevelopmentReview[];
      const existing = localReviews.find(r => r.id === reviewId);
      if (existing) {
        setActiveReview(existing);
      } else {
        const newReview = createNewReview(user.uid, quarter, year, user.name, user.role);
        localReviews.push(newReview);
        localStorage.setItem("staff_review_bypass_reviews", JSON.stringify(localReviews));
        setMyReviews(localReviews.filter(r => r.userId === user.uid));
        if (user.isLeader) {
          setAllReviews(localReviews);
        }
        setActiveReview(newReview);
      }
      return;
    }

    const existingReview = await dataGetReviewById(reviewId);

    if (existingReview) {
      setActiveReview(existingReview);
    } else {
      // Setup a brand new structured form matching PDF specifications exactly
      const newReview = createNewReview(user.uid, quarter, year, user.name, user.role);
      await dataSaveReview(newReview);
      setActiveReview(newReview);
    }
  };

  // Lead Evaluator: Create or retrieve a member's Development Review form
  const handleSelectStaffReview = async (member: UserProfile, quarter: "1st" | "2nd" | "3rd") => {
    const year = "2025/2026";
    const reviewId = `${member.uid}_${quarter}_${year.replace("/", "-")}`;
    
    if (user && user.uid.startsWith("bypass_")) {
      const localReviewsStr = localStorage.getItem("staff_review_bypass_reviews") || "[]";
      const localReviews = JSON.parse(localReviewsStr) as DevelopmentReview[];
      const existing = localReviews.find(r => r.id === reviewId);
      if (existing) {
        setActiveReview(existing);
      } else {
        const newReview = createNewReview(member.uid, quarter, year, member.name, member.role);
        localReviews.push(newReview);
        localStorage.setItem("staff_review_bypass_reviews", JSON.stringify(localReviews));
        if (member.uid === user.uid) {
          setMyReviews(localReviews.filter(r => r.userId === user.uid));
        }
        setAllReviews(localReviews);
        setActiveReview(newReview);
      }
      return;
    }

    const existingReview = await dataGetReviewById(reviewId);

    if (existingReview) {
      setActiveReview(existingReview);
    } else {
      const newReview = createNewReview(member.uid, quarter, year, member.name, member.role);
      await dataSaveReview(newReview);
      setActiveReview(newReview);
    }
  };

  // Lead Evaluator: Create or retrieve a member's Quarterly Summary Form
  const handleSelectStaffSummary = async (member: UserProfile, quarter: "1st" | "2nd" | "3rd") => {
    const year = "2025/2026";
    
    // Check if the current user is a coach for this member (and not the member themselves)
    const coaches = coachesMap.get(member.uid) || [];
    const isCoachOfMember = coaches.some(c => c.coachUid === user?.uid);
    const isCoach = user && user.uid !== member.uid && (isAdmin || isCoachOfMember);
    
    // Determine the document ID we want to open/save
    const summaryId = isCoach 
      ? `${member.uid}_${quarter}_${year.replace("/", "-")}_${user.uid}_summary`
      : `${member.uid}_${quarter}_${year.replace("/", "-")}_summary`;
      
    if (user && user.uid.startsWith("bypass_")) {
      const localSummariesStr = localStorage.getItem("staff_review_bypass_summaries") || "[]";
      const localSummaries = JSON.parse(localSummariesStr) as QuarterlySummary[];
      let existing = localSummaries.find(s => s.id === summaryId);
      
      if (!existing && isCoach) {
        // If coach's evaluation doesn't exist yet, try to load the member's base summary as a starting point
        const baseSummaryId = `${member.uid}_${quarter}_${year.replace("/", "-")}_summary`;
        const baseSummary = localSummaries.find(s => s.id === baseSummaryId);
        
        if (baseSummary) {
          // Clone the member's summary but reset evaluation fields for this coach
          existing = {
            ...baseSummary,
            id: summaryId,
            coachUid: user.uid,
            coachName: user.name,
            status: "Submitted", // Member has submitted
            evaluation: {
              ...createNewSummary(member.uid, quarter, year, member.name, member.role).evaluation,
              teamLeaderSignature: user.name,
              teamLeaderSignatureDate: new Date().toISOString().split("T")[0]
            }
          };
          localSummaries.push(existing);
          localStorage.setItem("staff_review_bypass_summaries", JSON.stringify(localSummaries));
        }
      }
      
      if (existing) {
        setActiveSummary(existing);
        setActiveSummaryStaffName(member.name);
      } else {
        const newSummary = createNewSummary(member.uid, quarter, year, member.name, member.role);
        if (isCoach) {
          newSummary.id = summaryId;
          newSummary.coachUid = user.uid;
          newSummary.coachName = user.name;
          newSummary.status = "Submitted";
          newSummary.evaluation.teamLeaderSignature = user.name;
          newSummary.evaluation.teamLeaderSignatureDate = new Date().toISOString().split("T")[0];
        }
        localSummaries.push(newSummary);
        localStorage.setItem("staff_review_bypass_summaries", JSON.stringify(localSummaries));
        if (member.uid === user.uid) {
          setMySummaries(localSummaries.filter(s => s.userId === user.uid));
        }
        setAllSummaries(localSummaries);
        setActiveSummary(newSummary);
        setActiveSummaryStaffName(member.name);
      }
      return;
    }

    const existingSummary = await dataGetSummaryById(summaryId);

    if (existingSummary) {
      setActiveSummary(existingSummary);
      setActiveSummaryStaffName(member.name);
    } else if (isCoach) {
      // Coach doesn't have an evaluation doc yet. Let's fetch the member's base summary first
      const baseSummaryId = `${member.uid}_${quarter}_${year.replace("/", "-")}_summary`;
      const baseSummary = await dataGetSummaryById(baseSummaryId);
      
      if (baseSummary) {
        const newCoachSummary: QuarterlySummary = {
          ...baseSummary,
          id: summaryId,
          coachUid: user.uid,
          coachName: user.name,
          status: "Submitted", // Member has submitted
          evaluation: {
            ...createNewSummary(member.uid, quarter, year, member.name, member.role).evaluation,
            teamLeaderSignature: user.name,
            teamLeaderSignatureDate: new Date().toISOString().split("T")[0]
          }
        };
        await dataSaveSummary(newCoachSummary);
        setActiveSummary(newCoachSummary);
        setActiveSummaryStaffName(member.name);
      } else {
        // Fallback: If member hasn't started yet, create a blank template
        const newSummary = createNewSummary(member.uid, quarter, year, member.name, member.role);
        newSummary.id = summaryId;
        newSummary.coachUid = user.uid;
        newSummary.coachName = user.name;
        newSummary.status = "Draft";
        newSummary.evaluation.teamLeaderSignature = user.name;
        newSummary.evaluation.teamLeaderSignatureDate = new Date().toISOString().split("T")[0];
        await dataSaveSummary(newSummary);
        setActiveSummary(newSummary);
        setActiveSummaryStaffName(member.name);
      }
    } else {
      const newSummary = createNewSummary(member.uid, quarter, year, member.name, member.role);
      await dataSaveSummary(newSummary);
      setActiveSummary(newSummary);
      setActiveSummaryStaffName(member.name);
    }
  };

  // Helper to log activities
  const logActivity = async (
    userId: string,
    staffName: string,
    activityType: "review" | "summary",
    quarter: "1st" | "2nd" | "3rd",
    year: string,
    action: string
  ) => {
    if (!user) return;
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newLog: ActivityLog = {
      id: logId,
      userId,
      staffName,
      editedBy: user.name,
      editorUid: user.uid,
      activityType,
      quarter,
      year,
      action,
      timestamp: Date.now()
    };

    if (user.uid.startsWith("bypass_")) {
      const localLogsStr = localStorage.getItem("staff_review_bypass_activity_logs") || "[]";
      const localLogs = JSON.parse(localLogsStr) as ActivityLog[];
      localLogs.push(newLog);
      localStorage.setItem("staff_review_bypass_activity_logs", JSON.stringify(localLogs));
      setActivityLogs(localLogs);
      return;
    }

    try {
      await dataSaveActivityLog(newLog);
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  };

  const handleClearLogs = async () => {
    if (!user) return;
    if (user.uid.startsWith("bypass_")) {
      localStorage.setItem("staff_review_bypass_activity_logs", "[]");
      setActivityLogs([]);
      return;
    }

    try {
      await dataDeleteAllActivityLogs();
    } catch (e) {
      console.error("Failed to clear logs:", e);
    }
  };

  // Save changes on active review
  const handleSaveReview = async (updated: DevelopmentReview) => {
    const action = updated.status === "Submitted" ? "Submitted Final Review" : "Saved Review Progress Draft";

    if (user && user.uid.startsWith("bypass_")) {
      const localReviewsStr = localStorage.getItem("staff_review_bypass_reviews") || "[]";
      const localReviews = JSON.parse(localReviewsStr) as DevelopmentReview[];
      const index = localReviews.findIndex(r => r.id === updated.id);
      if (index > -1) {
        localReviews[index] = updated;
      } else {
        localReviews.push(updated);
      }
      localStorage.setItem("staff_review_bypass_reviews", JSON.stringify(localReviews));
      
      setMyReviews(localReviews.filter(r => r.userId === user.uid));
      if (user.isLeader) {
        setAllReviews(localReviews);
      }
      setActiveReview(updated);
      await logActivity(updated.userId, updated.staffMemberName, "review", updated.quarter, updated.year, action);
      
      if (updated.status === "Submitted" && updated.userId === user.uid) {
        setShowPostSubmitCoachingModal(true);
      }
      return;
    }

    await dataSaveReview(updated);
    setActiveReview(updated);
    await logActivity(updated.userId, updated.staffMemberName, "review", updated.quarter, updated.year, action);

    if (updated.status === "Submitted" && user && updated.userId === user.uid) {
      setShowPostSubmitCoachingModal(true);
    }
  };

  // Save changes on active summary
  const handleSaveSummary = async (updated: QuarterlySummary) => {
    const action = "Updated Quarterly Summary Evaluation";

    if (user && user.uid.startsWith("bypass_")) {
      const localSummariesStr = localStorage.getItem("staff_review_bypass_summaries") || "[]";
      const localSummaries = JSON.parse(localSummariesStr) as QuarterlySummary[];
      const index = localSummaries.findIndex(s => s.id === updated.id);
      if (index > -1) {
        localSummaries[index] = updated;
      } else {
        localSummaries.push(updated);
      }
      localStorage.setItem("staff_review_bypass_summaries", JSON.stringify(localSummaries));

      setMySummaries(localSummaries.filter(s => s.userId === user.uid));
      if (user.isLeader) {
        setAllSummaries(localSummaries);
      }
      setActiveSummary(updated);
      await logActivity(updated.userId, updated.staffName, "summary", updated.quarter, updated.year, action);
      return;
    }

    await dataSaveSummary(updated);
    setActiveSummary(updated);
    await logActivity(updated.userId, updated.staffName, "summary", updated.quarter, updated.year, action);
  };

  // Admin Quick Sign-Off on Completed Evaluations
  const handleAdminSignOff = async (summary: QuarterlySummary, memberName: string) => {
    if (!user || !isAdmin) return;
    
    const updatedEvaluation = {
      ...summary.evaluation,
      formReviewedBy: user.name,
      formReviewedByDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    };
    
    const updatedSummary: QuarterlySummary = {
      ...summary,
      evaluation: updatedEvaluation,
      updatedAt: Date.now()
    };
    
    const action = "Signed off on Compiled Evaluation summary (Admin)";
    
    if (user.uid.startsWith("bypass_")) {
      const localSummariesStr = localStorage.getItem("staff_review_bypass_summaries") || "[]";
      const localSummaries = JSON.parse(localSummariesStr) as QuarterlySummary[];
      const index = localSummaries.findIndex(s => s.id === updatedSummary.id);
      if (index > -1) {
        localSummaries[index] = updatedSummary;
      } else {
        localSummaries.push(updatedSummary);
      }
      localStorage.setItem("staff_review_bypass_summaries", JSON.stringify(localSummaries));

      setMySummaries(localSummaries.filter(s => s.userId === user.uid));
      setAllSummaries(localSummaries);
      await logActivity(updatedSummary.userId, updatedSummary.staffName, "summary", updatedSummary.quarter, updatedSummary.year, action);
      alert(`Success: Signed off on ${memberName}'s ${updatedSummary.quarter} Quarter evaluation!`);
      return;
    }

    try {
      await dataSaveSummary(updatedSummary);
      setAllSummaries(prev => prev.map(s => s.id === updatedSummary.id ? updatedSummary : s));
      await logActivity(updatedSummary.userId, updatedSummary.staffName, "summary", updatedSummary.quarter, updatedSummary.year, action);
      alert(`Success: Signed off on ${memberName}'s ${updatedSummary.quarter} Quarter evaluation!`);
    } catch (e) {
      console.error("Error signing off:", e);
      alert("Failed to save sign-off.");
    }
  };

  // Admin Bulk Sign-Off on Completed Evaluations
  const handleBulkAdminSignOff = async () => {
    if (!user || !isAdmin) return;

    const pending = allSummaries.filter(s => s.status === "CoachSubmitted" && (!s.evaluation || !s.evaluation.formReviewedBy));
    if (pending.length === 0) {
      alert("There are no pending evaluations awaiting admin sign-off.");
      return;
    }

    if (!confirm(`Are you sure you want to sign-off and approve ALL ${pending.length} pending evaluation reports in bulk?`)) {
      return;
    }

    const reviewedBy = user.name;
    const reviewedByDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    const action = "Signed off on Compiled Evaluation summary (Bulk Admin Approval)";

    if (user.uid.startsWith("bypass_")) {
      const localSummariesStr = localStorage.getItem("staff_review_bypass_summaries") || "[]";
      let localSummaries = JSON.parse(localSummariesStr) as QuarterlySummary[];

      const updatedSummaries = pending.map(summary => {
        const updatedEvaluation = {
          ...summary.evaluation,
          formReviewedBy: reviewedBy,
          formReviewedByDate: reviewedByDate
        };
        return {
          ...summary,
          evaluation: updatedEvaluation,
          updatedAt: Date.now()
        };
      });

      localSummaries = localSummaries.map(s => {
        const match = updatedSummaries.find(u => u.id === s.id);
        return match ? match : s;
      });

      localStorage.setItem("staff_review_bypass_summaries", JSON.stringify(localSummaries));
      setMySummaries(localSummaries.filter(s => s.userId === user.uid));
      setAllSummaries(localSummaries);

      for (const updatedSummary of updatedSummaries) {
        await logActivity(updatedSummary.userId, updatedSummary.staffName, "summary", updatedSummary.quarter, updatedSummary.year, action);
      }

      alert(`Success: Bulk signed off and approved ${pending.length} evaluation reports!`);
      return;
    }

    try {
      const updatedSummaries: QuarterlySummary[] = [];
      for (const summary of pending) {
        const updatedEvaluation = {
          ...summary.evaluation,
          formReviewedBy: reviewedBy,
          formReviewedByDate: reviewedByDate
        };
        const updatedSummary: QuarterlySummary = {
          ...summary,
          evaluation: updatedEvaluation,
          updatedAt: Date.now()
        };
        await dataSaveSummary(updatedSummary);
        await logActivity(updatedSummary.userId, updatedSummary.staffName, "summary", updatedSummary.quarter, updatedSummary.year, action);
        updatedSummaries.push(updatedSummary);
      }

      setAllSummaries(prev => prev.map(s => {
        const match = updatedSummaries.find(u => u.id === s.id);
        return match ? match : s;
      }));

      alert(`Success: Bulk signed off and approved ${pending.length} evaluation reports!`);
    } catch (e: any) {
      console.error("Error bulk signing off:", e);
      alert(`Failed to save bulk sign-offs: ${e.message}`);
    }
  };

  // Bulk Admin Decline selected reports
  const handleBulkAdminDecline = async (declineReason: string) => {
    if (!user || !isAdmin) return;
    if (!declineReason.trim()) {
      alert("Please provide a reason for declining the selected reports.");
      return;
    }

    const eligibleSummariesToDecline = selectedEvaluations.map(k => {
      const [uid, q] = k.split("_");
      return allSummaries.find(s => s.userId === uid && s.quarter === q);
    }).filter((s): s is QuarterlySummary => !!s && s.status !== "Declined");

    if (eligibleSummariesToDecline.length === 0) {
      alert("No valid pending evaluation reports were selected to decline.");
      return;
    }

    try {
      setBulkActionProgress({ total: eligibleSummariesToDecline.length, current: 0, type: "decline" });
      const updatedSummariesList = [...allSummaries];

      let completedCount = 0;
      for (const summary of eligibleSummariesToDecline) {
        const updatedSummary: QuarterlySummary = {
          ...summary,
          status: "Declined",
          declineReason: declineReason.trim(),
          declinedBy: user.name,
          declinedAt: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }),
          updatedAt: Date.now()
        };

        if (updatedSummary.evaluation) {
          updatedSummary.evaluation = {
            ...updatedSummary.evaluation,
            formReviewedBy: undefined,
            formReviewedByDate: undefined
          };
        }

        const action = `Bulk Declined evaluation summary: ${declineReason.trim()}`;

        if (user.uid.startsWith("bypass_")) {
          const index = updatedSummariesList.findIndex(s => s.id === updatedSummary.id);
          if (index > -1) {
            updatedSummariesList[index] = updatedSummary;
          } else {
            updatedSummariesList.push(updatedSummary);
          }
          await logActivity(updatedSummary.userId, updatedSummary.staffName, "summary", updatedSummary.quarter, updatedSummary.year, action);
        } else {
          await dataSaveSummary(updatedSummary);
          const index = updatedSummariesList.findIndex(s => s.id === updatedSummary.id);
          if (index > -1) {
            updatedSummariesList[index] = updatedSummary;
          }
          await logActivity(updatedSummary.userId, updatedSummary.staffName, "summary", updatedSummary.quarter, updatedSummary.year, action);
        }

        completedCount++;
        setBulkActionProgress(prev => ({ ...prev, current: completedCount }));
        // Add a small visual delay so progress transitions smoothly
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (user.uid.startsWith("bypass_")) {
        localStorage.setItem("staff_review_bypass_summaries", JSON.stringify(updatedSummariesList));
        setMySummaries(updatedSummariesList.filter(s => s.userId === user.uid));
      }

      setAllSummaries(updatedSummariesList);
      setSelectedEvaluations([]);
      setShowBulkDeclineModal(false);
      setBulkDeclineReason("");
      alert(`Success: Successfully bulk declined ${eligibleSummariesToDecline.length} selected evaluation reports!`);
    } catch (e: any) {
      console.error("Error bulk declining reports:", e);
      alert(`Failed to complete bulk decline: ${e.message}`);
    } finally {
      setBulkActionProgress({ total: 0, current: 0, type: null });
    }
  };

  // Bulk PDF Export
  const handleBulkPdfExport = async () => {
    const itemsToExport = selectedEvaluations.map(k => {
      const [uid, q] = k.split("_");
      const member = filteredStaffProfiles.find(m => m.uid === uid);
      const summary = allSummaries.find(s => s.userId === uid && s.quarter === q);
      return { member, quarter: q as "1st" | "2nd" | "3rd", summary };
    }).filter((item): item is { member: UserProfile; quarter: "1st" | "2nd" | "3rd"; summary: QuarterlySummary } => !!item.member && !!item.summary && !!item.summary.evaluation.overallEffectiveness);

    if (itemsToExport.length === 0) {
      alert("No compiled evaluation reports (with overall effectiveness scores) are currently selected for PDF export.");
      return;
    }

    if (isAdmin) {
      openBulkPdfCustomizer(itemsToExport);
    } else {
      const confirmExport = window.confirm(`Export ${itemsToExport.length} selected evaluation report(s) as individual PDFs?`);
      if (!confirmExport) return;

      try {
        setBulkActionProgress({ total: itemsToExport.length, current: 0, type: "export" });

        let completedCount = 0;
        for (const item of itemsToExport) {
          exportEvaluationToPDF(item.member, item.quarter, item.summary, { isDefaultOnly: true });
          completedCount++;
          setBulkActionProgress(prev => ({ ...prev, current: completedCount }));
          // Brief pause to allow browser main thread breathing room and smoother UI progress rendering
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        alert(`Successfully generated PDF exports for ${itemsToExport.length} reports!`);
      } catch (e: any) {
        console.error("Error during bulk export:", e);
        alert(`Failed to complete bulk export: ${e.message}`);
      } finally {
        setBulkActionProgress({ total: 0, current: 0, type: null });
      }
    }
  };

  // Admin Decline / Request changes on Completed Evaluations
  const handleAdminDecline = async (summary: QuarterlySummary, declineReason: string, memberName: string) => {
    if (!user || !isAdmin) return;
    if (!declineReason.trim()) {
      alert("Please provide a reason for declining the report.");
      return;
    }

    const updatedSummary: QuarterlySummary = {
      ...summary,
      status: "Declined",
      declineReason: declineReason.trim(),
      declinedBy: user.name,
      declinedAt: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      updatedAt: Date.now()
    };

    // Clear previous sign-off fields if they were set
    if (updatedSummary.evaluation) {
      updatedSummary.evaluation = {
        ...updatedSummary.evaluation,
        formReviewedBy: undefined,
        formReviewedByDate: undefined
      };
    }

    const action = `Declined evaluation summary: ${declineReason.trim()}`;

    if (user.uid.startsWith("bypass_")) {
      const localSummariesStr = localStorage.getItem("staff_review_bypass_summaries") || "[]";
      const localSummaries = JSON.parse(localSummariesStr) as QuarterlySummary[];
      const index = localSummaries.findIndex(s => s.id === updatedSummary.id);
      if (index > -1) {
        localSummaries[index] = updatedSummary;
      } else {
        localSummaries.push(updatedSummary);
      }
      localStorage.setItem("staff_review_bypass_summaries", JSON.stringify(localSummaries));

      setMySummaries(localSummaries.filter(s => s.userId === user.uid));
      setAllSummaries(localSummaries);
      await logActivity(updatedSummary.userId, updatedSummary.staffName, "summary", updatedSummary.quarter, updatedSummary.year, action);
      alert(`Success: Declined ${memberName}'s ${updatedSummary.quarter} Quarter evaluation and requested coach revision.`);
      return;
    }

    try {
      await dataSaveSummary(updatedSummary);
      setAllSummaries(prev => prev.map(s => s.id === updatedSummary.id ? updatedSummary : s));
      await logActivity(updatedSummary.userId, updatedSummary.staffName, "summary", updatedSummary.quarter, updatedSummary.year, action);
      alert(`Success: Declined ${memberName}'s ${updatedSummary.quarter} Quarter evaluation and requested coach revision.`);
    } catch (e) {
      console.error("Error declining evaluation:", e);
      alert("Failed to save rejection.");
    }
  };

  // Save Follow Up Task
  const handleSaveFollowUpTask = async (task: FollowUpTask) => {
    if (user && user.uid.startsWith("bypass_")) {
      const localTasksStr = localStorage.getItem("staff_review_bypass_followup_tasks") || "[]";
      let localTasks = JSON.parse(localTasksStr) as FollowUpTask[];
      const index = localTasks.findIndex(t => t.id === task.id);
      if (index > -1) {
        localTasks[index] = task;
      } else {
        localTasks.push(task);
      }
      localStorage.setItem("staff_review_bypass_followup_tasks", JSON.stringify(localTasks));
      setFollowUpTasks(localTasks);
      return;
    }

    await dataSaveFollowUpTask(task);
  };

  // Reset Follow Up Defaults to match PDF precisely
  const handleResetFollowUpDefaults = async () => {
    const defaults = getPdfDefaultTasks();
    if (user && user.uid.startsWith("bypass_")) {
      localStorage.setItem("staff_review_bypass_followup_tasks", JSON.stringify(defaults));
      setFollowUpTasks(defaults);
      return;
    }

    for (const t of defaults) {
      await dataSaveFollowUpTask(t);
    }
  };

  // Save Dynamic Requirements settings
  const handleSaveRequirementSettings = async (settings: ReviewRequirementSettings) => {
    if (user && user.uid.startsWith("bypass_")) {
      localStorage.setItem("staff_review_bypass_requirement_settings", JSON.stringify(settings));
      setRequirementSettings(settings);
      return;
    }

    await dataSaveRequirementSettings(settings);
  };

  // Save Review Period schedule/deadlines
  const handleSaveReviewSchedule = async (
    quarter: "1st" | "2nd" | "3rd", 
    startDate: string, 
    dueDate: string, 
    notifyAll: boolean, 
    notificationMessage: string,
    quarterlyUnlocked?: boolean,
    quarterlyUnlockDate?: string,
    quarterlyUnlockTime?: string
  ) => {
    const scheduleData = { 
      startDate, 
      dueDate, 
      notifyAll, 
      notificationMessage, 
      quarterlyUnlocked: !!quarterlyUnlocked,
      quarterlyUnlockDate: quarterlyUnlockDate || "",
      quarterlyUnlockTime: quarterlyUnlockTime || "",
      updatedAt: Date.now() 
    };
    
    if (user?.uid.startsWith("bypass_")) {
      const updatedSchedules = {
        ...reviewSchedules,
        [quarter]: scheduleData
      };
      localStorage.setItem("staff_review_bypass_schedules", JSON.stringify(updatedSchedules));
      setReviewSchedules(updatedSchedules);
      showToast(`${quarter} Quarter Review schedule saved successfully (Bypass Mode)!`, "success");
      return;
    }

    try {
      await dataSaveReviewSchedule(quarter, scheduleData);
      showToast(`${quarter} Quarter Review schedule saved successfully!`, "success");
    } catch (e) {
      console.error("Failed to save schedule", e);
      showToast(`Failed to save schedule. Check console/permissions. Error: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  // Schedule a review feedback meeting
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleStaffUid || !scheduleDate || !scheduleTime) {
      alert("Please fill in the date, time, and pick a staff member.");
      return;
    }

    const meetingId = `${scheduleStaffUid}_${scheduleQuarter}_2025-2026_meeting`;
    const targetStaff = staffProfiles.find(s => s.uid === scheduleStaffUid);
    const meetingData = {
      id: meetingId,
      userId: scheduleStaffUid,
      staffName: targetStaff ? targetStaff.name : "Staff Member",
      quarter: scheduleQuarter,
      date: scheduleDate,
      time: scheduleTime,
      notes: scheduleNotes,
      scheduledBy: user?.name || "Team Leader",
      createdAt: Date.now()
    };

    if (user && user.uid.startsWith("bypass_")) {
      const localMeetingsStr = localStorage.getItem("staff_review_bypass_meetings") || "[]";
      const localMeetings = JSON.parse(localMeetingsStr);
      const index = localMeetings.findIndex((m: any) => m.id === meetingId);
      if (index > -1) {
        localMeetings[index] = meetingData;
      } else {
        localMeetings.push(meetingData);
      }
      localStorage.setItem("staff_review_bypass_meetings", JSON.stringify(localMeetings));
      setMeetings(localMeetings);

      setShowScheduler(false);
      setScheduleDate("");
      setScheduleTime("");
      setScheduleNotes("");
      alert("Feedback session scheduled and synced with the team member!");
      return;
    }

    await dataSaveMeeting(meetingData);
    setShowScheduler(false);
    setScheduleDate("");
    setScheduleTime("");
    setScheduleNotes("");
    alert("Feedback session scheduled and synced with the team member!");
  };

  // Create Google Calendar render URL helper
  const generateGoogleCalendarLink = (meeting: any) => {
    const text = encodeURIComponent(`Quarterly Development Review (${meeting.quarter} Quarter) - Feedback Session`);
    const formattedDate = meeting.date.replace(/-/g, "");
    const formattedTime = meeting.time.replace(/:/g, "");
    
    // Construct approximate end hour
    let endHour = parseInt(meeting.time.split(":")[0]) + 1;
    let paddedEndHour = endHour < 10 ? `0${endHour}` : `${endHour}`;
    const minutes = meeting.time.split(":")[1] || "00";
    const dates = `${formattedDate}T${formattedTime}00/${formattedDate}T${paddedEndHour}${minutes}00`;
    
    const details = encodeURIComponent(
      `Development review feedback session scheduled by ${meeting.scheduledBy}.\nNotes: ${meeting.notes || "None"}`
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&sf=true&output=xml`;
  };

  if (loading) {
    return (
      <div id="loading-fallback" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-mono text-xs text-slate-500 gap-3 relative">
        <div className="w-full bg-amber-500 text-slate-950 font-bold text-center py-2 text-xs md:text-sm tracking-wide shadow-sm flex items-center justify-center gap-1.5 px-4 absolute top-0 left-0">
          <span>⚠️ DEMO MODE: This is a demo and is meant to show the idea not the functionalities</span>
        </div>
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
        <span>Synchronizing Review Workspace...</span>
      </div>
    );
  }

  // LOGIN / SIGN UP LAYOUT
  if (!user) {
    return (
      <div id="auth-page" className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-6 transition-colors duration-200 relative pt-16">
        <div className="w-full bg-amber-500 text-slate-950 font-bold text-center py-2 text-xs md:text-sm tracking-wide shadow-sm flex items-center justify-center gap-1.5 px-4 absolute top-0 left-0 z-50">
          <span>⚠️ DEMO MODE: This is a demo and is meant to show the idea not the functionalities</span>
        </div>
        <div className="absolute top-4 right-4">
          <button
            id="auth-theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors shadow-sm flex items-center justify-center"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <Sun className="w-4.5 h-4.5 text-amber-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-slate-700" />
            )}
          </button>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-150 p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 overflow-hidden">
              <img
                src="/asseso_logo.jpg"
                alt="Asseso Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-2xl font-sans font-extrabold tracking-tight text-slate-900">
              Asseso
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Africa Region Staff Development Portal
            </p>
          </div>

          {authError && (
            <div id="auth-error" className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-4 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      id="auth-name"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-base bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-slate-800/20 transition-shadow"
                      placeholder="John Smith"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Your name as you're known at work.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Your Job Title</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      id="auth-role"
                      value={authRole}
                      onChange={(e) => setAuthRole(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-base bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-slate-800/20 transition-shadow"
                      placeholder="e.g. Staff Care Coordinator"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">For example: Teacher, Nurse, Coordinator.</p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="email"
                  id="auth-email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-base bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-slate-800/20 transition-shadow"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">We use this to log you in next time.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="password"
                  id="auth-password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-base bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-slate-800/20 transition-shadow"
                  placeholder={isSignUp ? "Create a password" : "Your password"}
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">{isSignUp ? "Choose a password at least 6 characters long." : "This is the password you chose when you registered."}</p>
            </div>

            <button
              type="submit"
              id="auth-submit-btn"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-base font-semibold transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2"
            >
              {isSignUp ? "Create my account" : "Access Workspace"}
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              id="auth-toggle-btn"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError("");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              {isSignUp ? "Already have an account? Sign In" : "New here? Create an account"}
            </button>
          </div>

          {/* Development & Testing Bypasses */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3.5">
            {/* Toggle Switch for Mock Data */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/40 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5 text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Mock Data (fake data for testing)
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Toggle on to automatically pre-populate the workspace with rich testing data.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="mock-data-toggle"
                  checked={useMockData}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseMockData(checked);
                    localStorage.setItem("staff_review_use_mock_data", checked ? "true" : "false");
                    if (checked) {
                      showToast("Mock data enabled! Bypassing will now seed beautiful testing data.", "success");
                    } else {
                      showToast("Mock data disabled.", "success");
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full font-mono">
                Development Bypass
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                No sign-in required! Click below to immediately log in and test each workspace role:
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                id="bypass-owner-btn"
                onClick={() => handleBypassLogin("lewikb13@gmail.com", "Lewis KB", "Platform Owner", true, true)}
                className="w-full py-2.5 px-4 bg-slate-50 border border-slate-150 hover:bg-slate-100 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-all flex items-center justify-between shadow-sm group"
              >
                <div className="text-left">
                  <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Platform Owner (Lewis KB)</span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Admin access • lewikb13@gmail.com</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                id="bypass-leader-btn"
                onClick={() => handleBypassLogin("leader@example.com", "Sarah Leader", "Regional Coordinator", true)}
                className="w-full py-2.5 px-4 bg-slate-50 border border-slate-150 hover:bg-slate-100 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-all flex items-center justify-between shadow-sm group"
              >
                <div className="text-left">
                  <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Team Leader (Sarah)</span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Evaluate staff & compile summaries</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                id="bypass-member-btn"
                onClick={() => handleBypassLogin("john.staff@example.com", "John Staff", "Ministry Coordinator", false)}
                className="w-full py-2.5 px-4 bg-slate-50 border border-slate-150 hover:bg-slate-100 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-all flex items-center justify-between shadow-sm group"
              >
                <div className="text-left">
                  <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Team Member (John)</span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Fill reviews & view scheduled meetings</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans text-slate-800 transition-colors duration-200">
      {/* Welcome Guide — shows on first login, dismissible */}

      {/* DEMO MODE BANNER */}
      <div className="w-full bg-amber-500 text-slate-950 font-bold text-center py-2 text-xs md:text-sm tracking-wide shadow-sm flex items-center justify-center gap-1.5 px-4 z-50">
        <span>⚠️ DEMO MODE: This is a demo and is meant to show the idea not the functionalities</span>
      </div>

      {/* GLOBAL NAVBAR */}
      <nav className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-800">
                <img
                  src="/asseso_logo.jpg"
                  alt="Asseso Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                  Asseso
                  <span className="text-[9px] uppercase tracking-wider bg-indigo-900/60 text-indigo-200 px-1.5 py-0.5 rounded font-mono font-medium">Development</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-mono">Africa Region National Ministries</p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  {user.isLeader ? (
                    <span className="text-indigo-400 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Team Leader
                    </span>
                  ) : (
                    <span>Team Member</span>
                  )}
                  {` • ${user.role}`}
                </span>
              </div>

              <button
                id="theme-toggle-btn"
                onClick={toggleTheme}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? (
                  <Sun className="w-4.5 h-4.5 text-amber-400" />
                ) : (
                  <Moon className="w-4.5 h-4.5" />
                )}
              </button>

              <button
                id="global-logout-btn"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* CORE VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Global Coaching Invitation Banner */}
        {pendingInvitationsCount > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in border border-indigo-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm">🔔 Pending Coaching Invitations</h4>
                <p className="text-xs text-indigo-100 mt-0.5">
                  You have {pendingInvitationsCount} member{pendingInvitationsCount > 1 ? "s" : ""} requesting you as their coach. Review and accept them to access their profiles.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentTab("team-reviews");
                setTimeout(() => {
                  document.getElementById("coaching-invitations-container")?.scrollIntoView({ behavior: "smooth" });
                }, 150);
              }}
              className="px-4 py-2 bg-white text-indigo-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all shadow shrink-0"
            >
              Go to Coaching Dashboard
            </button>
          </div>
        )}

        {/* Editor Modals */}
        {activeReview && (
          <div className="animate-fade-in">
            <ReviewFormEditor
              review={activeReview}
              onSave={handleSaveReview}
              onClose={() => setActiveReview(null)}
              isLeaderView={user ? (isAdmin || myActiveCoachedUids.includes(activeReview.userId)) : false}
              staffName={user && (isAdmin || myActiveCoachedUids.includes(activeReview.userId)) && activeReview.userId !== user.uid ? activeReview.staffMemberName : undefined}
              requiredSettings={requirementSettings}
              isOwner={activeReview.userId === user?.uid}
            />
          </div>
        )}

        {activeSummary && (
          <div className="animate-fade-in">
            <SummaryFormEditor
              summary={activeSummary}
              onSave={handleSaveSummary}
              onClose={() => setActiveSummary(null)}
              isLeaderView={isLeaderOrCoach}
              staffName={activeSummaryStaffName}
              isOwner={activeSummary.userId === user?.uid}
              isCoachOrAdmin={user ? (isAdmin || myActiveCoachedUids.includes(activeSummary.userId)) : false}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        {!activeReview && !activeSummary && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex flex-wrap gap-2">
                <button
                  id="tab-btn-my-reviews"
                  onClick={() => setCurrentTab("my-reviews")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    currentTab === "my-reviews" 
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  My Reviews
                </button>

                {isLeaderOrCoach && (
                  <button
                    id="tab-btn-team-reviews"
                    onClick={() => setCurrentTab("team-reviews")}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      currentTab === "team-reviews" 
                        ? "bg-indigo-600 text-white shadow shadow-indigo-200 dark:shadow-none" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                    }`}
                  >
                    Team Reviews
                  </button>
                )}

                {isAdmin && (
                  <button
                    id="tab-btn-admin"
                    onClick={() => setCurrentTab("admin")}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      currentTab === "admin" 
                        ? "bg-amber-600 text-white shadow" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    }`}
                  >
                    Admin Dashboard
                  </button>
                )}
              </div>

              {/* Scheduler Trigger for Leaders */}
              {isLeaderOrCoach && currentTab === "team-reviews" && (
                <button
                  id="trigger-scheduler-btn"
                  onClick={() => {
                    if (filteredStaffProfiles.length === 0) {
                      alert("You need active coached members to schedule meetings.");
                      return;
                    }
                    setScheduleStaffUid(filteredStaffProfiles[0].uid);
                    setShowScheduler(true);
                  }}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Schedule Review Meeting
                </button>
              )}
            </div>

            {/* Persistent tab-aware "Next Step" guidance panel */}
            {myNextStep && (
              <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute -right-2 -top-2 w-20 h-20 bg-white/10 rounded-full" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
                  <div className="bg-white/20 rounded-2xl p-3.5 shrink-0">
                    {myNextStep.type === "wait" ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : myNextStep.type === "admin" || myNextStep.type === "leader" ? (
                      <ShieldCheck className="w-7 h-7" />
                    ) : myNextStep.type === "invitation" || myNextStep.type === "nominate" ? (
                      <HeartHandshake className="w-7 h-7" />
                    ) : myNextStep.type === "meeting" ? (
                      <Calendar className="w-7 h-7" />
                    ) : (
                      <ClipboardList className="w-7 h-7" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">Your next step</span>
                    <h4 className="text-lg font-sans font-extrabold mt-1.5">{myNextStep.label}</h4>
                    <p className="text-xs text-indigo-100 mt-0.5">{myNextStep.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (myNextStep.type === "fill-summary" && myNextStep.quarter && user) {
                        handleSelectStaffSummary(user, myNextStep.quarter);
                      } else if (myNextStep.type === "nominate" || myNextStep.type === "wait") {
                        document.getElementById("coaching-nominations-card")?.scrollIntoView({ behavior: "smooth" });
                      } else if (myNextStep.type === "invitation" || myNextStep.type === "leader") {
                        setCurrentTab("team-reviews");
                      } else if (myNextStep.type === "admin") {
                        setCurrentTab("admin");
                      } else if (myNextStep.type === "meeting") {
                        if (filteredStaffProfiles.length > 0) {
                          setScheduleStaffUid(filteredStaffProfiles[0].uid);
                          setShowScheduler(true);
                        }
                      }
                    }}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-700 text-sm font-bold rounded-xl shadow transition-transform hover:scale-[1.02]"
                  >
                    {myNextStep.btn}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: MY REVIEWS */}
            {currentTab === "my-reviews" && (
              <div className="space-y-6 animate-fade-in">
                {/* Pending Coaching Invitation Banner (nominated coach, awaiting their response) */}
                {hasPendingInvitation && !isAdmin && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 shadow-sm animate-scale-up flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="bg-emerald-600 text-white rounded-full p-2.5 shadow-sm shrink-0">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-full">
                        Coaching request for you
                      </span>
                      <h4 className="font-sans font-extrabold text-sm text-emerald-950 dark:text-emerald-100 mt-1.5">
                        {pendingInvitations.length === 1
                          ? `${pendingInvitations[0].memberName} nominated you as their Team Leader and coach.`
                          : `${pendingInvitations.length} staff members nominated you as their Team Leader and coach.`}
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200/80 mt-1">
                        Accept, or decline with a reason (sent to the Admin and the person who nominated you). Your coach tab opens once you accept.
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentTab("team-reviews")}
                      className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow"
                    >
                      Review Invitation
                    </button>
                  </div>
                )}

                {/* Active Review Period Banners */}
                {Object.entries(reviewSchedules).map(([qKey, schedVal]) => {
                  const sched = schedVal as { startDate: string; dueDate: string; notifyAll: boolean; notificationMessage?: string };
                  if (!sched.notifyAll) return null;
                  
                  const today = new Date();
                  const due = sched.dueDate ? new Date(sched.dueDate) : null;
                  let daysLeftText = "";
                  if (due) {
                    const diffTime = due.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) {
                      daysLeftText = `(${diffDays} days remaining)`;
                    } else if (diffDays === 0) {
                      daysLeftText = `(Due TODAY!)`;
                    } else {
                      daysLeftText = `(Overdue by ${Math.abs(diffDays)} days)`;
                    }
                  }

                  const formattedStart = sched.startDate ? new Date(sched.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "";
                  const formattedDue = sched.dueDate ? new Date(sched.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "";

                  return (
                    <div key={qKey} className="bg-gradient-to-r from-indigo-50 to-indigo-100/60 dark:from-indigo-950/20 dark:to-indigo-900/10 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 shadow-sm text-indigo-900 dark:text-indigo-300 flex items-start gap-4 animate-scale-up">
                      <div className="bg-indigo-600 text-white rounded-full p-2.5 shadow-sm">
                        <BellRing className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-700">
                            Active review period
                          </span>
                        </div>
                        <h4 className="font-sans font-extrabold text-sm text-indigo-950 dark:text-indigo-100">
                          {qKey} Quarter Self-Reflection & Dialogue
                        </h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                          {sched.notificationMessage || `The self-reflection period for the ${qKey} Quarter is officially open. Please fill out and submit your development review form to your Team Leader.`}
                        </p>
                        {sched.startDate && sched.dueDate && (
                          <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1 mt-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Timeline: {formattedStart} to {formattedDue} <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">{daysLeftText}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Coaching Nominations Section */}
                <CoachingNominations 
                  coachingRequests={coachingRequests}
                  onAddRequest={handleAddCoachingRequest}
                  onDeleteRequest={handleDeleteCoachingRequest}
                  currentUser={user}
                  registeredUsers={staffProfiles}
                />

                {/* Meetings Coordinator */}
                {meetings.filter(m => m.userId === user.uid).length > 0 && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 space-y-4">
                    <h3 className="font-sans font-bold text-indigo-900 text-base flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      Upcoming Feedback Meetings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {meetings.filter(m => m.userId === user.uid).map(m => (
                        <div key={m.id} className="bg-white rounded-xl p-5 border border-indigo-200/50 shadow-sm flex flex-col justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                              {m.quarter} Quarter Review
                            </span>
                            <h4 className="font-bold text-slate-800 mt-2 text-sm">Face-to-Face Reflection Session</h4>
                            <p className="text-xs text-slate-500 mt-1">Scheduled by: {m.scheduledBy}</p>
                            <p className="text-xs text-slate-700 font-semibold mt-3 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {m.date} at {m.time}
                            </p>
                            {m.notes && <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 p-2 rounded border border-slate-100">Notes: {m.notes}</p>}
                          </div>
                          <a
                            id={`add-cal-btn-${m.id}`}
                            href={generateGoogleCalendarLink(m).startsWith("https://calendar.google.com") ? generateGoogleCalendarLink(m) : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full text-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Google Calendar
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline Comments Notifications */}
                {myReviews.filter(r => {
                  if (!r.leaderSectionComments) return false;
                  return Object.values(r.leaderSectionComments).some(val => typeof val === "string" && val.trim() !== "");
                }).map(r => {
                  const isRevisionNeeded = r.status === "Draft";
                  return (
                    <div key={`notif-${r.id}`} className={`border-l-4 p-4 rounded-r-xl shadow-sm animate-fade-in ${
                      isRevisionNeeded 
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 text-amber-900 dark:text-amber-200" 
                        : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200"
                    }`}>
                      <div className="flex items-start gap-3">
                        <MessageSquare className={`w-5 h-5 shrink-0 mt-0.5 ${isRevisionNeeded ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"}`} />
                        <div className="flex-1">
                          <h4 className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            <span>{isRevisionNeeded ? "⚠️ Action Required: Revision Requested" : "💬 Team Leader Comments"}</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {r.quarter} Quarter Review
                            </span>
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-normal">
                            {isRevisionNeeded 
                              ? `Your Team Leader, ${r.supervisorName || "Supervisor"}, left inline coaching comments and set your form status back to draft (submitted status set to false). Please update the form and re-submit.`
                              : `Your Team Leader, ${r.supervisorName || "Supervisor"}, has left inline coaching feedback on your submitted review.`}
                          </p>
                          <div className="pt-2">
                            <button
                              onClick={() => handleSelectMyReview(r.quarter)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm text-white ${
                                isRevisionNeeded 
                                  ? "bg-amber-600 hover:bg-amber-700" 
                                  : "bg-indigo-600 hover:bg-indigo-700"
                              }`}
                            >
                              {isRevisionNeeded ? "✏️ Edit and Revise Form" : "👁️ View Comments"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Quarter Progress Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(["1st", "2nd", "3rd"] as const).map(qKey => {
                    const review = myReviews.find(r => r.quarter === qKey);
                    const summary = mySummaries.find(s => s.quarter === qKey);
                    const isSubmitted = review?.status === "Submitted";
                    const isDraft = review?.status === "Draft";
                    const progress = calculateReviewProgress(review);

                    return (
                      <div key={qKey} className="bg-white rounded-2xl border border-slate-150 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-sans font-extrabold text-slate-900 text-lg">
                                {QUARTER_INFO[qKey].name}
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5">{QUARTER_INFO[qKey].months}</p>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              isSubmitted ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              isDraft ? "bg-amber-50 text-amber-700 border border-amber-100" :
                              "bg-slate-100 text-slate-500"
                            }`}>
                              {isSubmitted ? "Submitted" : isDraft ? "In Draft" : "Not Started"}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          {review && (
                            <div className="mt-4 space-y-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                              <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500">
                                <span>Completion Progress</span>
                                <span>{progress.percentage}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
                                  style={{ width: `${progress.percentage}%` }}
                                />
                              </div>
                              <p className="text-[9px] text-slate-400 font-sans leading-tight mt-1">
                                {progress.totalFilled} of 36 fields completed.
                              </p>
                            </div>
                          )}

                          <div className="mt-6 space-y-4">
                            {/* Review Form link */}
                            <div className="flex justify-between items-start gap-4 text-sm">
                              <div className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200 font-bold">Monthly Form</span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                  This monthly form is done every month between you and your coach
                                </span>
                              </div>
                              <button
                                id={`edit-my-review-${qKey}`}
                                onClick={() => handleSelectMyReview(qKey)}
                                className="text-xs font-bold text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-md transition-all shrink-0 mt-0.5"
                              >
                                {isSubmitted ? "View Form" : "Fill/Edit Form"}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Summary Form link */}
                            <div className="flex justify-between items-start gap-4 text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
                              <div className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200 font-bold">Quarterly Form</span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                  This form is done quarterly and will be submitted to HR.
                                </span>
                              </div>
                              <div className="shrink-0 mt-0.5">
                                {(summary && (summary.status === "Submitted" || summary.status === "CoachSubmitted")) ? (
                                  summary.status === "Submitted" ? (
                                    <button
                                      id={`view-my-submitted-summary-${qKey}`}
                                      onClick={() => {
                                        setActiveSummary(summary);
                                        setActiveSummaryStaffName(user.name);
                                      }}
                                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-all border border-blue-200 cursor-pointer"
                                    >
                                      Submitted to Coach
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      id={`view-my-eval-${qKey}`}
                                      onClick={() => {
                                        setActiveSummary(summary);
                                        setActiveSummaryStaffName(user.name);
                                      }}
                                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md transition-all border border-emerald-200 cursor-pointer"
                                    >
                                      View Evaluation
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                ) : !isQuarterlyUnlockedForUser(qKey) ? (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold flex items-center gap-1">
                                    🔒 Locked by Admin
                                  </span>
                                ) : !summary ? (
                                  <button
                                    id={`start-my-summary-${qKey}`}
                                    onClick={() => handleSelectStaffSummary(user, qKey as "1st" | "2nd" | "3rd")}
                                    className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white animate-pulse px-2.5 py-1.5 rounded-md transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                  >
                                    Fill Summary (Required)
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    id={`resume-my-summary-${qKey}`}
                                    onClick={() => {
                                      setActiveSummary(summary);
                                      setActiveSummaryStaffName(user.name);
                                    }}
                                    className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white animate-pulse px-2.5 py-1.5 rounded-md transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                  >
                                    Resume Summary (Required)
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* My Feedback Section */}
                {myReviews.filter(r => {
                  if (!r.leaderSectionComments) return false;
                  return Object.values(r.leaderSectionComments).some(val => typeof val === "string" && val.trim() !== "");
                }).length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 space-y-6 shadow-sm transition-colors duration-200">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <h3 className="font-sans font-extrabold text-slate-900 dark:text-slate-100 text-base">
                          My Feedback
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          At-a-glance list of inline coaching comments left by your leader on your review quadrants.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {myReviews.filter(r => {
                        if (!r.leaderSectionComments) return false;
                        return Object.values(r.leaderSectionComments).some(val => typeof val === "string" && val.trim() !== "");
                      }).map(r => (
                        <div key={`feedback-panel-${r.id}`} className="bg-slate-50 dark:bg-slate-950 rounded-xl p-5 border border-slate-150 dark:border-slate-800/60 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
                                {r.quarter} Quarter Review
                              </span>
                              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-2">
                                Leader Comments by {r.supervisorName || "Supervisor"}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                r.status === "Draft" 
                                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800" 
                                  : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              }`}>
                                {r.status === "Draft" ? "🔓 Open for Revision" : "🔒 Locked / Submitted"}
                              </span>
                              <button
                                onClick={() => handleSelectMyReview(r.quarter)}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-150/30 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition-all"
                              >
                                View / Edit Form
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { key: "heart", label: "❤️ Walk with God" },
                              { key: "personalLife", label: "🌱 Personal Life" },
                              { key: "relationalLife", label: "🤝 Relational Life" },
                              { key: "ministryEffectiveness", label: "⚡ Ministry Impact" }
                            ].map(sec => {
                              const comment = r.leaderSectionComments?.[sec.key];
                              if (!comment || comment.trim() === "") return null;
                              return (
                                <div key={sec.key} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    {sec.label}
                                  </span>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic whitespace-pre-wrap font-medium">
                                    "{comment}"
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personal Activity Log at the bottom */}
                {isAdmin && (
                  <div className="pt-6">
                    <ActivityLogList
                      logs={activityLogs}
                      staffProfiles={[user]}
                      isLeader={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB: TEAM REVIEWS (LEADERS & APPROVED COACHES) */}
            {isLeaderOrCoach && currentTab === "team-reviews" && (
              <div className="space-y-6 animate-fade-in">
                {/* Coaching Invitations Panel */}
                <CoachingInvitations 
                  coachingRequests={coachingRequests}
                  onAcceptInvitation={handleAcceptCoachingInvitation}
                  onRejectInvitation={handleRejectCoachingInvitation}
                  currentUser={user}
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-slate-800 dark:text-slate-100">
                      Registered Staff Evaluation Center
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {evaluationCenterSubTab === "overview"
                        ? "View comprehensive quarterly TL evaluations compiled by approved coaches for every staff member."
                        : "Select any team member to view their development forms, schedule feedback sessions, or compile their quarterly evaluation summaries."}
                    </p>
                  </div>

                  {/* Sub-tab selection */}
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit shrink-0 border border-slate-200/50 dark:border-slate-800">
                    <button
                      id="subtab-overview-btn"
                      onClick={() => setEvaluationCenterSubTab("overview")}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        evaluationCenterSubTab === "overview"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      All Coach Evaluations
                    </button>
                    <button
                      id="subtab-manage-btn"
                      onClick={() => setEvaluationCenterSubTab("manage")}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        evaluationCenterSubTab === "manage"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Folder Directory
                    </button>
                  </div>
                </div>

                {/* SUB-TAB: OVERVIEW (ALL COACH EVALUATIONS) */}
                {evaluationCenterSubTab === "overview" && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Search & Filters */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center transition-colors">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by staff member or coach..."
                          value={overviewSearch}
                          onChange={(e) => setOverviewSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Quarter:</label>
                          <select
                            value={overviewQuarter}
                            onChange={(e) => setOverviewQuarter(e.target.value as any)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="All">All Quarters</option>
                            <option value="1st">1st Quarter (Jan - Mar)</option>
                            <option value="2nd">2nd Quarter (Apr - Jun)</option>
                            <option value="3rd">3rd Quarter (Jul - Sep)</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Rating:</label>
                          <select
                            value={overviewEffectiveness}
                            onChange={(e) => setOverviewEffectiveness(e.target.value as any)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="All">All Ratings</option>
                            <option value="One of the best">One of the best</option>
                            <option value="Satisfactory">Satisfactory</option>
                            <option value="Ineffective">Ineffective</option>
                            <option value="Pending">Pending Evaluation</option>
                          </select>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Sort By:</label>
                            <select
                              id="overview-sort-by-select"
                              value={overviewSortBy}
                              onChange={(e) => { setOverviewSortBy(e.target.value as any); setOverviewPage(1); }}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                            >
                              <option value="name">Staff Name</option>
                              <option value="rating">Rating</option>
                              <option value="date">Completion Date</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* View Switcher: Detailed Evaluation Feed vs Progress Matrix */}
                    {isAdmin && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                          <button
                            type="button"
                            onClick={() => { setOverviewViewMode("evaluations"); setOverviewPage(1); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              overviewViewMode === "evaluations"
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Detailed Evaluation Feed</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOverviewViewMode("matrix"); setOverviewPage(1); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              overviewViewMode === "matrix"
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Staff Progress Matrix</span>
                          </button>
                        </div>

                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {overviewViewMode === "evaluations" 
                            ? "Singled-out individual reports & growth logs" 
                            : "High-scale compliance & quarters completed"}
                        </div>
                      </div>
                    )}

                    {/* Evaluations Render Block */}
                    {(overviewViewMode === "evaluations" || !isAdmin) ? (
                      (() => {
                        // Gather ALL evaluations (compiled summaries + pending reviews) for filtered profiles
                        const allEvaluations = filteredStaffProfiles.flatMap(member => {
                          return (["1st", "2nd", "3rd"] as const).map(quarter => {
                            const summary = summariesMap.get(`${member.uid}-${quarter}`);
                            const review = reviewsMap.get(`${member.uid}-${quarter}`);
                            const coaches = coachesMap.get(member.uid) || [];
                            const isCompiled = !!(summary && summary.evaluation.overallEffectiveness);
                            const hasReview = !!review;
                            return {
                              member,
                              quarter,
                              summary,
                              review,
                              coaches,
                              isCompiled,
                              hasReview
                            };
                          });
                        }).filter(item => item.isCompiled || item.hasReview);

                        // Filter by Search, Quarter, and Rating
                        const filteredEvaluations = allEvaluations.filter(item => {
                          // Quarter filter
                          if (overviewQuarter !== "All" && item.quarter !== overviewQuarter) {
                            return false;
                          }
                          
                          // Rating / State filter
                          const rating = item.summary?.evaluation.overallEffectiveness;
                          if (overviewEffectiveness !== "All") {
                            if (overviewEffectiveness === "Pending") {
                              return !item.isCompiled && item.hasReview;
                            } else {
                              return item.isCompiled && rating === overviewEffectiveness;
                            }
                          }
                          
                          // Search filter
                          if (overviewSearch) {
                            const q = overviewSearch.toLowerCase();
                            const coachNames = item.coaches.map(c => c.coachName).join(", ");
                            const matchesMember = item.member.name.toLowerCase().includes(q) || item.member.role.toLowerCase().includes(q);
                            const matchesCoach = coachNames.toLowerCase().includes(q) || (item.summary?.evaluation.teamLeaderSignature || "").toLowerCase().includes(q);
                            if (!matchesMember && !matchesCoach) {
                              return false;
                            }
                          }
                          
                          return true;
                        });

                        // Sort filtered evaluations
                        const sortedEvaluations = [...filteredEvaluations].sort((a, b) => {
                          if (overviewSortBy === "name") {
                            return a.member.name.localeCompare(b.member.name);
                          } else if (overviewSortBy === "rating") {
                            const getRatingValue = (rating?: string) => {
                              switch (rating) {
                                case "One of the best": return 3;
                                case "Satisfactory": return 2;
                                case "Ineffective": return 1;
                                default: return 0;
                              }
                            };
                            const ratingA = getRatingValue(a.summary?.evaluation.overallEffectiveness);
                            const ratingB = getRatingValue(b.summary?.evaluation.overallEffectiveness);
                            if (ratingA !== ratingB) {
                              return ratingB - ratingA; // Descending (highest rating first)
                            }
                            return a.member.name.localeCompare(b.member.name);
                          } else if (overviewSortBy === "date") {
                            const dateA = a.summary?.updatedAt || a.review?.updatedAt || 0;
                            const dateB = b.summary?.updatedAt || b.review?.updatedAt || 0;
                            if (dateA !== dateB) {
                              return dateB - dateA; // Descending (newest first)
                            }
                            return a.member.name.localeCompare(b.member.name);
                          }
                          return 0;
                        });

                        // Paginate
                        const evalItemsPerPage = 6;
                        const totalEvals = sortedEvaluations.length;
                        const totalEvalPages = Math.max(1, Math.ceil(totalEvals / evalItemsPerPage));
                        const paginatedEvals = sortedEvaluations.slice(
                          (overviewPage - 1) * evalItemsPerPage,
                          overviewPage * evalItemsPerPage
                        );

                        if (totalEvals === 0) {
                          return (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 transition-colors">
                              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No finalized TL evaluations found matching your filters.</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                If staff members have submitted development reviews, you can select "Pending Evaluation" rating to find reviews awaiting compilation.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {isAdmin && (
                              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all">
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                  <input
                                    type="checkbox"
                                    id="bulk-select-all-evals"
                                    checked={filteredEvaluations.length > 0 && filteredEvaluations.every(item => selectedEvaluations.includes(`${item.member.uid}_${item.quarter}`))}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const keysToAdd = filteredEvaluations.map(item => `${item.member.uid}_${item.quarter}`);
                                        setSelectedEvaluations(prev => Array.from(new Set([...prev, ...keysToAdd])));
                                      } else {
                                        const keysToRemove = filteredEvaluations.map(item => `${item.member.uid}_${item.quarter}`);
                                        setSelectedEvaluations(prev => prev.filter(k => !keysToRemove.includes(k)));
                                      }
                                    }}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-800 rounded focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <div>
                                    <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200">
                                      Bulk Actions ({selectedEvaluations.length} Selected)
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                      Select individual reports below or select all {filteredEvaluations.length} visible results.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end shrink-0">
                                  <button
                                    type="button"
                                    id="bulk-pdf-export-action-btn"
                                    disabled={selectedEvaluations.length === 0}
                                    onClick={handleBulkPdfExport}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                                      selectedEvaluations.length > 0
                                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                        : "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed"
                                    }`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Export PDFs ({
                                      selectedEvaluations.filter(k => {
                                        const [uid, q] = k.split("_");
                                        const ev = allEvaluations.find(e => e.member.uid === uid && e.quarter === q);
                                        return !!ev?.isCompiled;
                                      }).length
                                    })</span>
                                  </button>
                                  <button
                                    type="button"
                                    id="bulk-decline-action-btn"
                                    disabled={selectedEvaluations.length === 0}
                                    onClick={() => setShowBulkDeclineModal(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                                      selectedEvaluations.length > 0
                                        ? "bg-rose-600 hover:bg-rose-500 text-white"
                                        : "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed"
                                    }`}
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>Decline Selected ({
                                      selectedEvaluations.filter(k => {
                                        const [uid, q] = k.split("_");
                                        const ev = allEvaluations.find(e => e.member.uid === uid && e.quarter === q);
                                        return ev?.summary && ev.summary.status !== "Declined";
                                      }).length
                                    })</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {isAdmin && allSummaries.filter(s => s.status === "CoachSubmitted" && (!s.evaluation || !s.evaluation.formReviewedBy)).length > 0 && (
                              <div className="bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
                                <div className="flex items-center gap-3">
                                  <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2.5 rounded-xl text-emerald-700 dark:text-emerald-400">
                                    <ShieldCheck className="w-5 h-5 animate-bounce" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200">
                                      Bulk Sign-off / Approvals Available
                                    </h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                      There are <strong>{allSummaries.filter(s => s.status === "CoachSubmitted" && (!s.evaluation || !s.evaluation.formReviewedBy)).length}</strong> finalized coaching evaluations waiting for your official Admin sign-off.
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  id="bulk-admin-signoff-btn"
                                  onClick={handleBulkAdminSignOff}
                                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Sign-off All Reports</span>
                                </button>
                              </div>
                            )}
                            {/* Grid of singled out reports */}
                            <div className="grid grid-cols-1 gap-6">
                              {paginatedEvals.map((item) => {
                                const { member, quarter, summary, isCompiled, coaches } = item;
                                const rating = summary?.evaluation.overallEffectiveness;
                                const coachNames = summary?.evaluation.teamLeaderSignature || coaches.map(c => c.coachName).join(", ") || "No Coach Nominated";
                                const strengths = summary?.evaluation.strengths || [];
                                const weaknesses = summary?.evaluation.weaknesses || [];
                                const readyForGreater = summary?.evaluation.readyForGreaterResp || "No";
                                const reassignment = summary?.evaluation.recommendReassignment || "No";
                                const formReviewedBy = summary?.evaluation.formReviewedBy;
                                const formReviewedByDate = summary?.evaluation.formReviewedByDate;

                                return (
                                  <div 
                                    key={`${member.uid}-${quarter}`}
                                    className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-5 items-stretch"
                                  >
                                    {/* Left Panel: Profile info, Rating Badge */}
                                    <div className="w-full md:w-[240px] flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-150 dark:border-slate-800 pb-4 md:pb-0 md:pr-5 shrink-0">
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                          {isAdmin && (
                                            <input
                                              type="checkbox"
                                              checked={selectedEvaluations.includes(`${member.uid}_${quarter}`)}
                                              onChange={(e) => {
                                                const key = `${member.uid}_${quarter}`;
                                                if (e.target.checked) {
                                                  setSelectedEvaluations(prev => [...prev, key]);
                                                } else {
                                                  setSelectedEvaluations(prev => prev.filter(k => k !== key));
                                                }
                                              }}
                                              className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-800 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                                            />
                                          )}
                                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                                            {member.name.substring(0, 2)}
                                          </div>
                                          <div>
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">{member.name}</h4>
                                            <p className="text-xs text-slate-450 dark:text-slate-500 line-clamp-1">{member.role}</p>
                                          </div>
                                        </div>
                                        
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30 text-[11px] font-bold">
                                          <Calendar className="w-3.5 h-3.5" />
                                          <span>{quarter} Quarter</span>
                                        </div>
                                      </div>

                                      <div className="mt-4 pt-3 border-t border-slate-150 dark:border-slate-800 space-y-2">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Effectiveness Rating</div>
                                        {isCompiled ? (
                                          <div className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold border ${
                                            rating === "One of the best"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400"
                                              : rating === "Satisfactory"
                                                ? "bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/20 dark:text-indigo-400"
                                                : "bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/20 dark:text-rose-400"
                                          }`}>
                                            {rating === "One of the best" ? "Outstanding" : rating}
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold border bg-amber-50 text-amber-700 border-amber-150 animate-pulse">
                                            Pending Coach
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Middle Panel: Strengths, Weaknesses, Growth Highlights */}
                                    <div className="flex-1 flex flex-col justify-between py-1 gap-4">
                                      {isCompiled ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          {/* Strengths Column */}
                                          <div className="space-y-1.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                                              <TrendingUp className="w-3 h-3" />
                                              <span>Top Strengths / Achievements</span>
                                            </div>
                                            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                              {strengths.filter(Boolean).length > 0 ? (
                                                strengths.filter(Boolean).map((st, idx) => (
                                                  <li key={idx} className="flex items-start gap-1.5">
                                                    <span className="text-emerald-500 font-bold mt-0.5">•</span>
                                                    <span className="line-clamp-2">{st}</span>
                                                  </li>
                                                ))
                                              ) : (
                                                <li className="text-slate-400 italic">No strengths highlighted</li>
                                              )}
                                            </ul>
                                          </div>

                                          {/* Weaknesses Column */}
                                          <div className="space-y-1.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1 font-mono">
                                              <TrendingDown className="w-3 h-3" />
                                              <span>Areas for Growth / Support</span>
                                            </div>
                                            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                              {weaknesses.filter(Boolean).length > 0 ? (
                                                weaknesses.filter(Boolean).map((wk, idx) => (
                                                  <li key={idx} className="flex items-start gap-1.5">
                                                    <span className="text-rose-400 font-bold mt-0.5">•</span>
                                                    <span className="line-clamp-2">{wk}</span>
                                                  </li>
                                                ))
                                              ) : (
                                                <li className="text-slate-400 italic">No growth areas noted</li>
                                              )}
                                            </ul>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 rounded-xl p-4 flex flex-col justify-center items-center text-center h-full">
                                          <Clock className="w-8 h-8 text-amber-500 animate-spin mb-2" style={{ animationDuration: "3s" }} />
                                          <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400">Evaluation Pending Coach Action</h5>
                                          <p className="text-[10px] text-slate-500 max-w-sm mt-1">
                                            The staff member has submitted their self-review form, but the designated coach has not compiled and finalized the official TL evaluation summary yet.
                                          </p>
                                        </div>
                                      )}

                                      {/* Quick Badges in Card Footer */}
                                      {isCompiled && (
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100/50 dark:border-slate-850 text-[10px] font-bold font-mono">
                                          <div className={`px-2 py-0.5 rounded ${
                                            readyForGreater === "Yes" 
                                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50" 
                                              : "bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-200/50 dark:border-slate-800"
                                          }`}>
                                            Greater Responsibility: {readyForGreater === "Yes" ? "READY" : "NO"}
                                          </div>
                                          {reassignment === "Yes" && (
                                            <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100/50 px-2 py-0.5 rounded">
                                              Reassignment Suggested
                                            </div>
                                          )}
                                          <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-auto font-sans font-medium text-[11px]">
                                            <User className="w-3 h-3 text-slate-300" />
                                            <span>Coach: <strong className="text-slate-600 dark:text-slate-300">{coachNames}</strong></span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right Panel: Admin Sign-Off Status & Actions */}
                                    <div className="w-full md:w-[170px] flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-5 shrink-0">
                                      <div className="space-y-2">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Sign-Off</div>
                                        {isCompiled ? (
                                          summary && summary.status === "Declined" ? (
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold font-sans">
                                                <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                                                <span>Changes Requested</span>
                                              </div>
                                              <p className="text-[9px] text-slate-400 leading-normal">Declined by admin. Awaiting coach revision.</p>
                                            </div>
                                          ) : formReviewedBy ? (
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold font-sans">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>Reviewed & Approved</span>
                                              </div>
                                              <p className="text-[10px] text-slate-400 font-mono">By {formReviewedBy} on {formReviewedByDate}</p>
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold font-sans">
                                                <Clock className="w-4 h-4" />
                                                <span>Pending Sign-Off</span>
                                              </div>
                                              <p className="text-[9px] text-slate-400 leading-normal">Needs evaluation center sign-off and approval.</p>
                                            </div>
                                          )
                                        ) : (
                                          <div className="text-[10px] text-slate-400 italic">N/A - Review pending</div>
                                        )}
                                      </div>

                                      <div className="mt-4 md:mt-0 space-y-2">
                                        {isCompiled ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => setActiveTLEvaluation({ member, quarter, summary })}
                                              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700 shadow-sm"
                                            >
                                              <BookOpen className="w-3.5 h-3.5" />
                                              <span>View Report</span>
                                            </button>
                                            
                                            {isAdmin && !formReviewedBy && summary && summary.status === "CoachSubmitted" && (
                                              <div className="space-y-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleAdminSignOff(summary!, member.name)}
                                                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                                                >
                                                  <ShieldCheck className="w-3.5 h-3.5" />
                                                  <span>Sign-off & Approve</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setDeclineSummaryTarget({ summary: summary!, memberName: member.name })}
                                                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/25 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-200 dark:border-rose-900/40 shadow-sm"
                                                >
                                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                                  <span>Decline Report</span>
                                                </button>
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          isLeaderOrCoach ? (
                                            <button
                                              type="button"
                                              onClick={() => handleSelectStaffSummary(member, quarter)}
                                              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                                            >
                                              <FileCheck className="w-3.5 h-3.5" />
                                              <span>Compile Summary</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              disabled
                                              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-50 text-slate-300 dark:bg-slate-900 dark:text-slate-750 rounded-xl text-xs font-bold cursor-not-allowed border border-slate-100 dark:border-slate-850"
                                            >
                                              <Clock className="w-3.5 h-3.5" />
                                              <span>Staff View</span>
                                            </button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Feed Pagination */}
                            {totalEvalPages > 1 && (
                              <div className="flex items-center justify-between border-t border-slate-150 dark:border-slate-800 pt-4 text-xs font-medium text-slate-500">
                                <span>
                                  Showing <strong>{Math.min(totalEvals, (overviewPage - 1) * evalItemsPerPage + 1)}</strong> to{" "}
                                  <strong>{Math.min(totalEvals, overviewPage * evalItemsPerPage)}</strong> of{" "}
                                  <strong>{totalEvals}</strong> evaluations
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setOverviewPage(prev => Math.max(1, prev - 1))}
                                    disabled={overviewPage === 1}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                      overviewPage === 1
                                        ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                    }`}
                                  >
                                    Prev
                                  </button>
                                  <span className="px-3 font-bold text-slate-700 dark:text-slate-300">
                                    {overviewPage} / {totalEvalPages}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setOverviewPage(prev => Math.min(totalEvalPages, prev + 1))}
                                    disabled={overviewPage === totalEvalPages}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                      overviewPage === totalEvalPages
                                        ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                    }`}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      // Render the Matrix table (existing code)
                      (() => {
                        // Filter staff members based on search and quarter/effectiveness filters
                        const filteredMembers = filteredStaffProfiles.filter(member => {
                          const coaches = coachesMap.get(member.uid) || [];
                          const coachNames = coaches.map(c => c.coachName).join(", ");
                          
                          // 1. Search filter
                          if (overviewSearch) {
                            const q = overviewSearch.toLowerCase();
                            const matchesMember = member.name.toLowerCase().includes(q) || member.role.toLowerCase().includes(q);
                            const matchesCoach = coachNames.toLowerCase().includes(q);
                            if (!matchesMember && !matchesCoach) {
                              return false;
                            }
                          }

                          // Helper to check quarter status & rating matches
                          const checkQuarterMatch = (q: "1st" | "2nd" | "3rd") => {
                            const summary = summariesMap.get(`${member.uid}-${q}`);
                            const review = reviewsMap.get(`${member.uid}-${q}`);
                            const isCompiled = summary && summary.evaluation.overallEffectiveness;
                            const rating = summary?.evaluation.overallEffectiveness;

                            if (overviewEffectiveness === "All") {
                              return true;
                            }
                            if (overviewEffectiveness === "Pending") {
                              return !isCompiled && !!review;
                            }
                            return !!isCompiled && rating === overviewEffectiveness;
                          };

                          // 2. Quarter and Effectiveness Filter
                          if (overviewQuarter === "All") {
                            if (overviewEffectiveness !== "All") {
                              // If filtering by a specific rating, must match in at least one quarter
                              return checkQuarterMatch("1st") || checkQuarterMatch("2nd") || checkQuarterMatch("3rd");
                            }
                          } else {
                            // Specific quarter selected - check that specific quarter
                            return checkQuarterMatch(overviewQuarter);
                          }

                          return true;
                        });

                        const itemsPerPage = 15;
                        const totalItems = filteredMembers.length;
                        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
                        const paginatedMembers = filteredMembers.slice(
                          (overviewPage - 1) * itemsPerPage,
                          overviewPage * itemsPerPage
                        );

                        if (filteredMembers.length === 0) {
                          return (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 transition-colors">
                              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No staff members found matching criteria.</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                Try adjusting your search filters or check if staff profiles have pending reviews.
                              </p>
                            </div>
                          );
                        }

                        // Helper to get quarter-specific data
                        const getQuarterData = (member: UserProfile, quarter: "1st" | "2nd" | "3rd") => {
                          const summary = summariesMap.get(`${member.uid}-${quarter}`);
                          const review = reviewsMap.get(`${member.uid}-${quarter}`);
                          const isCompiled = !!(summary && summary.evaluation.overallEffectiveness);
                          const rating = summary?.evaluation.overallEffectiveness || "";
                          const status: "compiled" | "pending_coach" | "not_started" = isCompiled 
                            ? "compiled" 
                            : (review ? "pending_coach" : "not_started");
                          return { summary, review, status, rating };
                        };

                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors flex flex-col justify-between">
                            <div className="overflow-x-auto font-sans">
                              <table className="w-full text-left border-collapse min-w-[850px]">
                                <thead>
                                  <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 w-[240px]">
                                      Staff Member
                                    </th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 w-[180px]">
                                      Assigned Coach
                                    </th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 w-[120px] text-center">
                                      Q1 (Jan-Mar)
                                    </th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 w-[120px] text-center">
                                      Q2 (Apr-Jun)
                                    </th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 w-[120px] text-center">
                                      Q3 (Jul-Sep)
                                    </th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 w-[110px] text-center">
                                      Completion
                                    </th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 text-right w-[110px]">
                                      Quick Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                                  {paginatedMembers.map((member) => {
                                    const coaches = coachesMap.get(member.uid) || [];
                                    const coachNames = coaches.map(c => c.coachName).join(", ") || "No Coach Nominated";
                                    
                                    const q1 = getQuarterData(member, "1st");
                                    const q2 = getQuarterData(member, "2nd");
                                    const q3 = getQuarterData(member, "3rd");

                                    const compiledCount = [q1, q2, q3].filter(q => q.status === "compiled").length;
                                    const pendingCount = [q1, q2, q3].filter(q => q.status === "pending_coach").length;

                                    const renderQuarterBadge = (quarter: "1st" | "2nd" | "3rd", qData: ReturnType<typeof getQuarterData>) => {
                                      const { status, rating, summary } = qData;
                                      
                                      const handleBadgeClick = () => {
                                        if (status === "compiled") {
                                          setActiveTLEvaluation({ member, quarter, summary });
                                        } else if (isLeaderOrCoach) {
                                          handleSelectStaffSummary(member, quarter);
                                        } else {
                                          alert(`Evaluation for ${member.name} (${quarter} Quarter) is ${status === "pending_coach" ? "pending coach review" : "not started yet"}.`);
                                        }
                                      };

                                      let badgeClass = "";
                                      let label = "";
                                      let icon = null;

                                      if (status === "compiled") {
                                        if (rating === "One of the best") {
                                          badgeClass = "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
                                          label = "Outstanding";
                                          icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
                                        } else if (rating === "Satisfactory") {
                                          badgeClass = "bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-150 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50";
                                          label = "Satisfactory";
                                          icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
                                        } else {
                                          badgeClass = "bg-rose-50 hover:bg-rose-100/80 text-rose-700 border-rose-150 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50";
                                          label = "Ineffective";
                                          icon = <AlertCircle className="w-3.5 h-3.5 shrink-0" />;
                                        }
                                      } else if (status === "pending_coach") {
                                        badgeClass = "bg-amber-50 hover:bg-amber-100/80 text-amber-700 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 animate-pulse";
                                        label = "Pending Coach";
                                        icon = <Clock className="w-3.5 h-3.5 shrink-0" />;
                                      } else {
                                        const isUnlocked = isQuarterlyUnlockedForUser(quarter);
                                        if (isUnlocked) {
                                          badgeClass = "bg-slate-50 hover:bg-slate-100/80 text-slate-400 border-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800";
                                          label = "Not Started";
                                          icon = <HelpCircle className="w-3.5 h-3.5 shrink-0" />;
                                        } else {
                                          badgeClass = "bg-amber-50/50 hover:bg-amber-100/40 text-amber-600 dark:bg-amber-950/10 dark:text-amber-400 border-amber-100/35 dark:border-amber-900/30";
                                          label = "🔒 Locked";
                                          icon = <Lock className="w-3 h-3 shrink-0 text-amber-500" />;
                                        }
                                      }

                                      return (
                                        <button
                                          type="button"
                                          onClick={handleBadgeClick}
                                          title={`${quarter} Quarter evaluation: ${label}. Click to ${status === "compiled" ? "view report" : "compile summary"}`}
                                          className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer shadow-sm ${badgeClass}`}
                                        >
                                          {icon}
                                          <span>{label}</span>
                                        </button>
                                      );
                                    };

                                    return (
                                      <tr 
                                        key={member.uid}
                                        className="hover:bg-slate-50/60 dark:hover:bg-slate-950/20 transition-colors"
                                      >
                                        <td className="p-4">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                              {member.name.substring(0, 2)}
                                            </div>
                                            <div className="truncate max-w-[180px]">
                                              <div className="font-bold text-sm text-slate-900 dark:text-slate-50 truncate" title={member.name}>{member.name}</div>
                                              <div className="text-xs text-slate-450 dark:text-slate-500 truncate" title={member.role}>{member.role}</div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                          <div className="truncate max-w-[160px]" title={coachNames}>{coachNames}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                          {renderQuarterBadge("1st", q1)}
                                        </td>
                                        <td className="p-4 text-center">
                                          {renderQuarterBadge("2nd", q2)}
                                        </td>
                                        <td className="p-4 text-center">
                                          {renderQuarterBadge("3rd", q3)}
                                        </td>
                                        <td className="p-4 text-center">
                                          <div className="flex flex-col items-center gap-1">
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                              {compiledCount}/3 <span className="text-[10px] text-slate-400 font-normal">Qtrs</span>
                                            </div>
                                            <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-750">
                                              <div 
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                  compiledCount === 3 
                                                    ? "bg-emerald-500" 
                                                    : compiledCount > 0 
                                                      ? "bg-indigo-500" 
                                                      : pendingCount > 0
                                                        ? "bg-amber-400"
                                                        : "bg-slate-300 dark:bg-slate-700"
                                                }`}
                                                style={{ width: `${(compiledCount / 3) * 100}%` }}
                                              />
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-4 text-right">
                                          {isLeaderOrCoach ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                // Quick compile active quarter or the first non-completed quarter
                                                const targetQuarter = q1.status !== "compiled" ? "1st" : (q2.status !== "compiled" ? "2nd" : "3rd");
                                                handleSelectStaffSummary(member, targetQuarter);
                                              }}
                                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                            >
                                              <FileCheck className="w-3.5 h-3.5" />
                                              <span>Compile</span>
                                            </button>
                                          ) : (
                                            <button
                                              disabled
                                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-lg text-xs font-semibold cursor-not-allowed"
                                            >
                                              <Clock className="w-3.5 h-3.5" />
                                              <span>Staff View</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                <span>
                                  Showing <strong className="text-slate-700 dark:text-slate-300">{Math.min(totalItems, (overviewPage - 1) * itemsPerPage + 1)}</strong> to{" "}
                                  <strong className="text-slate-700 dark:text-slate-300">{Math.min(totalItems, overviewPage * itemsPerPage)}</strong> of{" "}
                                  <strong className="text-slate-700 dark:text-slate-300">{totalItems}</strong> entries
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    id="btn-pagination-prev"
                                    onClick={() => setOverviewPage(prev => Math.max(1, prev - 1))}
                                    disabled={overviewPage === 1}
                                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                                      overviewPage === 1
                                        ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    Previous
                                  </button>
                                  <span className="px-2 font-semibold">
                                    Page {overviewPage} of {totalPages}
                                  </span>
                                  <button
                                    id="btn-pagination-next"
                                    onClick={() => setOverviewPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={overviewPage === totalPages}
                                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                                      overviewPage === totalPages
                                        ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* SUB-TAB: MANAGE (STAFF DIRECTORY GRID) */}
                {evaluationCenterSubTab === "manage" && (
                  filteredStaffProfiles.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 transition-colors duration-200">
                      <UserX className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No active coachees assigned to you.</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                        Once you accept an incoming coaching invitation from a staff member, they will appear in this center so you can review their quadrants and compile evaluations.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* List */}
                      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-4 space-y-2 h-fit transition-colors">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-2">
                          Staff Members
                        </h4>
                        {filteredStaffProfiles.map(s => {
                          const isSelected = selectedStaffUid === s.uid;
                          return (
                            <button
                              key={s.uid}
                              id={`select-staff-btn-${s.uid}`}
                              onClick={() => setSelectedStaffUid(s.uid)}
                              className={`w-full text-left p-4 rounded-xl transition-all border flex items-center justify-between ${
                                isSelected 
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                                  : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              <div>
                                <p className="font-bold text-sm">{s.name}</p>
                                <p className={`text-[11px] ${isSelected ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}>{s.role}</p>
                              </div>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>

                      {/* Details and review trigger panel */}
                      <div className="lg:col-span-7">
                        {selectedStaffUid ? (() => {
                          const member = filteredStaffProfiles.find(s => s.uid === selectedStaffUid)!;
                          if (!member) return null;
                          return (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 space-y-6 animate-fade-in transition-colors">
                              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                                <h4 className="text-lg font-sans font-bold text-slate-950 dark:text-slate-50">{member.name}</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{member.role} • {member.email}</p>
                              </div>

                              {/* Meeting countdown for selected staff */}
                              {meetings.filter(m => m.userId === member.uid).length > 0 && (
                                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4 space-y-2 text-emerald-800 dark:text-emerald-400 transition-colors">
                                  <h5 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    Scheduled Review Meeting
                                  </h5>
                                  {meetings.filter(m => m.userId === member.uid).map(m => (
                                    <p key={m.id} className="text-xs">
                                      {m.quarter} Quarter feedback scheduled for <strong className="font-bold">{m.date}</strong> at <strong className="font-bold">{m.time}</strong>.
                                    </p>
                                  ))}
                                </div>
                              )}

                              {/* Quarters list */}
                              <div className="space-y-4">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quarterly Reviews</h5>
                                {(["1st", "2nd", "3rd"] as const).map(qKey => {
                                  const mReview = allReviews.find(r => r.userId === member.uid && r.quarter === qKey);
                                  const mSummary = allSummaries.find(s => s.userId === member.uid && s.quarter === qKey);
                                  const isFormSubmitted = mReview?.status === "Submitted";
                                  const isSummaryCompiled = !!mSummary;
                                  const progress = calculateReviewProgress(mReview);

                                  return (
                                    <div key={qKey} className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{QUARTER_INFO[qKey].name} Review</span>
                                          {!isQuarterlyUnlockedForUser(qKey) ? (
                                            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/25 px-1.5 py-0.5 rounded border border-amber-200/20 flex items-center gap-0.5">
                                              🔒 Locked by Admin
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/25 px-1.5 py-0.5 rounded border border-emerald-200/20 flex items-center gap-0.5">
                                              🔓 Unlocked
                                            </span>
                                          )}
                                        </div>
                                        
                                        {mReview && (
                                          <div className="flex items-center gap-2 mt-1.5 mb-2 bg-white/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg py-1 px-2 w-fit">
                                            <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                              <div 
                                                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all" 
                                                style={{ width: `${progress.percentage}%` }}
                                              />
                                            </div>
                                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-bold">
                                              {progress.percentage}% ({progress.totalFilled}/36)
                                            </span>
                                          </div>
                                        )}

                                        <div className="flex gap-2.5">
                                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                            isFormSubmitted ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200/20" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                          }`}>
                                            Form: {isFormSubmitted ? "Submitted" : "Not Submitted"}
                                          </span>
                                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                            isSummaryCompiled ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 border border-indigo-200/20" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                          }`}>
                                            Summary: {isSummaryCompiled ? "Compiled" : "Pending"}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          id={`lead-edit-review-${member.uid}-${qKey}`}
                                          onClick={() => handleSelectStaffReview(member, qKey)}
                                          className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg transition-all"
                                        >
                                          Edit/View Form
                                        </button>
                                        <button
                                          id={`lead-edit-summary-${member.uid}-${qKey}`}
                                          onClick={() => handleSelectStaffSummary(member, qKey)}
                                          className="text-xs font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 px-3 py-2 rounded-lg transition-all shadow shadow-indigo-900/10"
                                        >
                                          {isSummaryCompiled ? "Edit Summary" : "Compile Summary"}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                            <HelpCircle className="w-10 h-10 text-slate-300" />
                            <p className="text-sm">Select a staff member from the list to manage their reviews.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}

                {/* Team Evaluation Activity Log Feed */}
                {isAdmin && (
                  <div className="pt-4">
                    <ActivityLogList
                      logs={activityLogs}
                      staffProfiles={filteredStaffProfiles}
                      isLeader={true}
                      onClearLogs={handleClearLogs}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB: ADMIN */}
            {isAdmin && currentTab === "admin" && (
              <div className="space-y-6 animate-fade-in">
                {/* Admin Subtabs Bar */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-px flex gap-4">
                  <button
                    id="admin-subtab-tracking"
                    onClick={() => setAdminSubTab("tracking")}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                      adminSubTab === "tracking"
                        ? "border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    Reports & Reviews
                  </button>
                  <button
                    id="admin-subtab-control"
                    onClick={() => setAdminSubTab("control")}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                      adminSubTab === "control"
                        ? "border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    Settings
                  </button>
                  <button
                    id="admin-subtab-users"
                    onClick={() => setAdminSubTab("users")}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                      adminSubTab === "users"
                        ? "border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    Team Members
                  </button>
                </div>

                {adminSubTab === "tracking" && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Quarter & Year Selector */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl shadow-sm">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Oversight & Compliance Filters</h3>
                        <p className="text-xs text-slate-400">Select reporting boundary for analysis & exports</p>
                      </div>
                      <div className="flex gap-3">
                        <select
                          value={selectedQuarter}
                          onChange={(e) => setSelectedQuarter(e.target.value as any)}
                          className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                        >
                          <option value="1st">1st Quarter</option>
                          <option value="2nd">2nd Quarter</option>
                          <option value="3rd">3rd Quarter</option>
                        </select>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                        >
                          <option value="2024-2025">2024/2025</option>
                          <option value="2025-2026">2025/2026</option>
                          <option value="2026-2027">2026/2027</option>
                        </select>
                      </div>
                    </div>

                    <AdminReports
                      registeredUsers={staffProfiles}
                      allReviews={allReviews}
                      allSummaries={allSummaries}
                      coachingRequests={coachingRequests}
                      currentQuarter={selectedQuarter}
                      currentYear={selectedYear.replace("-", "/")}
                    />
                  </div>
                )}

                {adminSubTab === "control" && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Completion Requirements Admin Card */}
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-sans text-sm text-slate-800 dark:text-slate-200 font-bold">Evaluation Submission Requirements & Rules</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Control which review quadrants must be fully completed (all 3 Strengths, Needs Improvement, and Action Points filled out) before a staff member is allowed to submit their form.
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm text-slate-800 dark:text-slate-200">
                      <input 
                        type="checkbox"
                        checked={requirementSettings.heartRequired}
                        onChange={(e) => handleSaveRequirementSettings({
                          ...requirementSettings,
                          heartRequired: e.target.checked
                        })}
                        className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-semibold">Walk with God (Required)</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm text-slate-800 dark:text-slate-200">
                      <input 
                        type="checkbox"
                        checked={requirementSettings.personalLifeRequired}
                        onChange={(e) => handleSaveRequirementSettings({
                          ...requirementSettings,
                          personalLifeRequired: e.target.checked
                        })}
                        className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-semibold">Personal Life (Required)</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm text-slate-800 dark:text-slate-200">
                      <input 
                        type="checkbox"
                        checked={requirementSettings.relationalLifeRequired}
                        onChange={(e) => handleSaveRequirementSettings({
                          ...requirementSettings,
                          relationalLifeRequired: e.target.checked
                        })}
                        className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-semibold">Relational Life (Required)</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm text-slate-800 dark:text-slate-200">
                      <input 
                        type="checkbox"
                        checked={requirementSettings.ministryEffectivenessRequired}
                        onChange={(e) => handleSaveRequirementSettings({
                          ...requirementSettings,
                          ministryEffectivenessRequired: e.target.checked
                        })}
                        className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-semibold">Ministry (Required)</span>
                    </label>
                  </div>
                </div>

                {/* Quarterly Review Deadlines & Schedule Control */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-sans text-sm text-slate-800 dark:text-slate-200 font-bold">Quarterly Review Dates & Deadlines</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set the specific dates for quarterly reviews. When "Notify Staff" is enabled, staff members will see a prominent announcement banner on their dashboards.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                    {(["1st", "2nd", "3rd"] as const).map(qKey => {
                      const sched = reviewSchedules[qKey] || { startDate: "", dueDate: "", notifyAll: false, notificationMessage: "" };
                      return (
                        <div key={qKey} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                              <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                {qKey} Quarter
                              </span>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                              <input 
                                type="date"
                                value={sched.startDate || ""}
                                onChange={(e) => {
                                  setReviewSchedules(prev => ({
                                    ...prev,
                                    [qKey]: { ...prev[qKey], startDate: e.target.value }
                                  }));
                                }}
                                className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Due Date (Deadline)</label>
                              <input 
                                type="date"
                                value={sched.dueDate || ""}
                                onChange={(e) => {
                                  setReviewSchedules(prev => ({
                                    ...prev,
                                    [qKey]: { ...prev[qKey], dueDate: e.target.value }
                                  }));
                                }}
                                className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                              />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                              <input 
                                type="checkbox"
                                checked={sched.notifyAll || false}
                                onChange={(e) => {
                                  setReviewSchedules(prev => ({
                                    ...prev,
                                    [qKey]: { ...prev[qKey], notifyAll: e.target.checked }
                                  }));
                                }}
                                className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 w-3.5 h-3.5"
                              />
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Notify Staff Members</span>
                            </label>

                            {sched.notifyAll && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Custom Message</label>
                                <input 
                                  type="text"
                                  placeholder="Review period is active..."
                                  value={sched.notificationMessage || ""}
                                  onChange={(e) => {
                                    setReviewSchedules(prev => ({
                                      ...prev,
                                      [qKey]: { ...prev[qKey], notificationMessage: e.target.value }
                                    }));
                                  }}
                                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                              </div>
                            )}

                            {/* Unlock Quarterly Form Control */}
                            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1.5 space-y-2.5">
                              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Quarterly Form Lock/Unlock
                              </span>
                              
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                  type="checkbox"
                                  checked={sched.quarterlyUnlocked || false}
                                  onChange={(e) => {
                                    setReviewSchedules(prev => ({
                                      ...prev,
                                      [qKey]: { ...prev[qKey], quarterlyUnlocked: e.target.checked }
                                    }));
                                  }}
                                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 border-slate-300 dark:border-slate-800"
                                />
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                  🔓 Unlock Instantly
                                </span>
                              </label>

                              <div className="space-y-1">
                                <label className="block text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                  Scheduled Unlock Date
                                </label>
                                <input 
                                  type="date"
                                  value={sched.quarterlyUnlockDate || ""}
                                  onChange={(e) => {
                                    setReviewSchedules(prev => ({
                                      ...prev,
                                      [qKey]: { ...prev[qKey], quarterlyUnlockDate: e.target.value }
                                    }));
                                  }}
                                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                  Scheduled Unlock Time
                                </label>
                                <input 
                                  type="time"
                                  value={sched.quarterlyUnlockTime || ""}
                                  onChange={(e) => {
                                    setReviewSchedules(prev => ({
                                      ...prev,
                                      [qKey]: { ...prev[qKey], quarterlyUnlockTime: e.target.value }
                                    }));
                                  }}
                                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSaveReviewSchedule(
                              qKey, 
                              sched.startDate, 
                              sched.dueDate, 
                              sched.notifyAll, 
                              sched.notificationMessage || "",
                              sched.quarterlyUnlocked || false,
                              sched.quarterlyUnlockDate || "",
                              sched.quarterlyUnlockTime || ""
                            )}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer mt-3"
                          >
                            Save {qKey} Schedule
                          </button>

                          {sched.updatedAt && (
                            <div className="mt-2 flex items-center justify-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50 rounded-lg text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Saved: {new Date(sched.updatedAt).toLocaleTimeString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <AdminCoachingPanel 
                  coachingRequests={coachingRequests}
                  onApproveNomination={handleApproveCoachingRequest}
                  onRejectNomination={handleRejectCoachingRequest}
                  registeredUsers={staffProfiles}
                />
              </div>
            )}

            {adminSubTab === "users" && (
              <div className="animate-fade-in">
                <UserManagement currentUser={user} />
              </div>
            )}
          </div>
        )}
      </div>
    )}
      </main>

      {/* SCHEDULE MODAL */}
      {showScheduler && (
        <div id="scheduler-modal" className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-150 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-slate-900 text-white p-5">
              <h3 className="text-base font-sans font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule Feedback Session
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                The scheduled feedback session will instantly synchronize with the member's dashboard.
              </p>
            </div>

            <form onSubmit={handleScheduleMeeting} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1">Select Staff Member</label>
                <select
                  id="sched-staff-select"
                  value={scheduleStaffUid}
                  onChange={(e) => setScheduleStaffUid(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"
                >
                  {staffProfiles.map(s => (
                    <option key={s.uid} value={s.uid}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1">Select Quarter</label>
                <select
                  id="sched-quarter-select"
                  value={scheduleQuarter}
                  onChange={(e) => setScheduleQuarter(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"
                >
                  <option value="1st">1st Quarter</option>
                  <option value="2nd">2nd Quarter</option>
                  <option value="3rd">3rd Quarter</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1">Meeting Date</label>
                  <input
                    type="date"
                    id="sched-date-input"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1">Meeting Time</label>
                  <input
                    type="time"
                    id="sched-time-input"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 font-mono mb-1">Agenda / Memo Notes</label>
                <textarea
                  id="sched-notes-input"
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50"
                  placeholder="e.g. Bring your suggested action points..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  id="cancel-scheduler-btn"
                  onClick={() => setShowScheduler(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-scheduler-btn"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow shadow-indigo-900/10"
                >
                  Confirm & Sync Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST-SUBMIT COACHING NOMINATION MODAL */}
      {showPostSubmitCoachingModal && user && (
        <div id="post-submit-coaching-modal" className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 relative">
              <h3 className="text-lg font-sans font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                Review Submitted Successfully!
              </h3>
              <p className="text-xs text-indigo-100 mt-1.5 leading-relaxed">
                Thank you! Your review is in. Here's what happens next.
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Next-steps checklist */}
              {(() => {
                const userNominations = coachingRequests.filter(req => req.memberId === user.uid);
                const count = userNominations.length;
                const approved = userNominations.some(r => r.status === "approved");
                const allSet = count === 1 && approved;
                const steps = [
                  { label: "Review submitted", done: true, current: false },
                  { label: count === 1 ? "Coach picked" : "Pick your coach", done: count === 1, current: !allSet && count !== 1 },
                  { label: "Coach accepts your request", done: allSet, current: !allSet && count === 1 },
                ];
                return (
                  <div className={`p-5 rounded-2xl border ${allSet ? "bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800"}`}>
                    {allSet ? (
                      <div className="flex items-start gap-3">
                        <div className="bg-emerald-500 text-white rounded-full p-2.5 shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-sans font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">You're all set! 🎉</h4>
                          <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                            Your review is submitted and your coach is confirmed. They'll get in touch for your reflection session.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-sans font-extrabold text-slate-900 dark:text-slate-100 text-xs mb-3">Your next steps</h4>
                        <ul className="space-y-2.5">
                          {steps.map((step, i) => (
                            <li key={i} className="flex items-center gap-2.5">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                step.done
                                  ? "bg-emerald-500 text-white"
                                  : step.current
                                    ? "bg-indigo-600 text-white animate-pulse"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                              }`}>
                                {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                              </span>
                              <span className={`text-xs ${step.done ? "text-slate-500 line-through" : step.current ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-400"}`}>
                                {step.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {!allSet && count !== 1 && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2">
                            👉 <strong>Now:</strong> Pick one coach below. This is required to finish.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Coach Nomination Form inside Modal */}
              {(() => {
                const userNominations = coachingRequests.filter(req => req.memberId === user.uid);
                const count = userNominations.length;
                const approved = userNominations.some(r => r.status === "approved");
                const allSet = count === 1 && approved;
                return allSet ? null : (
              <div className="space-y-4">
                <div className="space-y-2 relative">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-mono uppercase">
                    Select and Nominate Coach / TL
                  </label>
                  
                  {modalError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {modalError}
                    </p>
                  )}

                  {/* Autocomplete form */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleNominateInModal(modalSearchName);
                  }} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={modalSearchName}
                        onChange={(e) => {
                          setModalSearchName(e.target.value);
                          setShowModalSuggestions(true);
                        }}
                        onFocus={() => setShowModalSuggestions(true)}
                        placeholder="Type or select a coach's name..."
                        className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-3 py-2.5"
                        disabled={coachingRequests.filter(req => req.memberId === user.uid).length >= 1}
                      />
                      {showModalSuggestions && modalSearchName.trim() !== "" && (
                        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                          {(() => {
                            const userNominations = coachingRequests.filter(req => req.memberId === user.uid);
                            const nominatedNames = userNominations.map(r => r.coachName.toLowerCase());
                            const suggestions = staffProfiles.filter(u => 
                              u.uid !== user.uid && 
                              !nominatedNames.includes(u.name.toLowerCase()) &&
                              (u.name.toLowerCase().includes(modalSearchName.toLowerCase()) || (u.role && u.role.toLowerCase().includes(modalSearchName.toLowerCase())))
                            );
                            return suggestions.length > 0 ? (
                              suggestions.map(u => (
                                <button
                                  key={u.uid}
                                  type="button"
                                  onClick={() => {
                                    handleNominateInModal(u.name);
                                    setModalSearchName("");
                                    setShowModalSuggestions(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 font-medium transition-colors flex justify-between items-center"
                                >
                                  <span>{u.name}</span>
                                  <span className="text-slate-400 font-mono text-[10px]">({u.role || "Staff"})</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2.5 text-xs text-slate-400 italic">No matching staff found</div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={!modalSearchName.trim() || coachingRequests.filter(req => req.memberId === user.uid).length >= 1}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 shadow"
                    >
                      <UserPlus className="w-4 h-4" />
                      Nominate
                    </button>
                  </form>
                </div>

                {/* Current Nominated Coaches list */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase">
                    Your Coach Nomination
                  </h4>
                  {coachingRequests.filter(req => req.memberId === user.uid).length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                      No coach nominated yet. Please nominate exactly 1 coach or TL.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {coachingRequests.filter(req => req.memberId === user.uid).map(req => (
                        <div key={req.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{req.coachName}</p>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase ${
                                req.status === "approved" 
                                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600" 
                                  : "bg-amber-50 dark:bg-amber-950 text-amber-600"
                              }`}>
                                {req.status === "approved" ? "Approved by Admin" : "Awaiting Admin Approval"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoachingRequest(req.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 p-6 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono text-center sm:text-left">
                💡 Nominate exactly 1 coach or TL to complete this step.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPostSubmitCoachingModal(false);
                  setModalSearchName("");
                  setModalError("");
                }}
                disabled={coachingRequests.filter(req => req.memberId === user.uid).length !== 1}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                  coachingRequests.filter(req => req.memberId === user.uid).length === 1
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Done & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY COACH / TEAM LEADER EVALUATION MODAL */}
      {activeTLEvaluation && (
        <div id="tl-evaluation-modal" className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-sans font-bold flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  Coach Evaluation Report
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing team leader evaluation for {activeTLEvaluation.member.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="export-tl-eval-pdf-btn-top"
                  onClick={() => {
                    if (isAdmin) {
                      openPdfCustomizer(activeTLEvaluation.member, activeTLEvaluation.quarter, activeTLEvaluation.summary);
                    } else {
                      exportEvaluationToPDF(activeTLEvaluation.member, activeTLEvaluation.quarter, activeTLEvaluation.summary, { isDefaultOnly: true });
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Export Evaluation Report as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  id="close-tl-eval-modal-top"
                  onClick={() => setActiveTLEvaluation(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-850 dark:text-slate-100 flex-1">
              {/* Member & Quarter details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Staff Member</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{activeTLEvaluation.member.name}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Quarter</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{activeTLEvaluation.quarter} Quarter</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Assigned Coach</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {activeTLEvaluation.summary?.evaluation.teamLeaderSignature || "Assigned Coach"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Signed On</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {activeTLEvaluation.summary?.evaluation.teamLeaderSignatureDate || "Unsigned"}
                  </div>
                </div>
              </div>

              {/* Overall Effectiveness */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-550 font-mono uppercase tracking-wider">Overall Effectiveness Assessment</h4>
                {activeTLEvaluation.summary?.evaluation.overallEffectiveness ? (
                  <div className={`p-4 rounded-xl border flex gap-3.5 items-start ${
                    activeTLEvaluation.summary.evaluation.overallEffectiveness === "One of the best"
                      ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/50 text-slate-800 dark:text-slate-200"
                      : activeTLEvaluation.summary.evaluation.overallEffectiveness === "Satisfactory"
                        ? "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/50 text-slate-800 dark:text-slate-200"
                        : "bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/50 text-slate-800 dark:text-slate-200"
                  }`}>
                    <div className={`p-2 rounded-lg font-bold text-xs uppercase shrink-0 ${
                      activeTLEvaluation.summary.evaluation.overallEffectiveness === "One of the best"
                        ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100"
                        : activeTLEvaluation.summary.evaluation.overallEffectiveness === "Satisfactory"
                          ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100"
                          : "bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-100"
                    }`}>
                      {activeTLEvaluation.summary.evaluation.overallEffectiveness === "One of the best" ? "Outstanding" : activeTLEvaluation.summary.evaluation.overallEffectiveness}
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-900 dark:text-slate-50">
                        {activeTLEvaluation.summary.evaluation.overallEffectiveness === "One of the best"
                          ? "One of the best in his/her position"
                          : activeTLEvaluation.summary.evaluation.overallEffectiveness === "Satisfactory"
                            ? "Satisfactory performance matching general criteria"
                            : "Ineffective performance in current position"}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        This reflects the overall evaluation compiled by the team leader based on self-reviews, key developmental activities, and monthly reflection summaries.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No effectiveness score compiled.</p>
                )}
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-emerald-50/15 dark:bg-emerald-950/5 border border-emerald-100/50 dark:border-emerald-900/20 rounded-xl p-5 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    Top 3 Strengths
                  </h5>
                  <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
                    {activeTLEvaluation.summary?.evaluation.strengths.filter(Boolean).map((s, idx) => (
                      <li key={idx} className="flex gap-2 items-start bg-white dark:bg-slate-900/50 p-2.5 rounded-lg border border-emerald-100/20 text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-emerald-600 font-mono">{idx + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                    {(!activeTLEvaluation.summary?.evaluation.strengths || activeTLEvaluation.summary.evaluation.strengths.filter(Boolean).length === 0) && (
                      <li className="text-slate-400 italic">No strengths logged.</li>
                    )}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-amber-50/15 dark:bg-amber-950/5 border border-amber-100/50 dark:border-amber-900/20 rounded-xl p-5 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-mono">
                    <AlertCircle className="w-4 h-4" />
                    Top 3 Weaknesses / Improvements
                  </h5>
                  <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
                    {activeTLEvaluation.summary?.evaluation.weaknesses.filter(Boolean).map((w, idx) => (
                      <li key={idx} className="flex gap-2 items-start bg-white dark:bg-slate-900/50 p-2.5 rounded-lg border border-amber-100/20 text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-amber-600 font-mono">{idx + 1}.</span>
                        <span>{w}</span>
                      </li>
                    ))}
                    {(!activeTLEvaluation.summary?.evaluation.weaknesses || activeTLEvaluation.summary.evaluation.weaknesses.filter(Boolean).length === 0) && (
                      <li className="text-slate-400 italic">No weaknesses logged.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Areas Lacking Confidence */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-550 font-mono uppercase tracking-wider">Growth Warning Area</h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Areas where the staff lacks confidence or has struggled:
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic whitespace-pre-wrap leading-relaxed">
                    {activeTLEvaluation.summary?.evaluation.lackConfidence 
                      ? `"${activeTLEvaluation.summary.evaluation.lackConfidence}"` 
                      : "None noted by the coach."}
                  </p>
                </div>
              </div>

              {/* Greater Responsibility Recommendation */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-550 font-mono uppercase tracking-wider">Readiness for Greater Responsibility</h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Ready for Greater Responsibility?</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      activeTLEvaluation.summary?.evaluation.readyForGreaterResp === "Yes"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      {activeTLEvaluation.summary?.evaluation.readyForGreaterResp || "No"}
                    </span>
                  </div>
                  {activeTLEvaluation.summary?.evaluation.readyForGreaterResp === "Yes" && activeTLEvaluation.summary?.evaluation.greaterRespDetails && (
                    <div className="text-xs border-t border-slate-200/50 dark:border-slate-800 pt-2.5 space-y-1.5">
                      <div className="font-bold text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">Recommendation details (Position and Timeframe):</div>
                      <div className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 space-y-1">
                        <div><strong>Position Suggestion:</strong> {activeTLEvaluation.summary.evaluation.greaterRespDetails.position || "N/A"}</div>
                        <div><strong>Suggested Timeframe:</strong> {activeTLEvaluation.summary.evaluation.greaterRespDetails.when || "N/A"}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reassignment Recommendations */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-555 font-mono uppercase tracking-wider">Re-assignment Recommendation</h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Recommended for re-assignment?</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      activeTLEvaluation.summary?.evaluation.recommendReassignment === "Yes"
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      {activeTLEvaluation.summary?.evaluation.recommendReassignment || "No"}
                    </span>
                  </div>
                  {activeTLEvaluation.summary?.evaluation.recommendReassignment === "Yes" && activeTLEvaluation.summary?.evaluation.reassignmentDetails && (
                    <div className="text-xs border-t border-slate-200/50 dark:border-slate-800 pt-2.5 space-y-1.5">
                      <div className="font-bold text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">Reassignment reasons & specific department suggestions:</div>
                      <div className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 space-y-1">
                        <div><strong>Proposed Position/Location:</strong> {activeTLEvaluation.summary.evaluation.reassignmentDetails.positionLocation || "N/A"}</div>
                        <div><strong>Reasons:</strong> {activeTLEvaluation.summary.evaluation.reassignmentDetails.why || "N/A"}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Verified signatures */}
              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Coach/Team Leader Sign-Off</div>
                  <div className="space-y-1 text-slate-800 dark:text-slate-250">
                    <p className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {activeTLEvaluation.summary?.evaluation.teamLeaderSignature || "Assigned Coach"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Date: {activeTLEvaluation.summary?.evaluation.teamLeaderSignatureDate || "Unsigned"}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Form Reviewed By</div>
                  <div className="space-y-1 text-slate-800 dark:text-slate-250">
                    <p className="font-bold flex items-center gap-1">
                      {activeTLEvaluation.summary?.evaluation.formReviewedBy ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          {activeTLEvaluation.summary.evaluation.formReviewedBy}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Pending Admin Review</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Date: {activeTLEvaluation.summary?.evaluation.formReviewedByDate || "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 p-4 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                Official Report • Dynamic Encryption Checked
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isAdmin && activeTLEvaluation.summary && !activeTLEvaluation.summary.evaluation.formReviewedBy && activeTLEvaluation.summary.status === "CoachSubmitted" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleAdminSignOff(activeTLEvaluation.summary!, activeTLEvaluation.member.name);
                        setActiveTLEvaluation(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Sign-off & Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeclineSummaryTarget({ summary: activeTLEvaluation.summary!, memberName: activeTLEvaluation.member.name })}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/25 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      <span>Decline Report</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  id="export-tl-eval-pdf-btn-bottom"
                  onClick={() => {
                    if (isAdmin) {
                      openPdfCustomizer(activeTLEvaluation.member, activeTLEvaluation.quarter, activeTLEvaluation.summary);
                    } else {
                      exportEvaluationToPDF(activeTLEvaluation.member, activeTLEvaluation.quarter, activeTLEvaluation.summary, { isDefaultOnly: true });
                    }
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  id="close-tl-eval-modal-btn"
                  onClick={() => setActiveTLEvaluation(null)}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Dialog Modal */}
      {declineSummaryTarget && (
        <div id="decline-dialog-modal" className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 w-full max-w-md overflow-hidden animate-scale-up flex flex-col">
            <div className="bg-rose-900 text-white p-5">
              <h3 className="text-base font-sans font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-300 shrink-0 animate-bounce" />
                Decline Evaluation Report
              </h3>
              <p className="text-xs text-rose-100 mt-1">
                Request changes from Coach for {declineSummaryTarget.memberName}'s evaluation.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Reason for Decline / Requested Changes
                </label>
                <textarea
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-250 h-32 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  placeholder="Specify exactly what needs to be updated or corrected (e.g., 'Please elaborate on the development goals in the weaknesses section' or 'Ensure the strengths align with the CMO outcomes...')"
                  value={declineReasonText}
                  onChange={(e) => setDeclineReasonText(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 p-4 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDeclineSummaryTarget(null);
                  setDeclineReasonText("");
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!declineReasonText.trim()) {
                    alert("Please provide a reason.");
                    return;
                  }
                  handleAdminDecline(declineSummaryTarget.summary, declineReasonText, declineSummaryTarget.memberName);
                  setDeclineSummaryTarget(null);
                  setDeclineReasonText("");
                  setActiveTLEvaluation(null); // Also close the preview modal if it was open
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Decline & Send Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Decline Dialog Modal */}
      {showBulkDeclineModal && (
        <div id="bulk-decline-dialog-modal" className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 w-full max-w-md overflow-hidden animate-scale-up flex flex-col">
            <div className="bg-rose-900 text-white p-5">
              <h3 className="text-base font-sans font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-300 shrink-0 animate-bounce" />
                Bulk Decline Selected Reports
              </h3>
              <p className="text-xs text-rose-100 mt-1">
                This will decline all {selectedEvaluations.length} selected pending reports and request coach revisions.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Shared Reason for Decline / Requested Changes
                </label>
                <textarea
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-250 h-32 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  placeholder="Specify a shared reason for the bulk decline (e.g., 'Please ensure quarterly SMART goals are defined' or 'We need to update evaluation targets...')"
                  value={bulkDeclineReason}
                  onChange={(e) => setBulkDeclineReason(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 p-4 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowBulkDeclineModal(false);
                  setBulkDeclineReason("");
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!bulkDeclineReason.trim()) {
                    alert("Please provide a reason.");
                    return;
                  }
                  handleBulkAdminDecline(bulkDeclineReason);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Decline All Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Progress Indicator Modal */}
      {bulkActionProgress.type !== null && (
        <div id="bulk-action-progress-modal" className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-150 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-scale-up p-6 flex flex-col items-center">
            {/* Spinning/pulsing action icon container */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 relative">
              <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-current" style={{ color: bulkActionProgress.type === "decline" ? "#f43f5e" : "#4f46e5" }} />
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
                bulkActionProgress.type === "decline" 
                  ? "bg-rose-50 dark:bg-rose-950 text-rose-500 dark:text-rose-400" 
                  : "bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400"
              }`}>
                {bulkActionProgress.type === "decline" ? (
                  <ShieldAlert className="w-7 h-7" />
                ) : (
                  <Download className="w-7 h-7 animate-bounce" />
                )}
              </div>
            </div>

            {/* Title and stats description */}
            <h4 className="text-sm font-bold font-sans text-slate-800 dark:text-slate-100 text-center uppercase tracking-wider">
              {bulkActionProgress.type === "decline" ? "Bulk Declining Reports" : "Bulk Exporting PDFs"}
            </h4>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1.5">
              Processing {bulkActionProgress.current} of {bulkActionProgress.total} reports...
            </p>

            {/* Progress percentage label */}
            <div className="w-full flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-6">
              <span>Progress</span>
              <span>{Math.round((bulkActionProgress.current / bulkActionProgress.total) * 100)}%</span>
            </div>

            {/* Sleek Progress Bar component */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden shadow-inner relative border border-slate-200/40 dark:border-slate-700/40">
              <div 
                className={`h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r ${
                  bulkActionProgress.type === "decline"
                    ? "from-rose-500 to-rose-600"
                    : "from-indigo-500 to-indigo-600"
                }`}
                style={{ width: `${(bulkActionProgress.current / bulkActionProgress.total) * 100}%` }}
              />
            </div>

            {/* Friendly warning notice */}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-5 leading-normal max-w-[240px]">
              Please do not refresh or close the portal window until processing is fully completed.
            </span>
          </div>
        </div>
      )}

      {/* PDF Export Customizer Modal */}
      {pdfExportConfig && pdfExportConfig.isOpen && (
        <div id="pdf-export-customizer-modal" className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 w-full max-w-md overflow-hidden animate-scale-up flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-sans font-bold flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-200" />
                  Configure PDF Export
                </h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  {pdfExportConfig.isBulk 
                    ? `Exporting ${pdfExportConfig.bulkItems?.length || 0} selected report(s)` 
                    : `Exporting evaluation for ${pdfExportConfig.member?.name || "Staff Member"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPdfExportConfig(null)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-slate-800 dark:text-slate-100">
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Select Export Mode
                </label>
                
                {/* Option 1: Default ONLY */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={pdfIsDefaultOnly}
                    onChange={() => {
                      setPdfIsDefaultOnly(true);
                    }}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Default Export (Team Leader Evaluation Only)</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-50 block leading-relaxed">
                      Only include the TL evaluation page with the Staff Member, Quarter / Year, Assigned Coach, and Date Joined Staff.
                    </span>
                  </div>
                </label>

                {/* Option 2: Custom Selection */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={!pdfIsDefaultOnly}
                    onChange={() => {
                      setPdfIsDefaultOnly(false);
                    }}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Custom Selection</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-50 block leading-relaxed">
                      Customize which pages and components from the report to bundle in the PDF.
                    </span>
                  </div>
                </label>
              </div>

              {/* Section checkboxes, visible and interactive only when Custom is active */}
              <div className={`space-y-3 transition-opacity duration-200 ${pdfIsDefaultOnly ? "opacity-45 pointer-events-none" : "opacity-100"}`}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Include Sections
                </label>
                
                <div className="space-y-2 pl-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfIncludePDP}
                      onChange={(e) => setPdfIncludePDP(e.target.checked)}
                      disabled={pdfIsDefaultOnly}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Personal Development Plan (PDP) Reviews</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfIncludeCMO}
                      onChange={(e) => setPdfIncludeCMO(e.target.checked)}
                      disabled={pdfIsDefaultOnly}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Critical Mission Objectives (CMO) Performance</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfIncludeKDA}
                      onChange={(e) => setPdfIncludeKDA(e.target.checked)}
                      disabled={pdfIsDefaultOnly}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Key Development Assignments (KDA) Progress</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfIncludeSuggestions}
                      onChange={(e) => setPdfIncludeSuggestions(e.target.checked)}
                      disabled={pdfIsDefaultOnly}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Departmental Improvement Suggestions</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 p-4 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPdfExportConfig(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const exportOptions = {
                    isDefaultOnly: pdfIsDefaultOnly,
                    includePDP: pdfIsDefaultOnly ? false : pdfIncludePDP,
                    includeCMO: pdfIsDefaultOnly ? false : pdfIncludeCMO,
                    includeKDA: pdfIsDefaultOnly ? false : pdfIncludeKDA,
                    includeSuggestions: pdfIsDefaultOnly ? false : pdfIncludeSuggestions,
                  };

                  try {
                    if (pdfExportConfig.isBulk && pdfExportConfig.bulkItems) {
                      const items = pdfExportConfig.bulkItems;
                      setPdfExportConfig(null); // Close modal first
                      setBulkActionProgress({ total: items.length, current: 0, type: "export" });

                      let completedCount = 0;
                      for (const item of items) {
                        exportEvaluationToPDF(item.member, item.quarter, item.summary, exportOptions);
                        completedCount++;
                        setBulkActionProgress(prev => ({ ...prev, current: completedCount }));
                        await new Promise(resolve => setTimeout(resolve, 300));
                      }

                      alert(`Successfully generated PDF exports for ${items.length} reports!`);
                    } else if (pdfExportConfig.member && pdfExportConfig.quarter) {
                      exportEvaluationToPDF(
                        pdfExportConfig.member,
                        pdfExportConfig.quarter,
                        pdfExportConfig.summary,
                        exportOptions
                      );
                      setPdfExportConfig(null);
                    }
                  } catch (e: any) {
                    console.error("Error during export:", e);
                    alert(`Failed to complete export: ${e.message}`);
                  } finally {
                    setBulkActionProgress({ total: 0, current: 0, type: null });
                  }
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            id="toast-notification"
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md max-w-sm ${
              toast.type === "success"
                ? "bg-emerald-50/95 dark:bg-emerald-950/95 text-emerald-800 dark:text-emerald-100 border-emerald-200/50 dark:border-emerald-900/50"
                : "bg-rose-50/95 dark:bg-rose-950/95 text-rose-800 dark:text-rose-100 border-rose-200/50 dark:border-rose-900/50"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <div className="flex-1 text-xs font-semibold leading-normal font-sans">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
