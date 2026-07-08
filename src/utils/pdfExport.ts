import { jsPDF } from "jspdf";
import { UserProfile, QuarterlySummary } from "../types";

export interface PDFExportOptions {
  isDefaultOnly?: boolean;
  includePDP?: boolean;
  includeCMO?: boolean;
  includeKDA?: boolean;
  includeSuggestions?: boolean;
}

export function exportEvaluationToPDF(
  member: UserProfile,
  quarter: "1st" | "2nd" | "3rd",
  summary?: QuarterlySummary,
  options?: PDFExportOptions
) {
  const opt = options || { isDefaultOnly: true };
  const isDefaultOnly = opt.isDefaultOnly ?? false;
  const includePDP = isDefaultOnly ? false : (opt.includePDP ?? true);
  const includeCMO = isDefaultOnly ? false : (opt.includeCMO ?? true);
  const includeKDA = isDefaultOnly ? false : (opt.includeKDA ?? true);
  const includeSuggestions = isDefaultOnly ? false : (opt.includeSuggestions ?? true);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width; // 210
  const pageHeight = doc.internal.pageSize.height; // 297
  const marginX = 15;
  const usableWidth = pageWidth - marginX * 2; // 180

  let y = 15;
  let pageNum = 1;

  // Helper to draw headers on every page
  const drawPageDecorations = (currentPage: number) => {
    // Top border accent
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, pageWidth, 4, "F");

    // Confidentiality Tag & Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text("STRICTLY CONFIDENTIAL", marginX, 10);

    doc.setFont("helvetica", "normal");
    doc.text("COACH EVALUATION & DEVELOPMENT PORTAL", pageWidth - marginX - 70, 10);

    // Footer
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Exported: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
      marginX,
      pageHeight - 8
    );

    const totalPagesStr = "Page " + currentPage;
    doc.text(totalPagesStr, pageWidth - marginX - 15, pageHeight - 8);
  };

  const checkPageOverflow = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      pageNum++;
      y = 18;
      drawPageDecorations(pageNum);
    }
  };

  // Draw Page 1 header and decorations
  drawPageDecorations(pageNum);

  // Document Main Title Banner
  y = 16;
  doc.setFillColor(15, 23, 42); // slate-900 (deep charcoal)
  doc.rect(marginX, y, usableWidth, 24, "F");

  // Title Text inside banner
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("COACH EVALUATION REPORT", marginX + 6, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `Official review and professional evaluation report compiled by Assigned Coach.`,
    marginX + 6,
    y + 15
  );

  y += 24;

  // Metadata Grid Block (4 Rows for full Staff Profile coverage or simplified 2-row block)
  y += 6;
  if (isDefaultOnly) {
    checkPageOverflow(34);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, usableWidth, 28, "FD");

    const colW = usableWidth / 2; // 90 mm each
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500

    // Row 1 Labels
    doc.text("STAFF MEMBER NAME", marginX + 5, y + 5);
    doc.text("ASSIGNED COACH", marginX + colW + 4, y + 5);

    // Row 1 Values
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(summary?.staffName || member.name, marginX + 5, y + 9.5);
    doc.text(summary?.evaluation?.teamLeaderSignature || summary?.coachName || "Assigned Coach", marginX + colW + 4, y + 9.5);

    // Row 1 Divider
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(marginX + 4, y + 13, marginX + usableWidth - 4, y + 13);

    // Row 2 Labels
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("DATE JOINED STAFF", marginX + 5, y + 18);
    doc.text("QUARTER / YEAR", marginX + colW + 4, y + 18);

    // Row 2 Values
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(summary?.dateJoinedStaff || "N/A", marginX + 5, y + 22.5);
    doc.text(`${quarter} Quarter / ${summary?.year || "N/A"}`, marginX + colW + 4, y + 22.5);

    y += 28;
  } else {
    checkPageOverflow(62);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, usableWidth, 56, "FD");

    // Inside Metadata Details
    const colW = usableWidth / 3; // 60 mm each
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500

    // --- ROW 1 ---
    doc.text("STAFF MEMBER NAME", marginX + 5, y + 5);
    doc.text("CURRENT ROLE POSITION", marginX + colW + 4, y + 5);
    doc.text("TEAM LEADER (TL) NAME", marginX + colW * 2 + 4, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(summary?.staffName || member.name, marginX + 5, y + 9.5);
    doc.text(summary?.position || member.role || "N/A", marginX + colW + 4, y + 9.5);
    doc.text(summary?.teamLeaderName || "N/A", marginX + colW * 2 + 4, y + 9.5);

    // Row 1 Divider
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(marginX + 4, y + 12.5, marginX + usableWidth - 4, y + 12.5);

    // --- ROW 2 ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("DATE JOINED STAFF", marginX + 5, y + 17.5);
    doc.text("DATE COMPLETED", marginX + colW + 4, y + 17.5);
    doc.text("QUARTER / YEAR", marginX + colW * 2 + 4, y + 17.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(summary?.dateJoinedStaff || "N/A", marginX + 5, y + 22);
    doc.text(summary?.date || "N/A", marginX + colW + 4, y + 22);
    doc.text(`${quarter} Quarter / ${summary?.year || "N/A"}`, marginX + colW * 2 + 4, y + 22);

    // Row 2 Divider
    doc.line(marginX + 4, y + 25, marginX + usableWidth - 4, y + 25);

    // --- ROW 3 ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("PRESENT POSITION SINCE", marginX + 5, y + 30);
    doc.text("SUPERVISED BY LEADER SINCE", marginX + colW + 4, y + 30);
    doc.text("ASSIGNED COACH", marginX + colW * 2 + 4, y + 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(summary?.presentPositionSince || "N/A", marginX + 5, y + 34.5);
    doc.text(summary?.supervisedBySince || "N/A", marginX + colW + 4, y + 34.5);
    doc.text(summary?.evaluation?.teamLeaderSignature || summary?.coachName || "Assigned Coach", marginX + colW * 2 + 4, y + 34.5);

    // Row 3 Divider
    doc.line(marginX + 4, y + 37.5, marginX + usableWidth - 4, y + 37.5);

    // --- ROW 4 ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("STAFF EMAIL", marginX + 5, y + 42.5);
    doc.text("REVIEWER NAME / POSITION", marginX + colW + 4, y + 42.5);
    doc.text("FORM STATUS", marginX + colW * 2 + 4, y + 42.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(member.email || "N/A", marginX + 5, y + 47);
    doc.text(summary?.reviewerNamePosition || "N/A", marginX + colW + 4, y + 47);

    // Badge background for Status in Row 4
    const status = summary?.status || "Pending";
    let statusColor = [100, 116, 139]; // Default slate
    if (status === "CoachSubmitted") statusColor = [5, 150, 105]; // Green-600
    if (status === "Submitted") statusColor = [217, 119, 6]; // Amber-600
    if (status === "Declined") statusColor = [220, 38, 38]; // Rose-600

    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.rect(marginX + colW * 2 + 4, y + 43.5, 30, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(status === "CoachSubmitted" ? "APPROVED" : status.toUpperCase(), marginX + colW * 2 + 7, y + 47);

    y += 56;
  }

  if (includePDP) {
    // --- SECTION A: PERSONAL DEVELOPMENT PLAN (PDP) REVIEWS ---
    y += 8;
    checkPageOverflow(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("A. PERSONAL DEVELOPMENT PLAN (PDP) REVIEWS", marginX, y);

    doc.setDrawColor(224, 231, 255); // indigo-100
    doc.setLineWidth(0.4);
    doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
    y += 5;

    const pdpCategories = ["heart", "personalLife", "relationalLife"] as const;
    pdpCategories.forEach((cat) => {
      const item = summary?.pdp?.[cat];
      const catLabel = cat === "heart" ? "Heart Walk (Discipleship)" :
                        cat === "personalLife" ? "Personal Life (Wellbeing)" : "Relational Life (Community)";

      // Prepare text lines to count height
      const goalVal = item?.goal || (item as any)?.objective || "None";
      const objText = `Objective: ${goalVal}`;
      const targetText = `Target Outcome: ${item?.desiredResult || "None"}`;
      const progressText = quarter === "2nd" ? `Progress Made: ${item?.progressMade || "None"}` : "";
      const changesText = quarter === "2nd" ? `Changes Needed: ${item?.changesNeeded || "None"}` : "";
      const nextStepText = quarter === "3rd" ? `Next Growth Step: ${item?.nextStep || "None"}` : "";

      const linesObj = doc.splitTextToSize(objText, usableWidth - 10);
      const linesTarget = doc.splitTextToSize(targetText, usableWidth - 10);
      const linesProgress = progressText ? doc.splitTextToSize(progressText, usableWidth - 10) : [];
      const linesChanges = changesText ? doc.splitTextToSize(changesText, usableWidth - 10) : [];
      const linesNext = nextStepText ? doc.splitTextToSize(nextStepText, usableWidth - 10) : [];

      let cardHeight = 6 + (linesObj.length + linesTarget.length) * 4 + 4;
      if (quarter === "2nd") cardHeight += (linesProgress.length + linesChanges.length) * 4 + 4;
      if (quarter === "3rd") cardHeight += linesNext.length * 4 + 4;

      checkPageOverflow(cardHeight + 6);

      // Draw card background
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.2);
      doc.rect(marginX, y, usableWidth, cardHeight, "FD");

      // Header inside card
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text(catLabel, marginX + 4, y + 5);

      // Write text details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85); // slate-700
      
      let curY = y + 9;
      doc.text(linesObj, marginX + 4, curY);
      curY += linesObj.length * 4;
      
      doc.text(linesTarget, marginX + 4, curY);
      curY += linesTarget.length * 4;

      if (quarter === "2nd") {
        if (linesProgress.length > 0) {
          doc.text(linesProgress, marginX + 4, curY);
          curY += linesProgress.length * 4;
        }
        if (linesChanges.length > 0) {
          doc.text(linesChanges, marginX + 4, curY);
          curY += linesChanges.length * 4;
        }
      } else if (quarter === "3rd") {
        if (linesNext.length > 0) {
          doc.text(linesNext, marginX + 4, curY);
          curY += linesNext.length * 4;
        }
      }

      y += cardHeight + 4;
    });
  }

  if (includeCMO) {
    // --- SECTION B: CRITICAL MISSION OBJECTIVES (CMO) ---
    y += 4;
    checkPageOverflow(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("B. CRITICAL MISSION OBJECTIVES (CMO) PERFORMANCE", marginX, y);

    doc.setDrawColor(224, 231, 255); // indigo-100
    doc.setLineWidth(0.4);
    doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
    y += 5;

    const cmoList = summary?.cmo || [];
    if (cmoList.length > 0) {
      cmoList.forEach((cmoItem, idx) => {
        const descText = `Goal description: ${cmoItem.objective || "None"}`;
        const outcomeText = `Expected outcome: ${cmoItem.desiredResult || "None"}`;
        const progressText = quarter === "2nd" ? `Progress Made: ${cmoItem.progressMade || "None"}` : "";
        const changesText = quarter === "2nd" ? `Changes Needed: ${cmoItem.changesNeeded || "None"}` : "";
        const nextStepText = quarter === "3rd" ? `Next Growth Step: ${cmoItem.nextStep || "None"}` : "";

        const linesDesc = doc.splitTextToSize(descText, usableWidth - 25);
        const linesOutcome = doc.splitTextToSize(outcomeText, usableWidth - 25);
        const linesProgress = progressText ? doc.splitTextToSize(progressText, usableWidth - 25) : [];
        const linesChanges = changesText ? doc.splitTextToSize(changesText, usableWidth - 25) : [];
        const linesNext = nextStepText ? doc.splitTextToSize(nextStepText, usableWidth - 25) : [];

        let itemHeight = 6 + (linesDesc.length + linesOutcome.length) * 4 + 4;
        if (quarter === "2nd") itemHeight += (linesProgress.length + linesChanges.length) * 4 + 4;
        if (quarter === "3rd") itemHeight += linesNext.length * 4 + 4;

        checkPageOverflow(itemHeight + 6);

        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.rect(marginX, y, usableWidth, itemHeight, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`Objective #${idx + 1}`, marginX + 4, y + 5);

        // Draw achievement score badge on the right
        doc.setFillColor(79, 70, 229); // Indigo-600
        doc.rect(marginX + usableWidth - 18, y + 2, 14, 4.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        doc.text(`${cmoItem.percentageAchieved || 0}% Done`, marginX + usableWidth - 17, y + 5.2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85); // slate-700
        
        let curY = y + 9;
        doc.text(linesDesc, marginX + 4, curY);
        curY += linesDesc.length * 4;

        doc.text(linesOutcome, marginX + 4, curY);
        curY += linesOutcome.length * 4;

        if (quarter === "2nd") {
          if (linesProgress.length > 0) {
            doc.text(linesProgress, marginX + 4, curY);
            curY += linesProgress.length * 4;
          }
          if (linesChanges.length > 0) {
            doc.text(linesChanges, marginX + 4, curY);
            curY += linesChanges.length * 4;
          }
        } else if (quarter === "3rd") {
          if (linesNext.length > 0) {
            doc.text(linesNext, marginX + 4, curY);
            curY += linesNext.length * 4;
          }
        }

        y += itemHeight + 4;
      });
    } else {
      checkPageOverflow(12);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("No critical mission objectives compiled for this period.", marginX, y + 4);
      y += 8;
    }
  }

  if (includeKDA) {
    // --- SECTION C: KEY DEVELOPMENT ASSIGNMENTS (KDA) ---
    y += 4;
    checkPageOverflow(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("C. KEY DEVELOPMENT ASSIGNMENTS (KDA) PROGRESS", marginX, y);

    doc.setDrawColor(224, 231, 255); // indigo-100
    doc.setLineWidth(0.4);
    doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
    y += 5;

    const kdaList = summary?.kda || [];
    if (kdaList.length > 0) {
      kdaList.forEach((kdaItem, idx) => {
        const delVal = kdaItem.assignment || (kdaItem as any).keyDeliverable || "None";
        const commentsVal = (kdaItem as any).comments || kdaItem.nextStep || "None";
        const delivText = `Deliverable: ${delVal}`;
        const commentsText = `Remarks/Comments: ${commentsVal}`;
        const progressText = quarter === "2nd" ? `Progress Made: ${kdaItem.progressMade || "None"}` : "";
        const changesText = quarter === "2nd" ? `Changes Needed: ${kdaItem.changesNeeded || "None"}` : "";
        const nextStepText = quarter === "3rd" ? `Next Growth Step: ${kdaItem.nextStep || "None"}` : "";

        const linesDeliv = doc.splitTextToSize(delivText, usableWidth - 10);
        const linesComments = doc.splitTextToSize(commentsText, usableWidth - 10);
        const linesProgress = progressText ? doc.splitTextToSize(progressText, usableWidth - 10) : [];
        const linesChanges = changesText ? doc.splitTextToSize(changesText, usableWidth - 10) : [];
        const linesNext = nextStepText ? doc.splitTextToSize(nextStepText, usableWidth - 10) : [];

        let itemHeight = 6 + (linesDeliv.length + linesComments.length) * 4 + 4;
        if (quarter === "2nd") itemHeight += (linesProgress.length + linesChanges.length) * 4 + 4;
        if (quarter === "3rd") itemHeight += linesNext.length * 4 + 4;

        checkPageOverflow(itemHeight + 6);

        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.rect(marginX, y, usableWidth, itemHeight, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`Assignment #${idx + 1}`, marginX + 4, y + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85); // slate-700
        
        let curY = y + 9;
        doc.text(linesDeliv, marginX + 4, curY);
        curY += linesDeliv.length * 4;

        doc.text(linesComments, marginX + 4, curY);
        curY += linesComments.length * 4;

        if (quarter === "2nd") {
          if (linesProgress.length > 0) {
            doc.text(linesProgress, marginX + 4, curY);
            curY += linesProgress.length * 4;
          }
          if (linesChanges.length > 0) {
            doc.text(linesChanges, marginX + 4, curY);
            curY += linesChanges.length * 4;
          }
        } else if (quarter === "3rd") {
          if (linesNext.length > 0) {
            doc.text(linesNext, marginX + 4, curY);
            curY += linesNext.length * 4;
          }
        }

        y += itemHeight + 4;
      });
    } else {
      checkPageOverflow(12);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("No key development assignments compiled for this period.", marginX, y + 4);
      y += 8;
    }
  }

  if (includeSuggestions) {
    // --- SUGGESTIONS SECTION ---
    const suggs = summary?.suggestions || [];
    if (suggs.some(s => s && s.trim())) {
      y += 4;
      checkPageOverflow(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text("D. DEPARTMENTAL IMPROVEMENT SUGGESTIONS", marginX, y);

      doc.setDrawColor(224, 231, 255); // indigo-100
      doc.setLineWidth(0.4);
      doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
      y += 5;

      suggs.forEach((sug, idx) => {
        if (!sug || !sug.trim()) return;
        const linesSug = doc.splitTextToSize(`${idx + 1}. ${sug}`, usableWidth - 10);
        const cardHeight = linesSug.length * 4 + 8;

        checkPageOverflow(cardHeight + 4);

        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.rect(marginX, y, usableWidth, cardHeight, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.text(linesSug, marginX + 4, y + 6);

        y += cardHeight + 4;
      });
    }
  }

  // Section 1: Overall Effectiveness Assessment
  y += 8;
  checkPageOverflow(26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text("1. OVERALL EFFECTIVENESS ASSESSMENT", marginX, y);
  
  // Line separator
  doc.setDrawColor(224, 231, 255); // indigo-100
  doc.setLineWidth(0.4);
  doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
  y += 5;

  const effectiveness = summary?.evaluation.overallEffectiveness || "";
  if (effectiveness) {
    let effBoxColor = [237, 241, 245]; // Muted grey
    let effTextColor = [100, 116, 139];
    let effTag = "Unspecified";
    let effDesc = "No overall effectiveness score compiled by the team leader.";

    if (effectiveness === "One of the best") {
      effBoxColor = [209, 250, 229]; // light green-100
      effTextColor = [6, 95, 70]; // green-800
      effTag = "OUTSTANDING";
      effDesc = "One of the best in his/her position. Consistently exceeds performance standards and displays high competency and developmental commitment.";
    } else if (effectiveness === "Satisfactory") {
      effBoxColor = [224, 231, 255]; // indigo-100
      effTextColor = [30, 58, 138]; // indigo-900
      effTag = "SATISFACTORY";
      effDesc = "Satisfactory performance matching general criteria. Demonstrates stable competencies and fulfills expected developmental objectives.";
    } else if (effectiveness === "Ineffective") {
      effBoxColor = [254, 226, 226]; // red-100
      effTextColor = [153, 27, 27]; // red-800
      effTag = "INEFFECTIVE";
      effDesc = "Ineffective performance in current position. Fails to meet developmental criteria. Significant attention, coaching or reassignment is advised.";
    }

    doc.setFillColor(effBoxColor[0], effBoxColor[1], effBoxColor[2]);
    doc.rect(marginX, y, usableWidth, 18, "F");

    // Text in rating box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(effTextColor[0], effTextColor[1], effTextColor[2]);
    doc.text(effTag, marginX + 5, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // slate-800
    const wrappedRatingDesc = doc.splitTextToSize(effDesc, usableWidth - 34);
    doc.text(wrappedRatingDesc, marginX + 30, y + 6);

    y += 18;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("No overall assessment compiled yet.", marginX, y + 4);
    y += 6;
  }

  // Section 2: Strengths & Weaknesses
  y += 8;
  checkPageOverflow(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text("2. CORE COMPETENCIES & DEVELOPMENTAL INSIGHTS", marginX, y);
  
  doc.setDrawColor(224, 231, 255); // indigo-100
  doc.setLineWidth(0.4);
  doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
  y += 5;

  const halfWidth = usableWidth / 2 - 3;
  
  // Strengths column left, Weaknesses column right
  const startYColumns = y;
  let leftY = startYColumns + 5;
  let rightY = startYColumns + 5;

  // Strengths box
  doc.setFillColor(240, 253, 250); // teal-50
  doc.rect(marginX, startYColumns, halfWidth, 42, "F");
  doc.setDrawColor(204, 251, 241); // teal-100
  doc.setLineWidth(0.3);
  doc.rect(marginX, startYColumns, halfWidth, 42, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text("TOP 3 STRENGTHS", marginX + 4, startYColumns + 5);

  const strengths = summary?.evaluation.strengths || [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85); // slate-700
  let strIndex = 1;
  strengths.forEach((str) => {
    if (str.trim()) {
      const wrappedStr = doc.splitTextToSize(`${strIndex}. ${str}`, halfWidth - 8);
      doc.text(wrappedStr, marginX + 4, leftY + 6);
      leftY += Math.max(wrappedStr.length * 4, 8);
      strIndex++;
    }
  });
  if (strIndex === 1) {
    doc.text("No strengths compiled.", marginX + 4, startYColumns + 12);
  }

  // Weaknesses box
  doc.setFillColor(254, 243, 199); // amber-50
  doc.rect(pageWidth - marginX - halfWidth, startYColumns, halfWidth, 42, "F");
  doc.setDrawColor(253, 230, 138); // amber-200
  doc.setLineWidth(0.3);
  doc.rect(pageWidth - marginX - halfWidth, startYColumns, halfWidth, 42, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text("AREAS FOR IMPROVEMENT", pageWidth - marginX - halfWidth + 4, startYColumns + 5);

  const weaknesses = summary?.evaluation.weaknesses || [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85); // slate-700
  let weakIndex = 1;
  weaknesses.forEach((weak) => {
    if (weak.trim()) {
      const wrappedWeak = doc.splitTextToSize(`${weakIndex}. ${weak}`, halfWidth - 8);
      doc.text(wrappedWeak, pageWidth - marginX - halfWidth + 4, rightY + 6);
      rightY += Math.max(wrappedWeak.length * 4, 8);
      weakIndex++;
    }
  });
  if (weakIndex === 1) {
    doc.text("No weaknesses compiled.", pageWidth - marginX - halfWidth + 4, startYColumns + 12);
  }

  y = startYColumns + 42;

  // Section 3: Growth Warning Area
  y += 8;
  checkPageOverflow(26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text("3. GROWTH WARNING & CONFIDENCE GAP", marginX, y);
  
  doc.setDrawColor(224, 231, 255); // indigo-100
  doc.setLineWidth(0.4);
  doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
  y += 5;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);

  const lackConfidence = summary?.evaluation.lackConfidence || "None noted by the coach.";
  const wrappedLack = doc.splitTextToSize(lackConfidence, usableWidth - 8);
  const lackBoxHeight = Math.max(wrappedLack.length * 4 + 8, 16);

  checkPageOverflow(lackBoxHeight + 4);
  doc.rect(marginX, y, usableWidth, lackBoxHeight, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(wrappedLack, marginX + 4, y + 6);

  y += lackBoxHeight;

  // Section 4: Recommendations
  y += 8;
  checkPageOverflow(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text("4. CAREER TRACK & PLACEMENT RECOMMENDATIONS", marginX, y);
  
  doc.setDrawColor(224, 231, 255); // indigo-100
  doc.setLineWidth(0.4);
  doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
  y += 5;

  // Greater Responsibility block
  const readyResp = summary?.evaluation.readyForGreaterResp || "No";
  const positionDetails = summary?.evaluation.greaterRespDetails?.position || "N/A";
  const timeframeDetails = summary?.evaluation.greaterRespDetails?.when || "N/A";

  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(marginX, y, usableWidth, readyResp === "Yes" ? 22 : 12, "F");
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(marginX, y, usableWidth, readyResp === "Yes" ? 22 : 12, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Readiness for Greater Responsibility:", marginX + 4, y + 7.5);

  doc.setFillColor(readyResp === "Yes" ? 209 : 241, readyResp === "Yes" ? 250 : 245, readyResp === "Yes" ? 229 : 249);
  doc.rect(marginX + 62, y + 4.5, 12, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(readyResp === "Yes" ? 6 : 71, readyResp === "Yes" ? 95 : 85, readyResp === "Yes" ? 70 : 105);
  doc.text(readyResp, marginX + 66, y + 8.2);

  if (readyResp === "Yes") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Suggested Position: ${positionDetails}`, marginX + 4, y + 13.5);
    doc.text(`Expected Timeframe: ${timeframeDetails}`, marginX + 4, y + 17.5);
  }

  y += readyResp === "Yes" ? 22 : 12;

  // Reassignment block
  y += 4;
  const recommendReassign = summary?.evaluation.recommendReassignment || "No";
  const reassignPosition = summary?.evaluation.reassignmentDetails?.positionLocation || "N/A";
  const reassignWhy = summary?.evaluation.reassignmentDetails?.why || "N/A";

  const wrappedWhy = doc.splitTextToSize(`Reasons: ${reassignWhy}`, usableWidth - 8);
  const reassignHeight = recommendReassign === "Yes" ? Math.max(16 + wrappedWhy.length * 4, 22) : 12;

  checkPageOverflow(reassignHeight + 4);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(marginX, y, usableWidth, reassignHeight, "F");
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(marginX, y, usableWidth, reassignHeight, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Recommend Reassignment / Transfer:", marginX + 4, y + 7.5);

  doc.setFillColor(recommendReassign === "Yes" ? 254 : 241, recommendReassign === "Yes" ? 243 : 245, recommendReassign === "Yes" ? 199 : 249);
  doc.rect(marginX + 62, y + 4.5, 12, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(recommendReassign === "Yes" ? 180 : 71, recommendReassign === "Yes" ? 83 : 85, recommendReassign === "Yes" ? 9 : 105);
  doc.text(recommendReassign, marginX + 66, y + 8.2);

  if (recommendReassign === "Yes") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Proposed Department/Location: ${reassignPosition}`, marginX + 4, y + 13.5);
    doc.text(wrappedWhy, marginX + 4, y + 17.5);
  }

  y += reassignHeight;

  // Section 5: Signature Blocks
  y += 8;
  checkPageOverflow(34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text("5. OFFICIAL PORTAL SIGNATURE VALIDATION", marginX, y);
  
  doc.setDrawColor(224, 231, 255); // indigo-100
  doc.setLineWidth(0.4);
  doc.line(marginX, y + 2, marginX + usableWidth, y + 2);
  y += 5;

  // Draw 2 column signature block
  const sigColW = usableWidth / 2 - 3;
  checkPageOverflow(26);

  // Left Column: Team Leader Signature
  doc.setFillColor(250, 251, 252);
  doc.rect(marginX, y, sigColW, 20, "F");
  doc.setDrawColor(241, 245, 249);
  doc.rect(marginX, y, sigColW, 20, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("COACH SIGNATURE VERIFIED", marginX + 4, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`SIGNED: ${summary?.evaluation.teamLeaderSignature || "Assigned Coach"}`, marginX + 4, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Signed Date: ${summary?.evaluation.teamLeaderSignatureDate || "N/A"}`, marginX + 4, y + 16);

  // Right Column: Admin Sign-Off
  doc.setFillColor(250, 251, 252);
  doc.rect(pageWidth - marginX - sigColW, y, sigColW, 20, "F");
  doc.setDrawColor(241, 245, 249);
  doc.rect(pageWidth - marginX - sigColW, y, sigColW, 20, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("ADMINISTRATOR REVIEW SIGN-OFF", pageWidth - marginX - sigColW + 4, y + 5);

  const adminName = summary?.evaluation.formReviewedBy;
  const adminDate = summary?.evaluation.formReviewedByDate;

  if (adminName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`APPROVED BY: ${adminName}`, pageWidth - marginX - sigColW + 4, y + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Approval Date: ${adminDate || "N/A"}`, pageWidth - marginX - sigColW + 4, y + 16);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Status: Awaiting Admin Sign-Off & Approval", pageWidth - marginX - sigColW + 4, y + 12);
  }

  y += 20;

  // PDF Download action
  const filename = `${member.name.replace(/\s+/g, "_")}_Q${quarter}_Evaluation_Report.pdf`;
  doc.save(filename);
}
