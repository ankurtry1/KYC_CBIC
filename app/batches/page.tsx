import Link from "next/link";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { BatchCard } from "@/components/intelligence/BatchCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { getBatches } from "@/lib/officers/load";

type BatchesPageProps = {
  searchParams?: {
    q?: string;
    sort?: string;
  };
};

export default async function BatchesPage({ searchParams }: BatchesPageProps): Promise<JSX.Element> {
  const batches = await getBatches();

  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const sort = searchParams?.sort ?? "year_desc";

  const filtered = batches.filter((batch) => {
    if (!q) return true;
    return [
      String(batch.year),
      String(batch.officer_count),
      batch.quick_insight,
      batch.narrative
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const sorted = [...filtered].sort((left, right) => {
    if (sort === "year_asc") return left.year - right.year;
    if (sort === "officers_desc") return right.officer_count - left.officer_count;
    if (sort === "timeline_desc") return right.average_timeline_entries - left.average_timeline_entries;
    return right.year - left.year;
  });

  return (
    <main data-testid="batches-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="mb-5">
          <p className="text-label">Batch Explorer</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Explore cohorts over time</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Compare officer batches by career depth, station diversity, rank distribution, and archetype patterns.
          </p>
        </div>

        <form className="panel mb-5 grid gap-3 p-4 md:grid-cols-[1fr,220px,auto]">
          <label className="flex flex-col gap-1">
            <span className="text-label">Search batches</span>
            <input
              data-testid="batches-search-input"
              type="search"
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="Search by year or insight"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-accent/40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label">Sort by</span>
            <select
              data-testid="batches-sort-select"
              name="sort"
              defaultValue={sort}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-accent/40"
            >
              <option value="year_desc">Year (latest first)</option>
              <option value="year_asc">Year (oldest first)</option>
              <option value="officers_desc">Officer count</option>
              <option value="timeline_desc">Timeline richness</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3f4d]"
            >
              Apply
            </button>
            <Link href="/batches" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
              Reset
            </Link>
          </div>
        </form>

        {sorted.length === 0 ? (
          <div className="panel p-10 text-center" data-testid="batches-empty-state">
            <p className="font-medium text-slate-800">No batches match your current search.</p>
            <p className="mt-1 text-sm text-slate-500">Try a broader query like a year or remove filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="batches-grid">
            {sorted.map((batch) => (
              <BatchCard key={batch.year} batch={batch} />
            ))}
          </div>
        )}

        <div className="mt-6">
          <RecommendationStrip
            testId="batches-recommendation-strip"
            items={[
              {
                title: "Compare cadres",
                description: "See how batch composition intersects with cadre progression signatures.",
                href: "/cadres"
              },
              {
                title: "Inspect stations",
                description: "Trace where this cohort has concentrated institutional movement.",
                href: "/stations"
              },
              {
                title: "Career path context",
                description: "Review common progression ladders linked to cohort patterns.",
                href: "/career-paths"
              },
              {
                title: "Guided discovery",
                description: "Return to curated journey entry points.",
                href: "/discover"
              }
            ]}
          />
        </div>
      </section>
    </main>
  );
}
