"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { OfficerFilters, OfficerIndexRecord } from "@/lib/officers/types";
import type { OfficerDirectoryState } from "@/lib/officers/directory";
import {
  buildOfficerDirectoryHref,
  directoryHasActiveAdvancedFilters,
  parseOfficerDirectoryState
} from "@/lib/officers/directory";
import { buildOfficerProfileHref } from "@/lib/officers/navigation";
import { SearchSuggestions } from "@/components/officers/SearchSuggestions";
import {
  consumeSearchNavigationDuration,
  logOfficerPerf,
  markProfileNavigationStart,
  markSearchNavigationStart
} from "@/lib/officers/perf";
import {
  buildOfficerSearchIndex,
  DEFAULT_FILTERS,
  deriveFilterOptions,
  getStrongDirectOfficerMatch,
  MIN_SEARCH_SUGGEST_CHARS,
  searchOfficersDetailed,
  suggestOfficers
} from "@/lib/officers/search";
import { OfficerSearch } from "@/components/officers/OfficerSearch";
import { OfficerFiltersPanel } from "@/components/officers/OfficerFilters";
import { OfficerCard } from "@/components/officers/OfficerCard";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type OfficerDirectoryClientProps = {
  records: OfficerIndexRecord[];
  initialState: OfficerDirectoryState;
};

const PAGE_SIZE = 24;
const SUGGEST_DEBOUNCE_MS = 120;

