import { useEffect, useMemo, useRef, useState } from "react";
import { UserProfile } from "../types";

/**
 * Search helpers shared by every people-picker in the app.
 *
 * The roster is expected to reach several thousand people, so these exist to
 * keep three promises:
 *   1. a keystroke never scans more rows than the cap below,
 *   2. matching is forgiving of the way people actually type names
 *      (extra spaces, different case, an Amharic name with no Latin fallback),
 *   3. callers can debounce so typing does not re-filter on every character.
 */

/** How many results a picker will ever render at once. */
export const SEARCH_RESULT_CAP = 60;

/**
 * Lowercase, strip combining marks, and collapse whitespace.
 *
 * Stripping accents lets "Bogale" match "Bogalé" and "Mesfin" match "Mésfin",
 * which matters for Ethiopian names that are often written both ways. Ethiopic
 * script has no case and no combining marks in practice, so this is a no-op
 * for Amharic text and therefore safe to run over every keystroke.
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every whitespace-separated term in `needle` appears in `haystack`. */
function matchesAllTerms(haystack: string, needle: string): boolean {
  return needle.split(" ").every(term => haystack.includes(term));
}

export interface PersonMatchOptions {
  /** Extra fields to match against, e.g. a role filter label. */
  extraFields?: string[];
}

/**
 * Does this person match the search text? Matches name and email, and lets the
 * caller opt additional fields in.
 */
export function personMatches(person: UserProfile, rawNeedle: string, opts: PersonMatchOptions = {}): boolean {
  // The needle needs the same normalization as the haystack, otherwise an
  // accented query ("Bogalé") never matches the stored name ("Bogale").
  const needle = normalizeForSearch(rawNeedle);
  if (!needle) return true;
  const haystack = normalizeForSearch(
    [person.name, person.email, person.role, ...(opts.extraFields ?? [])].filter(Boolean).join(" ")
  );
  return matchesAllTerms(haystack, needle);
}

/**
 * Filter the roster down to at most `cap` matches, reporting the true total so
 * the UI can say "showing 60 of 812". Callers should never render more than the
 * cap: a `<select>` or list of several thousand nodes is what makes the browser
 * unusable, not the filtering itself.
 */
export function searchPeople(
  people: UserProfile[],
  rawNeedle: string,
  cap: number = SEARCH_RESULT_CAP,
  opts: PersonMatchOptions = {}
): { results: UserProfile[]; total: number; truncated: boolean } {
  const needle = normalizeForSearch(rawNeedle);
  // An empty needle still has to respect the cap: "show everyone" is exactly
  // the case that would otherwise render the full roster.
  if (!needle) {
    return {
      results: people.slice(0, cap),
      total: people.length,
      truncated: people.length > cap,
    };
  }

  const matches: UserProfile[] = [];
  let total = 0;
  for (const person of people) {
    if (personMatches(person, needle, opts)) {
      total += 1;
      if (matches.length < cap) matches.push(person);
    }
  }
  return { results: matches, total, truncated: total > matches.length };
}

/**
 * Debounce a value. Search inputs drive full-table re-filters, so waiting a
 * couple of hundred milliseconds turns "one scan per character" into "one scan
 * per word".
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Split a list into pages, clamping the page index so that shrinking the list
 * (or filtering) never leaves the caller stranded on an empty page.
 */
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  const goTo = (next: number) => setPage(Math.min(totalPages, Math.max(1, next)));

  return {
    page: safePage,
    pageItems,
    totalPages,
    totalItems: items.length,
    setPage: goTo,
    next: () => goTo(safePage + 1),
    prev: () => goTo(safePage - 1),
    rangeStart: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(items.length, safePage * pageSize),
  };
}

/** Close a popover when the user clicks anywhere outside `ref`. */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T>,
  onOutside: () => void,
  active: boolean
) {
  const handler = useRef(onOutside);
  handler.current = onOutside;

  useEffect(() => {
    if (!active) return;
    const listener = (event: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) handler.current();
    };
    // Capture phase so we beat any handler that stops propagation.
    document.addEventListener("mousedown", listener, true);
    return () => document.removeEventListener("mousedown", listener, true);
  }, [ref, active]);
}
