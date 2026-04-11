"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function LandingSearch(): JSX.Element {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push("/officers");
      return;
    }
    router.push(`/officers?q=${encodeURIComponent(q)}`);
  }

  return (
    <form data-testid="home-search-form" onSubmit={handleSubmit} className="mx-auto mt-7 w-full max-w-3xl">
      <label className="group relative block">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-accent" />
        <input
          data-testid="home-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search officer by name, employee ID, batch, cadre, designation, station"
          className="w-full rounded-2xl border border-slate-200 bg-white/95 py-4 pl-14 pr-28 text-base text-slate-900 shadow-panel outline-none transition focus:border-accent/50 focus:shadow-[0_0_0_4px_rgba(15,76,92,0.1)]"
        />
        <button
          data-testid="home-search-submit"
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b3f4d]"
        >
          Search
        </button>
      </label>
    </form>
  );
}
