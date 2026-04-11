import Link from "next/link";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { StationCard } from "@/components/intelligence/StationCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { getStations } from "@/lib/officers/load";

type StationsPageProps = {
  searchParams?: {
    q?: string;
    sort?: string;
  };
};

export default async function StationsPage({ searchParams }: StationsPageProps): Promise<JSX.Element> {
  const stations = await getStations();

  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const sort = searchParams?.sort ?? "importance";

  const filtered = stations.filter((station) => {
    if (!q) return true;
    return [station.name, station.narrative, station.importance_label].join(" ").toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((left, right) => {
    if (sort === "name") return left.name.localeCompare(right.name);
    if (sort === "officers") return right.officer_count - left.officer_count;
    if (sort === "postings") return right.posting_frequency - left.posting_frequency;
    return right.importance_score - left.importance_score;
  });

  return (
    <main data-testid="stations-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="mb-5">
          <p className="text-label">Station Intelligence</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Explore station centrality</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Review stations by officer linkage, posting frequency, and movement corridor relevance.
          </p>
        </div>

        <form className="panel mb-5 grid gap-3 p-4 md:grid-cols-[1fr,220px,auto]">
          <label className="flex flex-col gap-1">
            <span className="text-label">Search stations</span>
            <input
              data-testid="stations-search-input"
              type="search"
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="Search station name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-accent/40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label">Sort by</span>
            <select
              data-testid="stations-sort-select"
              name="sort"
              defaultValue={sort}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-accent/40"
            >
              <option value="importance">Importance</option>
              <option value="officers">Officer count</option>
              <option value="postings">Posting frequency</option>
              <option value="name">Name</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3f4d]"
            >
              Apply
            </button>
            <Link href="/stations" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
              Reset
            </Link>
          </div>
        </form>

        {sorted.length === 0 ? (
          <div className="panel p-10 text-center" data-testid="stations-empty-state">
            <p className="font-medium text-slate-800">No stations match your current search.</p>
            <p className="mt-1 text-sm text-slate-500">Try a broader station name query.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="stations-grid">
            {sorted.map((station) => (
              <StationCard key={station.slug} station={station} />
            ))}
          </div>
        )}

        <div className="mt-6">
          <RecommendationStrip
            testId="stations-recommendation-strip"
            items={[
              {
                title: "Explore linked officers",
                description: "Open officer journeys connected to these station nodes.",
                href: "/officers"
              },
              {
                title: "Batch context",
                description: "Compare which cohorts appear most in high-traffic stations.",
                href: "/batches"
              },
              {
                title: "Cadre context",
                description: "Inspect cadre-level station exposure signatures.",
                href: "/cadres"
              },
              {
                title: "Guided discovery",
                description: "Return to curated exploration pathways.",
                href: "/discover"
              }
            ]}
          />
        </div>
      </section>
    </main>
  );
}
