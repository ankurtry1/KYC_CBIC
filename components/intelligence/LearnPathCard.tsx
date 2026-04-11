import Link from "next/link";
import type { Route } from "next";

type LearnPathCardProps = {
  title: string;
  description: string;
  href: Route;
};

export function LearnPathCard({ title, description, href }: LearnPathCardProps): JSX.Element {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <p className="mt-2 text-xs font-medium text-accent">Open pathway</p>
    </Link>
  );
}
