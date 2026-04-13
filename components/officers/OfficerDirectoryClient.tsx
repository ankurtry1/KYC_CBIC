"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import type { OfficerFilters, OfficerIndexRecord } from "@/lib/officers/types";
import { DEFAULT_FILTERS, deriveFilterOptions, filterOfficers, sortOfficers } from "@/lib/officers/search";
import { OfficerSearch } from "@/components/officers/OfficerSearch";
import { OfficerFiltersPanel } from "@/components/officers/OfficerFilters";
import { OfficerCard } from "@/components/officers/OfficerCard";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type OfficerDirectoryClientProps = {
  records: OfficerIndexRecord[];
  initialFilters?: Partial<OfficerFilters>;
};

const PAGE_SIZE = 24;

function hasActiveAdvancedFilters(filters: OfficerFilters): boolean {
  return (
    filters.batch !== "all" ||
    filters.designation !== "all" ||
    filters.location !== "all" ||
    filters.verification !== "all" ||
    filters.timelineQuality !== "all" ||
    filters.sortBy !== "name" ||
    filters.sortOrder !== "asc"
  );
}

export function OfficerDirectoryClient({
  records,
  initialFilters
}: OfficerDirectoryClientProps): JSX.Element {
  const initialState = {
    ...DEFAULT_FILTERS,
    ...initialFilters,
    q: initialFilters?.q ?? ""
  } as OfficerFilters;

  const [filters, setFilters] = useState<OfficerFilters>({
    ...initialState
  });
  const [searchInput, setSearchInput] = useState(initialState.q);
  const [isSearchSubmitting, setIsSearchSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(() => hasActiveAdvancedFilters(initialState));

  const options = useMemo(() => deriveFilterOptions(records), [records]);

  const filtered = useMemo(() => filterOfficers(records, filters), [records, filters]);
  const sorted = useMemo(
    () => sortOfficers(filtered, filters.sortBy, filters.sortOrder),
    [filtered, filters.sortBy, filters.sortOrder]
  );

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => (prev.q === searchInput ? prev : { ...prev, q: searchInput }));
      setIsSearchSubmitting(false);
    }, 180);

    return () => clearTimeout(handle);
  }, [searchInput]);

  function applySearchNow(): void {
    setIsSearchSubmitting(true);
    setFilters((prev) => ({ ...prev, q: searchInput.trim() }));
    window.setTimeout(() => setIsSearchSubmitting(false), 200);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pagedRecords = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
        <OfficerSearch
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={applySearchNow}
          isSubmitting={isSearchSubmitting}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p data-testid="directory-results-count" className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-800">{formatNumber(sorted.length)}</span> officers
          </p>
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
              setFilters((prev) => ({
                ...prev,
                cadre: "all",
                timelineQuality: "all",
                verification: "all",
                sortBy: "name",
                sortOrder: "asc"
              }))
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
              onClick={() => setFilters((prev) => ({ ...prev, cadre }))}
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
            onClick={() => setFilters((prev) => ({ ...prev, timelineQuality: "full" }))}
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
            onClick={() => setFilters((prev) => ({ ...prev, verification: "verified" }))}
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
            onClick={() =>
              setSearchInput((prev) => (prev.toLowerCase().includes("high mobility") ? prev : `${prev} high mobility`.trim()))
            }
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            High mobility
          </button>
        </div>
      </div>

      {showFilters ? <OfficerFiltersPanel filters={filters} options={options} onChange={setFilters} /> : null}

      {pagedRecords.length === 0 ? (
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
          {pagedRecords.map((officer) => (
            <motion.div
              key={officer.id}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <OfficerCard officer={officer} />
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
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
