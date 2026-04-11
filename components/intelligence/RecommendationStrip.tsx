import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RecommendationItem } from "@/lib/intelligence/types";

type RecommendationStripProps = {
  title?: string;
  items: RecommendationItem[];
  testId?: string;
};

export function RecommendationStrip({ title = "What next?", items, testId }: RecommendationStripProps): JSX.Element {
  if (items.length === 0) return <></>;

  return (
    <section data-testid={testId} className="panel p-4">
      <p className="text-label">{title}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.title}`}
            href={item.href}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent">
              Explore
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
