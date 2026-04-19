"use client";

import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type OfficerSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  isSubmitting?: boolean;
  suggestions?: ReactNode;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export function OfficerSearch({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = "Search by name, employee ID, batch, cadre, designation, location",
  className,
  isSubmitting = false,
  suggestions,
  onFocus,
  onKeyDown
}: OfficerSearchProps): JSX.Element {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <form data-testid="directory-search-form" onSubmit={handleSubmit} className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <label className="group relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-accent" />
          <input
            data-testid="directory-search-input"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-800 shadow-sm outline-none transition focus:border-accent/40 focus:shadow-[0_0_0_4px_rgba(15,76,92,0.08)]"
            aria-autocomplete={suggestions ? "list" : "none"}
          />
          {value ? (
            <button
              data-testid="directory-search-clear"
              type="button"
              onClick={() => {
                onChange("");
                onClear?.();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        {suggestions}
      </div>

      <button
        data-testid="directory-search-submit"
        type="submit"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-accent/25 bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <Search className="h-4 w-4" />
        {isSubmitting ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
