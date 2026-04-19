"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { consumeProfileNavigationDuration, logOfficerPerf } from "@/lib/officers/perf";
import { returnToLabel, sanitizeReturnTo } from "@/lib/officers/navigation";

type ProfileBackLinkProps = {
  officerId: string;
  fallbackHref?: Route;
};

export function ProfileBackLink({
  officerId,
  fallbackHref = "/officers"
}: ProfileBackLinkProps): JSX.Element {
  const searchParams = useSearchParams();
  const safeReturnTo = sanitizeReturnTo(searchParams.get("from")) ?? fallbackHref;

  useEffect(() => {
    const navMs = consumeProfileNavigationDuration(officerId);
    if (navMs == null) return;

    logOfficerPerf("profile-nav", {
      officerId,
      navMs
    });
  }, [officerId]);

  return (
    <Link
      href={safeReturnTo}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <ArrowLeft className="h-4 w-4" />
      {returnToLabel(safeReturnTo)}
    </Link>
  );
}