export function OfficerDirectoryClient({
  records,
  initialState
}: OfficerDirectoryClientProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlState = useMemo(
    () => parseOfficerDirectoryState(searchParams ?? undefined),
    [searchParams]
  );
  const filters = urlState.filters;
  const requestedPage = urlState.page || initialState.page;
  const [searchInput, setSearchInput] = useState(initialState.filters.q);
  const [debouncedSearchInput, setDebouncedSearchInput] = useState(initialState.filters.q);
  const [showFilters, setShowFilters] = useState(() => directoryHasActiveAdvancedFilters(initialState.filters));
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => deriveFilterOptions(records), [records]);
  const searchIndex = useMemo(() => buildOfficerSearchIndex(records), [records]);
  const directorySearch = useMemo(
    () => searchOfficersDetailed(searchIndex, filters),
    [filters, searchIndex]
  );
  const results = directorySearch.results;
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const filtersRef = useRef(filters);
  const pageRef = useRef(page);
  const currentDirectoryHref = useMemo(() => buildOfficerDirectoryHref(filters, page), [filters, page]);
  const pagedResults = useMemo(
    () => results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, results]
  );
  const bestMatch = useMemo(() => {
    if (!filters.q.trim() || page !== 1) return null;
    const candidate = results[0];
    if (!candidate?.match) return null;
    return candidate.match.score >= 3300 ? candidate : null;
  }, [filters.q, page, results]);
  const suggestions = useMemo(
    () => suggestOfficers(searchIndex, debouncedSearchInput, 8),
    [debouncedSearchInput, searchIndex]
  );
  const directSuggestionMatch = useMemo(
    () => getStrongDirectOfficerMatch(suggestions, debouncedSearchInput),
    [debouncedSearchInput, suggestions]
  );

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchInput(searchInput.trim());
    }, SUGGEST_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (directoryHasActiveAdvancedFilters(filters)) {
      setShowFilters(true);
    }
  }, [filters]);

  useEffect(() => {
    filtersRef.current = filters;
    pageRef.current = page;
  }, [filters, page]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [debouncedSearchInput]);

  useEffect(() => {
    if (page !== requestedPage) {
      startTransition(() => {
        router.replace(buildOfficerDirectoryHref(filters, page), { scroll: false });
      });
    }
  }, [filters, page, requestedPage, router]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (!searchWrapperRef.current?.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const navMs = consumeSearchNavigationDuration(filters.q);
    logOfficerPerf("directory-search", {
      query: filters.q || "(browse)",
      mode: directorySearch.diagnostics.mode,
      filtered: directorySearch.diagnostics.filteredCount,
      candidates: directorySearch.diagnostics.candidateCount,
      results: directorySearch.diagnostics.resultCount,
      filterMs: directorySearch.diagnostics.filterMs,
      candidateMs: directorySearch.diagnostics.candidateMs,
      scoreMs: directorySearch.diagnostics.scoreMs,
      sortMs: directorySearch.diagnostics.sortMs,
      totalMs: directorySearch.diagnostics.totalMs,
      navMs
    });
  }, [directorySearch.diagnostics, filters.q]);

  useEffect(() => {
    if (!isSuggestionsOpen || suggestions.length === 0) return;

    suggestions.slice(0, 3).forEach((suggestion) => {
      router.prefetch(`/officers/${suggestion.officer.id}`);
    });
  }, [isSuggestionsOpen, router, suggestions]);

  function navigate(nextFilters: OfficerFilters, nextPage = 1): void {
    filtersRef.current = nextFilters;
    pageRef.current = nextPage;
    startTransition(() => {
      router.replace(buildOfficerDirectoryHref(nextFilters, nextPage), { scroll: false });
    });
  }

  function updateFilters(patch: Partial<OfficerFilters>, resetPage = true): void {
    navigate(
      {
        ...filtersRef.current,
        ...patch
      },
      resetPage ? 1 : pageRef.current
    );
  }

  function suggestionReturnTo(nextQuery: string): string {
    return buildOfficerDirectoryHref(
      {
        ...filtersRef.current,
        q: nextQuery.trim()
      },
      1
    );
  }

  function navigateToSuggestionProfile(officerId: string, nextQuery = searchInput): void {
    const returnTo = suggestionReturnTo(nextQuery);
    markProfileNavigationStart(officerId);
    setIsSuggestionsOpen(false);
    startTransition(() => {
      router.push(buildOfficerProfileHref(officerId, returnTo));
    });
  }

  function applySearchNow(): void {
    const trimmed = searchInput.trim();
    if (trimmed && directSuggestionMatch) {
      navigateToSuggestionProfile(directSuggestionMatch.officer.id, trimmed);
      return;
    }

    markSearchNavigationStart(trimmed);
    updateFilters({ q: trimmed });
    setIsSuggestionsOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (!isSuggestionsOpen || suggestions.length === 0) {
      if (event.key === "Escape") {
        setIsSuggestionsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      navigateToSuggestionProfile(suggestions[activeSuggestionIndex].officer.id, searchInput);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  }

  const activeAdvancedCount = [
    filters.batch !== "all",
    filters.designation !== "all",
    filters.location !== "all",
    filters.verification !== "all",
    filters.timelineQuality !== "all",
    filters.sortBy !== "name",
    filters.sortOrder !== "asc"
  ].filter(Boolean).length;

  const quickCadres = options.cadres.slice(0, 4);

  return (
    <div data-testid="officers-directory" className="space-y-4">
      <div className="panel p-3 sm:p-4 lg:sticky lg:top-[4.75rem] lg:z-20">
        <div ref={searchWrapperRef}>
          <OfficerSearch
            value={searchInput}
            onChange={(value) => {
              setSearchInput(value);
              if (value.trim().length >= MIN_SEARCH_SUGGEST_CHARS) {
                setIsSuggestionsOpen(true);
              }
            }}
            onSubmit={applySearchNow}
            onClear={() => {
              setSearchInput("");
              setIsSuggestionsOpen(false);
              if (filters.q) {
                navigate({ ...filters, q: DEFAULT_FILTERS.q }, 1);
              }
            }}
            onFocus={() => {
              if (searchInput.trim().length >= MIN_SEARCH_SUGGEST_CHARS) {
                setIsSuggestionsOpen(true);
              }
            }}
            onKeyDown={handleSearchKeyDown}
            isSubmitting={isPending}
            suggestions={
              <SearchSuggestions
                query={debouncedSearchInput}
                suggestions={suggestions}
                activeIndex={activeSuggestionIndex}
                isOpen={isSuggestionsOpen && debouncedSearchInput.length >= MIN_SEARCH_SUGGEST_CHARS}
                testId="directory-search-suggestions"
                onActiveIndexChange={setActiveSuggestionIndex}
                onSelect={(suggestion) => navigateToSuggestionProfile(suggestion.officer.id, searchInput)}
              />
            }
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p data-testid="directory-results-count" className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-800">{formatNumber(results.length)}</span>{" "}
            {filters.q.trim() ? (
              <>
                results for <span className="font-semibold text-slate-800">&ldquo;{filters.q.trim()}&rdquo;</span>
              </>
            ) : (
              "officers"
            )}
          </p>
          {isPending ? (
            <span
              data-testid="directory-search-pending"
              className="rounded-full border border-accent/20 bg-accentSoft px-2.5 py-1 text-xs font-semibold text-accent"
            >
              Updating results…
            </span>
          ) : null}
          <button
            data-testid="directory-toggle-filters"
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showFilters ? "Hide advanced filters" : "More filters"}
            {activeAdvancedCount > 0 ? (
              <span className="rounded-full bg-accentSoft px-1.5 py-0.5 text-[11px] text-accent">
                {activeAdvancedCount}
              </span>
            ) : null}
          </button>
        </div>

        <div data-testid="directory-quick-filters" className="mt-2 flex flex-wrap items-center gap-2">
          <button
            data-testid="quick-filter-all"
            type="button"
            onClick={() =>
              navigate(
                {
                  ...filters,
                cadre: "all",
                batch: "all",
                designation: "all",
                location: "all",
                timelineQuality: "all",
                verification: "all",
                sortBy: "name",
                sortOrder: "asc"
                },
                1
              )
            }
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition",
              filters.cadre === "all" && filters.timelineQuality === "all" && filters.verification === "all"
                ? "border-accent/40 bg-accentSoft text-accent"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            All profiles
          </button>
          {quickCadres.map((cadre) => (
            <button
              key={cadre}
              data-testid={`quick-filter-cadre-${cadre.toLowerCase()}`}
              type="button"
              onClick={() => updateFilters({ cadre })}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                filters.cadre === cadre
                  ? "border-accent/40 bg-accentSoft text-accent"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {cadre}
            </button>
          ))}
          <button
            data-testid="quick-filter-timeline-full"
            type="button"
            onClick={() => updateFilters({ timelineQuality: "full" })}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition",
              filters.timelineQuality === "full"
                ? "border-accent/40 bg-accentSoft text-accent"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Timeline-rich
          </button>
          <button
            data-testid="quick-filter-verified"
            type="button"
            onClick={() => updateFilters({ verification: "verified" })}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition",
              filters.verification === "verified"
                ? "border-accent/40 bg-accentSoft text-accent"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Verified
          </button>
          <button
            data-testid="quick-filter-high-mobility"
            type="button"
            onClick={() => {
              const nextValue = filters.q.toLowerCase().includes("high mobility")
                ? filters.q
                : `${filters.q} high mobility`.trim();
              setSearchInput(nextValue);
              navigate({ ...filters, q: nextValue }, 1);
            }}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            High mobility
          </button>
        </div>
      </div>

      {showFilters ? (
        <OfficerFiltersPanel
          filters={filters}
          options={options}
          onChange={(patch) => updateFilters(patch)}
        />
      ) : null}

      {bestMatch ? (
        <div data-testid="directory-best-match" className="panel border-accent/20 bg-mesh-soft p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-label">Best Match</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {bestMatch.officer.name ?? "Name unavailable"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {bestMatch.match?.primaryLabel} • {bestMatch.officer.employee_id}
              </p>
            </div>
            <Link
              href={buildOfficerProfileHref(bestMatch.officer.id, currentDirectoryHref)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-white px-3.5 py-2 text-sm font-medium text-accent transition hover:bg-accentSoft"
            >
              Open best match
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      {pagedResults.length === 0 ? (
        <div data-testid="directory-empty-state" className="panel p-10 text-center">
          <p className="font-medium text-slate-800">No officers match your current filters.</p>
          <p className="mt-1 text-sm text-slate-500">Try reducing filters or searching by employee ID.</p>
        </div>
      ) : (
        <motion.div
          data-testid="directory-results-grid"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {pagedResults.map((result, index) => (
            <motion.div
              key={result.officer.id}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <OfficerCard
                officer={result.officer}
                match={result.match}
                returnTo={currentDirectoryHref}
                isPriorityMatch={Boolean(bestMatch) && page === 1 && index === 0}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-600">
          Page <span className="font-semibold text-slate-900">{page}</span> of {totalPages}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => navigate(filters, Math.max(1, page - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => navigate(filters, Math.min(totalPages, page + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
