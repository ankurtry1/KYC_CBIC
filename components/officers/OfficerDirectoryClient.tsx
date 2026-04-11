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

type OfficerDirectoryClientProps = {
  records: OfficerIndexRecord[];
  initialFilters?: Partial<OfficerFilters>;
};

const PAGE_SIZE = 24;

export function OfficerDirectoryClient({
  records,
  initialFilters
}: OfficerDirectoryClientProps): JSX.Element {
  const [filters, setFilters] = useState<OfficerFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
    q: initialFilters?.q ?? ""
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  const options = useMemo(() => deriveFilterOptions(records), [records]);

  const filtered = useMemo(() => filterOfficers(records, filters), [records, filters]);
  const sorted = useMemo(
    () => sortOfficers(filtered, filters.sortBy, filters.sortOrder),
    [filtered, filters.sortBy, filters.sortOrder]
  );

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pagedRecords = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div data-testid="officers-directory" className="space-y-5">
      <div className="panel p-4">
        <OfficerSearch value={filters.q} onChange={(q) => setFilters((prev) => ({ ...prev, q }))} />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p data-testid="directory-results-count" className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-800">{formatNumber(sorted.length)}</span> officers
          </p>
          <button
            data-testid="directory-toggle-filters"
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showFilters ? "Hide filters" : "Show filters"}
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
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
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
