import Link from "next/link";
import type { DiscoveryJourney } from "@/lib/intelligence/types";

type DiscoverJourneyCardProps = {
  journey: DiscoveryJourney;
};

export function DiscoverJourneyCard({ journey }: DiscoverJourneyCardProps): JSX.Element {
  return (
    <Link
      href={journey.href}
      className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <p className="text-base font-semibold text-slate-900">{journey.title}</p>
      <p className="mt-2 text-sm text-slate-600">{journey.description}</p>
      <p className="mt-3 text-xs text-slate-500">You will learn: {journey.learn_outcome}</p>
    </Link>
  );
}
