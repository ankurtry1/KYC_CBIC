import { cn } from "@/lib/utils/cn";

type DataQualityBadgeProps = {
  label: "Strong" | "Moderate" | "Partial" | "Needs Review";
  className?: string;
};

const palette: Record<DataQualityBadgeProps["label"], string> = {
  Strong: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Moderate: "border-sky-200 bg-sky-50 text-sky-700",
  Partial: "border-amber-200 bg-amber-50 text-amber-700",
  "Needs Review": "border-rose-200 bg-rose-50 text-rose-700"
};

export function DataQualityBadge({ label, className }: DataQualityBadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-[0.02em]",
        palette[label],
        className
      )}
      title={`Data quality: ${label}`}
    >
      {label}
    </span>
  );
}
