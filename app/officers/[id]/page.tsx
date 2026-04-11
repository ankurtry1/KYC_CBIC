import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { OfficerHeader } from "@/components/officers/OfficerHeader";
import { CurrentPostingCard } from "@/components/officers/CurrentPostingCard";
import { OfficerFacts } from "@/components/officers/OfficerFacts";
import { RankProgression } from "@/components/officers/RankProgression";
import { StationHistory } from "@/components/officers/StationHistory";
import { OfficerTimeline } from "@/components/officers/OfficerTimeline";
import { DataQualityPanel } from "@/components/officers/DataQualityPanel";
import { getOfficerById } from "@/lib/officers/load";

type OfficerDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function OfficerDetailPage({ params }: OfficerDetailPageProps): Promise<JSX.Element> {
  const officer = await getOfficerById(params.id);

  if (!officer) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/officers"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </Link>

        <OfficerHeader officer={officer} />

        <div className="grid gap-5 xl:grid-cols-[1.65fr,1fr]">
          <div className="space-y-5">
            <CurrentPostingCard officer={officer} />
            <OfficerTimeline officer={officer} />
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <OfficerFacts officer={officer} />
            <RankProgression officer={officer} />
            <StationHistory officer={officer} />
            <DataQualityPanel officer={officer} />
          </aside>
        </div>
      </section>
    </main>
  );
}
