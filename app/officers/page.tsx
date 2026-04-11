import type { OfficerFilters } from "@/lib/officers/types";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { OfficerDirectoryClient } from "@/components/officers/OfficerDirectoryClient";
import { getOfficerIndex } from "@/lib/officers/load";

type OfficersPageProps = {
  searchParams?: {
    q?: string;
    cadre?: string;
    batch?: string;
    designation?: string;
    timelineQuality?: string;
    verification?: string;
    location?: string;
    sortBy?: string;
    sortOrder?: string;
  };
};

export default async function OfficersPage({ searchParams }: OfficersPageProps): Promise<JSX.Element> {
  const records = await getOfficerIndex();

  const initialFilters: Partial<OfficerFilters> = {
    q: searchParams?.q ?? "",
    cadre: searchParams?.cadre ?? "all",
    batch: searchParams?.batch ?? "all",
    designation: searchParams?.designation ?? "all",
    timelineQuality: (searchParams?.timelineQuality as OfficerFilters["timelineQuality"]) ?? "all",
    verification: (searchParams?.verification as OfficerFilters["verification"]) ?? "all",
    location: searchParams?.location ?? "all",
    sortBy: (searchParams?.sortBy as OfficerFilters["sortBy"]) ?? "name",
    sortOrder: (searchParams?.sortOrder as OfficerFilters["sortOrder"]) ?? "asc"
  };

  return (
    <main className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="mb-6">
          <p className="text-label">Officer Directory</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Search and discover officers</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Filter by cadre, batch, designation, verification, timeline quality, and location.
          </p>
        </div>

        <OfficerDirectoryClient records={records} initialFilters={initialFilters} />
      </section>
    </main>
  );
}
