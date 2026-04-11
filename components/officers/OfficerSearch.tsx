"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type OfficerSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function OfficerSearch({
  value,
  onChange,
  placeholder = "Search by name, employee ID, batch, cadre, designation, location",
  className
}: OfficerSearchProps): JSX.Element {
  return (
    <label className={cn("group relative block", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-accent" />
      <input
        data-testid="directory-search-input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-800 shadow-sm outline-none transition focus:border-accent/40 focus:shadow-[0_0_0_4px_rgba(15,76,92,0.08)]"
      />
      {value ? (
        <button
          data-testid="directory-search-clear"
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </label>
  );
}
