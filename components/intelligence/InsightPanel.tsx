import { cn } from "@/lib/utils/cn";

type InsightPanelProps = {
  title: string;
  subtitle?: string;
  className?: string;
  testId?: string;
  children: React.ReactNode;
};

export function InsightPanel({ title, subtitle, className, children, testId }: InsightPanelProps): JSX.Element {
  return (
    <section data-testid={testId} className={cn("panel p-5", className)}>
      <p className="text-label">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
