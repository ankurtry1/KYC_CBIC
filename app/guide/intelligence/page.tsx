import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { ArchetypeBadge } from "@/components/intelligence/ArchetypeBadge";
import {
  ARCHETYPE_GLOSSARY,
  INTELLIGENCE_DISCLAIMER,
  INTELLIGENCE_TERMS
} from "@/lib/intelligence/glossary";

export default function IntelligenceGuidePage(): JSX.Element {
  return (
    <main data-testid="intelligence-guide-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to discover
        </Link>

        <section className="panel bg-mesh-soft p-6 md:p-8">
          <p className="text-label">Intelligence Guide</p>
          <h1 className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-900">
            <CircleHelp className="h-7 w-7 text-accent" />
            Understand intelligence terms
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-700">{INTELLIGENCE_DISCLAIMER}</p>
        </section>

        <section className="panel p-5" data-testid="intelligence-terms-section">
          <p className="text-label">Core Terms</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {INTELLIGENCE_TERMS.map((item) => (
              <article key={item.term} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate-800">{item.term}</p>
                <p className="mt-1 text-sm text-slate-600">{item.meaning}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel p-5" data-testid="archetype-glossary-section">
          <p className="text-label">Archetype Glossary</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {ARCHETYPE_GLOSSARY.map((item) => (
              <article key={item.name} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ArchetypeBadge archetype={item.name} />
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.meaning}</p>
                <p className="mt-1 text-xs text-slate-500">Typical evidence: {item.evidence}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
