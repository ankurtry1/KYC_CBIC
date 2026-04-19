"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { SearchSuggestions } from "@/components/officers/SearchSuggestions";
import { markProfileNavigationStart, markSearchNavigationStart } from "@/lib/officers/perf";
import {
  buildOfficerSearchIndex,
  getStrongDirectOfficerMatch,
  MIN_SEARCH_SUGGEST_CHARS,
  suggestOfficers
} from "@/lib/officers/search";
import { loadOfficerSuggestions } from "@/lib/officers/suggest";
import type { OfficerSuggestionRecord } from "@/lib/officers/types";

const DEBOUNCE_MS = 120;

export function LandingSearch(): JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestionRecords, setSuggestionRecords] = useState<OfficerSuggestionRecord[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const suggestionLoadRef = useRef<Promise<void> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const searchIndex = useMemo(
    () => buildOfficerSearchIndex(suggestionRecords),
    [suggestionRecords]
  );
  const suggestions = useMemo(
    () => suggestOfficers(searchIndex, debouncedQuery, 6),
    [debouncedQuery, searchIndex]
  );
  const directMatch = useMemo(
    () => getStrongDirectOfficerMatch(suggestions, debouncedQuery),
    [debouncedQuery, suggestions]
  );

  const loadSuggestions = useCallback(async (): Promise<void> => {
    if (hasLoadedSuggestions || suggestionLoadRef.current) {
      await suggestionLoadRef.current;
      return;
    }

    setIsLoadingSuggestions(true);
    const request = loadOfficerSuggestions()
      .then((records) => {
        setSuggestionRecords(records);
        setHasLoadedSuggestions(true);
      })
      .catch(() => {
        setHasLoadedSuggestions(false);
      })
      .finally(() => {
        setIsLoadingSuggestions(false);
        suggestionLoadRef.current = null;
      });

    suggestionLoadRef.current = request;
    await request;
  }, [hasLoadedSuggestions]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [debouncedQuery]);

  useEffect(() => {
    router.prefetch("/officers");

    const onIdle = () => {
      void loadSuggestions();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleWindow = window as Window &
        typeof globalThis & {
          requestIdleCallback: (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions
          ) => number;
          cancelIdleCallback: (handle: number) => void;
        };
      const idleId = idleWindow.requestIdleCallback(onIdle, { timeout: 700 });
      return () => idleWindow.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(onIdle, 300);
    return () => globalThis.clearTimeout(timeoutId);
  }, [loadSuggestions, router]);

  useEffect(() => {
    if (!isSuggestionsOpen || suggestions.length === 0) return;

    suggestions.slice(0, 3).forEach((suggestion) => {
      router.prefetch(`/officers/${suggestion.officer.id}`);
    });
  }, [isSuggestionsOpen, router, suggestions]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function openSuggestions(nextQuery: string): void {
    if (nextQuery.trim().length >= MIN_SEARCH_SUGGEST_CHARS) {
      setIsSuggestionsOpen(true);
    }
  }

  function navigateToOfficerProfile(officerId: string): void {
    markProfileNavigationStart(officerId);
    setIsSuggestionsOpen(false);
    startTransition(() => {
      router.push(`/officers/${officerId}`);
    });
  }

  function navigateToDirectory(nextQuery: string): void {
    const trimmed = nextQuery.trim();
    setIsSuggestionsOpen(false);

    startTransition(() => {
      if (trimmed) {
        markSearchNavigationStart(trimmed);
        router.push(`/officers?q=${encodeURIComponent(trimmed)}`);
        return;
      }

      router.push("/officers");
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmed = query.trim();
    if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
      navigateToOfficerProfile(suggestions[activeSuggestionIndex].officer.id);
      return;
    }

    if (trimmed && directMatch) {
      navigateToOfficerProfile(directMatch.officer.id);
      return;
    }

    navigateToDirectory(trimmed);
  }

  async function handleInputFocus(): Promise<void> {
    openSuggestions(query);
    void loadSuggestions();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (!isSuggestionsOpen || suggestions.length === 0) {
      if (event.key === "Escape") {
        setIsSuggestionsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      navigateToOfficerProfile(suggestions[activeSuggestionIndex].officer.id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  }

  return (
    <form data-testid="home-search-form" onSubmit={handleSubmit} className="mx-auto mt-7 w-full max-w-3xl">
      <div ref={wrapperRef} className="relative">
        <label className="group relative block">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-accent" />
          <input
            data-testid="home-search-input"
            type="search"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              openSuggestions(nextQuery);
              if (nextQuery.trim().length >= MIN_SEARCH_SUGGEST_CHARS) {
                void loadSuggestions();
              }
            }}
            onFocus={() => {
              void handleInputFocus();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search officer by name, employee ID, batch, cadre, designation, station"
            className="w-full rounded-2xl border border-slate-200 bg-white/95 py-4 pl-14 pr-28 text-base text-slate-900 shadow-panel outline-none transition focus:border-accent/50 focus:shadow-[0_0_0_4px_rgba(15,76,92,0.1)]"
            aria-expanded={isSuggestionsOpen}
            aria-controls="home-search-suggestions"
            aria-autocomplete="list"
          />
          <button
            data-testid="home-search-submit"
            type="submit"
            disabled={isPending}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b3f4d] disabled:cursor-wait disabled:opacity-85"
          >
            {isPending ? "Searching..." : "Search"}
          </button>
        </label>

        <SearchSuggestions
          query={debouncedQuery}
          suggestions={suggestions}
          activeIndex={activeSuggestionIndex}
          isOpen={isSuggestionsOpen && debouncedQuery.length >= MIN_SEARCH_SUGGEST_CHARS}
          isLoading={isLoadingSuggestions && !hasLoadedSuggestions}
          testId="home-search-suggestions"
          onActiveIndexChange={setActiveSuggestionIndex}
          onSelect={(suggestion) => navigateToOfficerProfile(suggestion.officer.id)}
        />
      </div>
    </form>
  );
}
