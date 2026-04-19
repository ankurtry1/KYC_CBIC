"use client";

import type { ReactNode } from "react";
import type { OfficerSearchResult, SearchableOfficerRecord } from "@/lib/officers/search";
import { cn } from "@/lib/utils/cn";

type SuggestionOfficer = SearchableOfficerRecord;

type SearchSuggestionsProps<T extends SuggestionOfficer> = {
  query: string;
  suggestions: OfficerSearchResult<T>[];
  activeIndex: number;
  isOpen: boolean;
  isLoading?: boolean;
  className?: string;
  testId?: string;
  onActiveIndexChange: (index: number) => void;
  onSelect: (suggestion: OfficerSearchResult<T>) => void;
};

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string | null | undefined, query: string): ReactNode {
  const value = text ?? "";
  const tokens = [...new Set(query.trim().split(/\s+/).filter((token) => token.length >= 2))];
  if (!value || tokens.length === 0) return value;

  const matcher = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "ig");
  const parts = value.split(matcher);

  return parts.map((part, index) => {
    if (tokens.some((token) => part.toLowerCase() === token.toLowerCase())) {
      return (
        <mark key={`${part}-${index}`} className="rounded bg-accentSoft px-0.5 text-accent">
          {part}
        </mark>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function SearchSuggestions<T extends SuggestionOfficer>({
  query,
  suggestions,
  activeIndex,
  isOpen,
  isLoading = false,
  className,
  testId = "search-suggestions",
  onActiveIndexChange,
  onSelect
}: SearchSuggestionsProps<T>): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div
      data-testid={testId}
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+0.6rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated",
        className
      )}
    >
      {isLoading ? (
        <div className="px-4 py-3 text-sm text-slate-500">Loading suggestions…</div>
      ) : suggestions.length === 0 ? (
        <div className="px-4 py-3 text-sm text-slate-500">No matching officers found.</div>
      ) : (
        <ul role="listbox" aria-label="Officer suggestions" className="max-h-[24rem] overflow-y-auto py-1">
          {suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex;
            const location = suggestion.officer.current_location ?? "Station unavailable";
            const designation = suggestion.officer.current_designation ?? "Designation unavailable";

            return (
              <li key={suggestion.officer.id}>
                <button
                  data-testid={`${testId}-item-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => onActiveIndexChange(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(suggestion);
                  }}
                  className={cn(
                    "flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition",
                    isActive ? "bg-accentSoft/70" : "hover:bg-slate-50"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {highlightText(suggestion.officer.name ?? "Name unavailable", query)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      ID {highlightText(suggestion.officer.employee_id, query)}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-600">
                      {highlightText(designation, query)}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {highlightText(location, query)}
                    </p>
                  </div>
                  {suggestion.match?.primaryLabel ? (
                    <span className="mt-0.5 shrink-0 rounded-full border border-accent/20 bg-accentSoft px-2 py-1 text-[11px] font-semibold text-accent">
                      {suggestion.match.primaryLabel}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
