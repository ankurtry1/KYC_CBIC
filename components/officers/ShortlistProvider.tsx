"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ShortlistEntry } from "@/lib/officers/shortlist";
import {
  COMPARE_STORAGE_KEY,
  MAX_COMPARE_OFFICERS,
  SHORTLIST_STORAGE_KEY
} from "@/lib/officers/shortlist";

type ShortlistContextValue = {
  entries: ShortlistEntry[];
  compareIds: string[];
  compareEntries: ShortlistEntry[];
  shortlistCount: number;
  isDrawerOpen: boolean;
  isHydrated: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  isShortlisted: (id: string) => boolean;
  toggleEntry: (entry: ShortlistEntry) => void;
  removeEntry: (id: string) => void;
  clearShortlist: () => void;
  isCompareSelected: (id: string) => boolean;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  canSelectMoreCompare: boolean;
};

const ShortlistContext = createContext<ShortlistContextValue | null>(null);

function readStoredEntries<T>(key: string): T[] {
  try {
    const payload = window.localStorage.getItem(key);
    if (!payload) return [];

    const parsed = JSON.parse(payload) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function ShortlistProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [entries, setEntries] = useState<ShortlistEntry[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setEntries(readStoredEntries<ShortlistEntry>(SHORTLIST_STORAGE_KEY));
    setCompareIds(readStoredEntries<string>(COMPARE_STORAGE_KEY));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(entries));
  }, [entries, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const validCompareIds = compareIds.filter((id) => entries.some((entry) => entry.id === id)).slice(0, MAX_COMPARE_OFFICERS);
    if (validCompareIds.length !== compareIds.length) {
      setCompareIds(validCompareIds);
      return;
    }
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(validCompareIds));
  }, [compareIds, entries, isHydrated]);

  const compareEntries = useMemo(
    () => compareIds.map((id) => entries.find((entry) => entry.id === id)).filter((entry): entry is ShortlistEntry => entry != null),
    [compareIds, entries]
  );

  const value = useMemo<ShortlistContextValue>(
    () => ({
      entries,
      compareIds,
      compareEntries,
      shortlistCount: entries.length,
      isDrawerOpen,
      isHydrated,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      toggleDrawer: () => setIsDrawerOpen((current) => !current),
      isShortlisted: (id: string) => entries.some((entry) => entry.id === id),
      toggleEntry: (entry: ShortlistEntry) => {
        setEntries((current) => {
          if (current.some((item) => item.id === entry.id)) {
            return current.filter((item) => item.id !== entry.id);
          }
          return [entry, ...current];
        });
      },
      removeEntry: (id: string) => {
        setEntries((current) => current.filter((entry) => entry.id !== id));
        setCompareIds((current) => current.filter((compareId) => compareId !== id));
      },
      clearShortlist: () => {
        setEntries([]);
        setCompareIds([]);
      },
      isCompareSelected: (id: string) => compareIds.includes(id),
      toggleCompare: (id: string) => {
        setCompareIds((current) => {
          if (current.includes(id)) {
            return current.filter((compareId) => compareId !== id);
          }
          if (current.length >= MAX_COMPARE_OFFICERS) return current;
          if (!entries.some((entry) => entry.id === id)) return current;
          return [...current, id];
        });
      },
      clearCompare: () => setCompareIds([]),
      canSelectMoreCompare: compareIds.length < MAX_COMPARE_OFFICERS
    }),
    [compareEntries, compareIds, entries, isDrawerOpen, isHydrated]
  );

  return <ShortlistContext.Provider value={value}>{children}</ShortlistContext.Provider>;
}

export function useShortlist(): ShortlistContextValue {
  const context = useContext(ShortlistContext);
  if (!context) {
    throw new Error("useShortlist must be used within a ShortlistProvider");
  }
  return context;
}
