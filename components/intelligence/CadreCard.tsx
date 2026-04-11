import Link from "next/link";
import type { CadreIntelligence } from "@/lib/intelligence/types";
import { cadreInsightLabel } from "@/lib/intelligence/cadres";

type CadreCardProps = {
  cadre: CadreIntelligence;
};

export function CadreCard({ cadre }: CadreCardProps): JSX.Element {
  return (
    <Link href={`/cadres/${cadre.slug}`} className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">{cadre.cadre}</h3>
        <span className="pill">{cadre.officer_count} officers</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{cadre.description}</p>
      <p className="mt-3 text-xs text-slate-500">{cadreInsightLabel(cadre)}</p>
    </Link>
  );
}
