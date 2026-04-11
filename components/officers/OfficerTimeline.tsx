"use client";

import { motion } from "framer-motion";
import type { Officer } from "@/lib/officers/types";
import { formatDateRange } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type OfficerTimelineProps = {
  officer: Officer;
};

export function OfficerTimeline({ officer }: OfficerTimelineProps): JSX.Element {
  const items = [...officer.posting_history].sort((left, right) => {
    const a = left.start_date ? new Date(left.start_date).getTime() : 0;
    const b = right.start_date ? new Date(right.start_date).getTime() : 0;
    return a - b;
  });

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
      <div className="flex items-end justify-between gap-3">
        <p className="text-label">Career Timeline</p>
        <p className="text-xs text-slate-500">{items.length} known timeline entries</p>
      </div>

      <div className="relative mt-5 space-y-5">
        <div className="absolute left-3 top-1 h-[calc(100%-0.5rem)] w-px bg-slate-200" />

        {items.map((item, index) => (
          <motion.article
            key={item.posting_id ?? `${item.start_date}-${index}`}
            initial={{ opacity: 0, x: 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.28, delay: index * 0.02 }}
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
                {[item.organization_unit_name, item.location].filter(Boolean).join(" • ") ||
                  "Organization/location data unavailable"}
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
    </section>
  );
}
