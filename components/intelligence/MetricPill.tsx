import { cn } from "@/lib/utils/cn";

type MetricPillProps = {
  label: string;
  value: string | number;
  className?: string;
};

export function MetricPill({ label, value, className }: MetricPillProps): JSX.Element {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white px-3 py-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
