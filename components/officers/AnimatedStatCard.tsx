"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils/format";

type AnimatedStatCardProps = {
  label: string;
  value: number;
  hint?: string;
  delay?: number;
  testId?: string;
};

export function AnimatedStatCard({
  label,
  value,
  hint,
  delay = 0,
  testId
}: AnimatedStatCardProps): JSX.Element {
  // Keep server-rendered KPI values truthful even before hydration.
  const [display, setDisplay] = useState(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const totalMs = 800;
    const steps = 24;
    let currentStep = 0;
    const from = display;
    const delta = value - from;

    const timer = window.setInterval(() => {
      currentStep += 1;
      const next = Math.round(from + (delta * currentStep) / steps);
      setDisplay(next);
      if (currentStep >= steps) {
        window.clearInterval(timer);
      }
    }, totalMs / steps);

    return () => window.clearInterval(timer);
  }, [value, mounted]);

  const formatted = useMemo(() => formatNumber(display), [display]);

  return (
    <motion.div
      data-testid={testId}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.35, delay }}
      className="panel p-5"
    >
      <p className="text-label">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{formatted}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </motion.div>
  );
}
