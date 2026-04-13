"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Officer } from "@/lib/officers/types";
import { formatDateRange } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { sanitizeDisplayLabel, sanitizeDisplayLocation } from "@/lib/officers/normalize";

type OfficerTimelineProps = {
  officer: Officer;
};

export function OfficerTimeline({ officer }: OfficerTimelineProps): JSX.Element {
  const items = useMemo(
    () =>
      [...officer.posting_history].sort((left, right) => {
        const a = left.start_date ? new Date(left.start_date).getTime() : 0;
        const b = right.start_date ? new Date(right.start_date).getTime() : 0;
        return a - b;
      }),
    [officer.posting_history]
  );

  const groups = useMemo(() => {
    const grouped = new Map<string, { label: string; order: number; items: typeof items }>();

    for (const item of items) {
      const year = item.start_date ? new Date(item.start_date).getFullYear() : NaN;

      if (Number.isFinite(year) && year >= 1950) {
        const decade = Math.floor(year / 10) * 10;
        const key = `decade-${decade}`;
        const label = `${decade}s`;
        const existing = grouped.get(key) ?? { label, order: decade, items: [] };
        existing.items.push(item);
        grouped.set(key, existing);
      } else {
        const existing = grouped.get("undated") ?? { label: "Undated records", order: Number.MAX_SAFE_INTEGER, items: [] };
        existing.items.push(item);
        grouped.set("undated", existing);
      }
    }

    return [...grouped.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((left, right) => left.order - right.order);
  }, [items]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (groups.length === 0) return;
    if (groups.length <= 2) {
      setOpenGroups(new Set(groups.map((group) => group.key)));
      return;
    }

    setOpenGroups(new Set(groups.slice(-2).map((group) => group.key)));
  }, [groups]);

  function toggleGroup(groupKey: string): void {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <section data-testid="timeline-section" className="panel p-6">
        <p className="text-label">Career Timeline</p>
        <p className="mt-2 text-sm text-slate-600">Posting history is not yet available for this officer.</p>
      </section>
    );
  }

  return (
    <section data-testid="timeline-section" className="panel p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label">Career Timeline</p>
          <p className="mt-1 text-xs text-slate-500">{items.length} known timeline entries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="timeline-expand-all"
            type="button"
            onClick={() => setOpenGroups(new Set(groups.map((group) => group.key)))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Expand all
          </button>
          <button
            data-testid="timeline-collapse-all"
            type="button"
            onClick={() => setOpenGroups(new Set())}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Collapse all
          </button>
        </div>
      </div>

      {groups.length > 1 ? (
        <nav data-testid="timeline-jump-links" className="mt-3 flex flex-wrap gap-2">
          {groups.map((group) => (
            <a key={group.key} href={`#timeline-group-${group.key}`} className="pill transition hover:border-accent/30 hover:text-accent">
              {group.label}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="mt-5 space-y-4">
        {groups.map((group, groupIndex) => {
          const isOpen = openGroups.has(group.key);

          return (
            <section
              key={group.key}
              id={`timeline-group-${group.key}`}
              data-testid={`timeline-group-${group.key}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3"
            >
              <button
                data-testid={`timeline-group-toggle-${groupIndex}`}
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{group.label}</p>
                  <p className="text-xs text-slate-500">{group.items.length} entries</p>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {isOpen ? (
                <div className="relative mt-4 space-y-4">
                  <div className="absolute left-3 top-1 h-[calc(100%-0.5rem)] w-px bg-slate-200" />

                  {group.items.map((item, itemIndex) => (
                    <motion.article
                      key={item.posting_id ?? `${item.start_date}-${group.key}-${itemIndex}`}
                      initial={{ opacity: 0, x: 8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.24, delay: itemIndex * 0.02 }}
                      className="relative pl-10"
                    >
                      <div
                        className={cn(
                          "absolute left-0 top-1.5 h-6 w-6 rounded-full border bg-white",
                          item.end_date ? "border-slate-300" : "border-accent/60"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                            item.end_date ? "bg-slate-400" : "bg-accent"
                          )}
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                          {formatDateRange(item.start_date, item.end_date)}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">
                          {item.designation ?? item.rank_held ?? "Role details unavailable"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {[
                            sanitizeDisplayLabel(item.organization_unit_name),
                            sanitizeDisplayLocation(item.location)
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Organization/location data unavailable"}
                        </p>

                        {(item.source_doc || item.confidence != null) ? (
                          <details className="mt-2 text-xs text-slate-500">
                            <summary className="cursor-pointer select-none font-medium text-slate-600">
                              Source metadata
                            </summary>
                            <div className="mt-1 space-y-1">
                              <p>Source: {item.source_doc ?? "Unknown"}</p>
                              <p>Confidence: {item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "Unknown"}</p>
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </motion.article>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
