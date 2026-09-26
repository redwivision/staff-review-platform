import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../i18n";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
  className?: string;
}

/**
 * Shared "Showing X–Y of Z" pager. The admin tables needed the same control in
 * four places, and they all need it because none of them can render a full
 * roster: a few thousand table rows, each with its own controls, is enough to
 * lock up the tab.
 */
export default function Pagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  onPrev,
  onNext,
  label,
  className = "",
}: PaginationProps) {
  const { t } = useLanguage();
  if (totalItems === 0) return null;

  const btn = "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all disabled:cursor-not-allowed";
  const idle = "bg-slate-50 border-slate-200 text-slate-400";
  const live = "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 ${className}`}>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
        {t("Showing {start}-{end} of {total}", { start: rangeStart, end: rangeEnd, total: totalItems })}
        {label && <span className="ml-1.5 font-sans text-slate-400">{label}</span>}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 1}
          aria-label={t("Previous page")}
          className={`${btn} ${page === 1 ? idle : live}`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="sr-only">{t("Previous page")}</span>
        </button>
        <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page === totalPages}
          aria-label={t("Next page")}
          className={`${btn} ${page === totalPages ? idle : live}`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="sr-only">{t("Next page")}</span>
        </button>
      </div>
    </div>
  );
}
