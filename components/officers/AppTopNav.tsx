import Link from "next/link";
import { CircleHelp, Compass, Landmark, Route, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AppTopNavProps = {
  className?: string;
};

export function AppTopNav({ className }: AppTopNavProps): JSX.Element {
  return (
    <header
      data-testid="app-nav"
      className={cn("sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur", className)}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-900 transition hover:text-accent">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <Landmark className="h-4.5 w-4.5 text-accent" />
          </span>
          <span className="text-sm font-semibold tracking-[0.03em] md:text-base">CBIC Officer Universe</span>
        </Link>

        <nav data-testid="app-nav-links" className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Link
            href="/officers"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Search className="h-4 w-4" />
            Directory
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Compass className="h-4 w-4" />
            Discover
          </Link>
          <Link
            href="/learn"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
          >
            Learn
          </Link>
          <Link
            href="/career-paths"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900 lg:inline-flex"
          >
            <Route className="h-4 w-4" />
            Paths
          </Link>
          <Link
            href="/guide/intelligence"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900 xl:inline-flex"
          >
            <CircleHelp className="h-4 w-4" />
            Guide
          </Link>
        </nav>
      </div>
    </header>
  );
}
