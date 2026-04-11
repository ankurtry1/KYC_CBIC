"use client";

import { motion } from "framer-motion";
import type { Officer } from "@/lib/officers/types";
import { rankProgressState } from "@/lib/officers/derive";
import { cn } from "@/lib/utils/cn";

type RankProgressionProps = {
  officer: Officer;
};

export function RankProgression({ officer }: RankProgressionProps): JSX.Element {
  const items = rankProgressState(officer);

  return (
    <section className="panel p-5">
      <p className="text-label">Promotion Ladder</p>

      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.rank}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: index * 0.03, duration: 0.25 }}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm",
              item.isCurrent
                ? "border-accent/40 bg-accentSoft text-accent"
                : item.achieved
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500"
            )}
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                item.isCurrent ? "bg-accent" : item.achieved ? "bg-emerald-500" : "bg-slate-300"
              )}
            />
            <span className="font-medium">{item.rank}</span>
            {item.isCurrent ? <span className="pill ml-auto">Current</span> : null}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
