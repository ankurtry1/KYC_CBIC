import { BadgeCheck, AlertTriangle, HelpCircle } from "lucide-react";
import type { VerificationFlag } from "@/lib/officers/types";
import { cn } from "@/lib/utils/cn";

type VerificationBadgeProps = {
  flag: VerificationFlag;
  className?: string;
};

const map: Record<VerificationFlag, { label: string; icon: JSX.Element; className: string }> = {
  verified: {
    label: "Verified",
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  not_verified: {
    label: "Not Verified",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    className: "border-amber-200 bg-amber-50 text-amber-700"
  },
  unknown: {
    label: "Unknown",
    icon: <HelpCircle className="h-3.5 w-3.5" />,
    className: "border-slate-200 bg-slate-50 text-slate-700"
  }
};

export function VerificationBadge({ flag, className }: VerificationBadgeProps): JSX.Element {
  const item = map[flag] ?? map.unknown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        item.className,
        className
      )}
      title={`Verification: ${item.label}`}
    >
      {item.icon}
      {item.label}
    </span>
  );
}
