export default function OfficerProfileLoading(): JSX.Element {
  return (
    <main className="min-h-screen bg-surface">
      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-100" />

        <div className="panel p-5">
          <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-8 w-1/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-4 w-1/4 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.55fr,1fr]">
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="panel p-5">
                <div className="h-5 w-28 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="panel p-5">
                <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>
    </main>
  );
}
