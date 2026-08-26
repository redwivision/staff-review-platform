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
      disableInteraction: false,
    });

    const buildSteps = (): Array<{ title: string; intro: string; element?: string }> => {
      const steps: Array<{ title: string; intro: string; element?: string }> = [
        {
          title: "Welcome to Asseso",
          intro: "This is where you track your growth, fill out reviews, and get feedback from your coach. Everything is in one place.",
        },
        {
          title: "Your Reviews",
          intro: "This tab shows all your quarterly reviews. Click <strong>Open Form</strong> on any quarter to start or continue filling it out.",
          element: "#tab-btn-my-reviews",
        },
        {
          title: "How it Works",
          intro: "<strong>Step 1:</strong> Fill out your self-review (4 sections).<br><strong>Step 2:</strong> Submit it to your coach.<br><strong>Step 3:</strong> Your coach reviews and submits it to Admin.<br>That's it!",
        },
      ];

      if (isLeader || isAdmin) {
        steps.push({
          title: "Your Team",
          intro: "See all the staff you coach. Open their summaries, fill out the <strong>Coach's Review</strong> section, and submit to Admin.",
          element: "#tab-btn-team-reviews",
        });
      }

      if (isAdmin) {
        steps.push({
          title: "Admin Dashboard",
          intro: "View all evaluations across the organization, export PDFs, and generate AI-synthesized staff reports.",
          element: "#tab-btn-admin",
        });
      }

      steps.push({
        title: "You're Ready!",
        intro: "Start by opening a quarter and filling out your review. You can always replay this tour by clearing your browser data.",
      });

      return steps;
    };

    tour.setSteps(buildSteps() as any);

    tour.oncomplete(() => {
      localStorage.setItem(TOUR_KEY, "true");
      onComplete?.();
    });

    tour.onexit(() => {
      localStorage.setItem(TOUR_KEY, "true");
      onComplete?.();
    });

    // Poll for the target element to exist in the DOM before starting
    let retryCount = 0;
    const MAX_RETRIES = 20;
    let retryTimer: ReturnType<typeof setTimeout>;

    const startTour = () => {
      const target = document.querySelector("#tab-btn-my-reviews");
      if (target) {
        tour.start();
        return;
      }
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        retryTimer = setTimeout(startTour, 500);
      }
    };

    retryTimer = setTimeout(startTour, 1000);
    return () => clearTimeout(retryTimer);
  }, [isAdmin, isLeader, onComplete]);

  return null;
}
