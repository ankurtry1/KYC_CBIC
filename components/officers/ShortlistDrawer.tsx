"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark, CheckSquare, Copy, Scale, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { buildShortlistSummary } from "@/lib/officers/shortlist";
import { buildOfficerProfileHref } from "@/lib/officers/navigation";
import { useShortlist } from "@/components/officers/ShortlistProvider";
import { cn } from "@/lib/utils/cn";

export function ShortlistDrawer(): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [copiedState, setCopiedState] = useState<"summary" | "compare" | null>(null);
  const {
    entries,
    compareIds,
    compareEntries,
    shortlistCount,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    removeEntry,
    clearShortlist,
    toggleCompare,
    isCompareSelected,
    canSelectMoreCompare,
    clearCompare
  } = useShortlist();

  const currentSearch = searchParams?.toString();
  const returnTo = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
  const compareHref = compareIds.length >= 2 ? (`/compare?ids=${compareIds.join(",")}` as Route) : null;
  const summary = useMemo(() => buildShortlistSummary(entries), [entries]);

  async function copyText(value: string, mode: "summary" | "compare"): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedState(mode);
      window.setTimeout(() => setCopiedState(null), 1500);
    } catch {
      setCopiedState(null);
    }
  }

  return (
    <>
      <button
        type="button"
        data-testid="shortlist-fab"
        onClick={openDrawer}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0b3f4d]"
      >
        <Bookmark className="h-4 w-4" />
        Shortlist
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{shortlistCount}</span>
      </button>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close shortlist"
            onClick={closeDrawer}
            className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px]"
          />

          <aside
            data-testid="shortlist-drawer"
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-label">Shortlist</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {shortlistCount} saved {shortlistCount === 1 ? "officer" : "officers"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Select 2 to 4 officers to compare. Saved locally in this browser.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-200 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyText(summary, "summary")}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  {copiedState === "summary" ? "Copied summary" : "Copy summary"}
                </button>
                {compareHref ? (
                  <button
                    type="button"
                    onClick={() => copyText(`${window.location.origin}${compareHref}`, "compare")}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Scale className="h-4 w-4" />
                    {copiedState === "compare" ? "Copied compare URL" : "Copy compare URL"}
                  </button>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {compareHref ? (
                  <Link
                    href={compareHref}
                    onClick={closeDrawer}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3f4d]"
                  >
                    <Scale className="h-4 w-4" />
                    Compare {compareEntries.length} officers
                  </Link>
                ) : (
                  <span className="rounded-xl border border-dashed border-slate-300 px-3.5 py-2 text-sm text-slate-500">
                    Select at least 2 officers to compare
                  </span>
                )}

                {compareIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearCompare}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear compare selection
                  </button>
                ) : null}

                {entries.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearShortlist}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear shortlist
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <p className="font-medium text-slate-800">No officers shortlisted yet.</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Save officers from the directory or profile page to compare later.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const selectedForCompare = isCompareSelected(entry.id);
                    return (
                      <article
                        key={entry.id}
                        className={cn(
                          "rounded-2xl border px-4 py-4 transition",
                          selectedForCompare ? "border-accent/35 bg-accentSoft/60" : "border-slate-200 bg-white"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={buildOfficerProfileHref(entry.id, returnTo)}
                              onClick={closeDrawer}
                              className="text-sm font-semibold text-slate-900 transition hover:text-accent"
                            >
                              {entry.name}
                            </Link>
                            <p className="mt-0.5 text-xs text-slate-500">{entry.employeeId}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                            aria-label={`Remove ${entry.name} from shortlist`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                          <p>{entry.currentDesignation ?? "Designation unavailable"}</p>
                          <p>{entry.currentLocation ?? "Current station unavailable"}</p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="pill">Batch {entry.batch ?? "NA"}</span>
                          <span className="pill">Cadre {entry.cadre ?? "Unknown"}</span>
                          <span className="pill">{entry.timelineEntryCount} posting records</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={!selectedForCompare && !canSelectMoreCompare}
                            onClick={() => toggleCompare(entry.id)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                              selectedForCompare
                                ? "border-accent/35 bg-accentSoft text-accent"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                              !selectedForCompare && !canSelectMoreCompare ? "cursor-not-allowed opacity-50" : ""
                            )}
                          >
                            <CheckSquare className="h-4 w-4" />
                            {selectedForCompare ? "Selected for compare" : "Select for compare"}
                          </button>
                          {!selectedForCompare && !canSelectMoreCompare ? (
                            <p className="text-xs text-slate-500">Maximum 4 officers</p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
