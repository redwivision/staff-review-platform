import React, { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, UserRound, X } from "lucide-react";
import { UserProfile } from "../types";
import { useLanguage } from "../i18n";
import {
  SEARCH_RESULT_CAP,
  searchPeople,
  useClickOutside,
  useDebouncedValue,
} from "../utils/search";

/** One row in the popover: either a person, or the "nobody" row. */
type PickerOption =
  | { kind: "person"; person: UserProfile }
  | { kind: "clear"; person: null };

interface StaffPickerProps {
  /** Everyone who may be picked. */
  people: UserProfile[];
  /** Currently selected uid, or null/undefined for "nobody". */
  value: string | null | undefined;
  onChange: (uid: string | null) => void;
  /** Which person is using this picker; never offered as an option. */
  excludeUid?: string;
  /** Label shown on the collapsed control. */
  placeholder?: string;
  /** Option text for "no one". Omit to make the picker require a choice. */
  clearLabel?: string;
  disabled?: boolean;
  id?: string;
  /** Secondary line under the name, e.g. the person's role. */
  describe?: (person: UserProfile) => string;
  className?: string;
}

/**
 * A typeahead replacement for a native `<select>` of people.
 *
 * A native select with a few thousand `<option>` children is unusable: the
 * browser has to build every option node up front, there is no way to filter,
 * and opening the list on macOS scrolls one row at a time. This renders at most
 * `SEARCH_RESULT_CAP` rows no matter how big the roster is, filters as you
 * type, and keeps the current selection visible when the input is empty.
 *
 * Both the coach pickers (one per staff row, so the cost is per-row) and the
 * single-shot pickers (schedule a session, filter the activity log) use this,
 * which is what keeps the admin tables usable at 5000 users.
 */
export default function StaffPicker({
  people,
  value,
  onChange,
  excludeUid,
  placeholder,
  clearLabel,
  disabled,
  id,
  describe,
  className = "",
}: StaffPickerProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 180);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  const candidates = useMemo(
    () => (excludeUid ? people.filter(p => p.uid !== excludeUid) : people),
    [people, excludeUid]
  );

  const selected = useMemo(
    () => candidates.find(p => p.uid === value) ?? null,
    [candidates, value]
  );

  // When closed and not searching, show the selection first; otherwise show the
  // best matches. An empty roster falls through to the clear option.
  const { results, total, truncated } = useMemo(
    () => searchPeople(candidates, debouncedQuery, SEARCH_RESULT_CAP),
    [candidates, debouncedQuery]
  );

  const options = useMemo<PickerOption[]>(() => {
    const rows: PickerOption[] = results.map(p => ({ kind: "person", person: p }));
    if (clearLabel !== undefined) {
      rows.unshift({ kind: "clear", person: null });
    }
    return rows;
  }, [results, clearLabel]);

  const commit = (uid: string | null) => {
    onChange(uid);
    setOpen(false);
    setQuery("");
    setHighlight(0);
  };

  const openPicker = () => {
    if (disabled) return;
    setOpen(true);
    // Focus after the popover is mounted so the caret lands in the input.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { openPicker(); return; }
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setHighlight(h => Math.min(options.length - 1, Math.max(0, h + delta)));
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      const picked = options[highlight];
      if (picked) commit(picked.person ? picked.person.uid : null);
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); setOpen(false); setQuery(""); }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const selectedIndex = options.findIndex(o => o.person?.uid === value);
  const activeIndex = open ? highlight : (selectedIndex > 0 ? selectedIndex : 0);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`w-full flex items-center gap-2 text-left rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
          value
            ? "border-emerald-200 bg-white text-emerald-800 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300"
            : "border-amber-300 bg-white text-amber-800 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300"
        }`}
      >
        {selected ? (
          <>
            <UserRound className="w-3.5 h-3.5 shrink-0 opacity-70" />
            <span className="truncate flex-1">
              {selected.name}
              {describe && (
                <span className="block text-[10px] font-normal opacity-70 truncate">{describe(selected)}</span>
              )}
            </span>
          </>
        ) : (
          <>
            <UserRound className="w-3.5 h-3.5 shrink-0 opacity-70" />
            <span className="truncate flex-1">{placeholder ?? t("No Coach Assigned")}</span>
          </>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {value && !disabled && !open && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); commit(null); }}
          title={t("Clear")}
          aria-label={t("Clear")}
          className="absolute -right-1.5 -top-1.5 p-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 shadow-sm"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setHighlight(0); }}
              onKeyDown={onKeyDown}
              placeholder={t("Search by name...")}
              aria-label={t("Search by name")}
              className="w-full bg-transparent outline-none text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label={t("Clear search")}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-slate-400">
                {t("No matches found")}
              </li>
            )}

            {options.map((option, i) => {
              const isSelected = option.person ? option.person.uid === value : !value;
              const isActive = i === activeIndex;
              if (option.kind === "clear") {
                return (
                  <li key="__clear" role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => commit(null)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${
                        isActive ? "bg-indigo-50 dark:bg-indigo-950/50" : ""
                      }`}
                    >
                      <X className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="flex-1 text-slate-600 dark:text-slate-300">{clearLabel}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                    </button>
                  </li>
                );
              }
              const person = option.person!;
              return (
                <li key={person.uid} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => commit(person.uid)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${
                      isActive ? "bg-indigo-50 dark:bg-indigo-950/50" : ""
                    }`}
                  >
                    <UserRound className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-slate-800 dark:text-slate-100">{person.name}</span>
                      {describe && (
                        <span className="block truncate text-[10px] text-slate-400">{describe(person)}</span>
                      )}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {truncated && (
            <p className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
              {t("Showing {shown} of {total} — keep typing to narrow it down", {
                shown: options.length,
                total,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
