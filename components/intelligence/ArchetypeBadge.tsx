import { cn } from "@/lib/utils/cn";
import { archetypeTone } from "@/lib/intelligence/archetypes";

type ArchetypeBadgeProps = {
  archetype: string;
  className?: string;
};

const toneClass: Record<ReturnType<typeof archetypeTone>, string> = {
  broad: "border-indigo-200 bg-indigo-50 text-indigo-700",
  mobile: "border-amber-200 bg-amber-50 text-amber-700",
  senior: "border-rose-200 bg-rose-50 text-rose-700",
  focused: "border-sky-200 bg-sky-50 text-sky-700",
  mixed: "border-slate-200 bg-slate-50 text-slate-700"
};

export function ArchetypeBadge({ archetype, className }: ArchetypeBadgeProps): JSX.Element {
  const tone = archetypeTone(archetype);

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", toneClass[tone], className)}>
      {archetype}
    </span>
  );
}
