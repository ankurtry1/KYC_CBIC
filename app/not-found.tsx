import Link from "next/link";
import { AppTopNav } from "@/components/officers/AppTopNav";

export default function NotFound(): JSX.Element {
  return (
    <main className="min-h-screen bg-surface">
      <AppTopNav />
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-24 text-center md:px-8">
        <p className="text-label">Officer Universe</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Profile not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The officer ID might be invalid or missing from the current parsed dataset.
        </p>
        <Link
          href="/officers"
          className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Return to directory
        </Link>
      </section>
    </main>
  );
}
