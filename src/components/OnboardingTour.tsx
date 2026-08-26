import { useEffect, useRef } from "react";
import introJs from "intro.js";
import "intro.js/introjs.css";

interface OnboardingTourProps {
  isAdmin: boolean;
  isLeader: boolean;
  onComplete?: () => void;
}

export default function OnboardingTour({ isAdmin, isLeader, onComplete }: OnboardingTourProps) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const TOUR_KEY = "asseso_onboarding_completed";
    if (localStorage.getItem(TOUR_KEY)) return;

    const tour = introJs().setOptions({
      nextLabel: "Next →",
      prevLabel: "← Back",
      doneLabel: "Got it!",
      showBullets: false,
      showProgress: true,
      highlightClass: "onboarding-highlight",
      tooltipClass: "onboarding-tooltip",
      overlayOpacity: 0.6,
      exitOnOverlayClick: false,
      keyboardNavigation: true,
    });

    const steps: Array<{ title: string; intro: string; element?: string }> = [
      {
        title: "Welcome to Asseso",
        intro: "This is your staff development portal. You can fill self-reviews, track progress, and get coaching feedback — all in one place. Let's take a quick tour!",
      },
      {
        title: "Your Dashboard",
        intro: "This is where you land after login. All your quarterly reviews and summaries appear here as cards.",
        element: "#tab-btn-my-reviews",
      },
      {
        title: "Quarterly Reviews",
        intro: "Click any quarter to open your <strong>Development Review</strong> — a self-reflection on Heart, Personal Life, Relational Life, and Ministry. Fill it out and submit to your coach.",
        element: "#tab-btn-my-reviews",
      },
    ];

    if (isLeader || isAdmin) {
      steps.push({
        title: "Team Evaluation Center",
        intro: "As a coach or leader, click here to see your coached staff members, open their summaries, and fill out the <strong>TL Evaluation</strong> tab.",
        element: "#tab-btn-team-reviews",
      });
    }

    if (isAdmin) {
      steps.push({
        title: "Access Directory (Admin)",
        intro: "The admin dashboard. Here you can manage users, view all evaluations, export PDFs, generate AI-synthesized reports, and schedule coaching sessions.",
        element: "#tab-btn-admin",
      });

      steps.push({
        title: "Admin Sub-Tabs",
        intro: "<strong>Tracking</strong> — follow-up tasks<br><strong>Control</strong> — all evaluations, PDF exports, AI reports<br><strong>Users</strong> — manage roles and permissions",
        element: "#admin-subtab-tracking",
      });
    }

    steps.push({
      title: "You're All Set!",
      intro: "That's it! Start by opening a quarter and filling out your review. You can always come back to this tour by clearing your browser data. Good luck!",
    });

    tour.setSteps(steps as any);

    tour.oncomplete(() => {
      localStorage.setItem(TOUR_KEY, "true");
      onComplete?.();
    });

    tour.onexit(() => {
      localStorage.setItem(TOUR_KEY, "true");
      onComplete?.();
    });

    // Small delay so the DOM is fully rendered
    const timer = setTimeout(() => {
      tour.start();
    }, 800);

    return () => clearTimeout(timer);
  }, [isAdmin, isLeader, onComplete]);

  return null;
}
