export default function OfficersLoading(): JSX.Element {
  return (
    <main className="min-h-screen bg-surface">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div className="panel p-4">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="panel p-4">
              <div className="h-5 w-28 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
