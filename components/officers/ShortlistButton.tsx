"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import type { ShortlistEntry } from "@/lib/officers/shortlist";
import { useShortlist } from "@/components/officers/ShortlistProvider";
import { cn } from "@/lib/utils/cn";

type ShortlistButtonProps = {
  entry: ShortlistEntry;
  compact?: boolean;
  className?: string;
};

export function ShortlistButton({
  entry,
  compact = false,
  className
}: ShortlistButtonProps): JSX.Element {
  const { isShortlisted, toggleEntry } = useShortlist();
  const shortlisted = isShortlisted(entry.id);

  return (
    <button
      type="button"
      data-testid={`shortlist-toggle-${entry.id}`}
      aria-pressed={shortlisted}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleEntry(entry);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition",
        shortlisted
          ? "border-accent/35 bg-accentSoft text-accent hover:border-accent/45"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        compact ? "px-2.5 py-1.5 text-xs" : "",
        className
      )}
    >
      {shortlisted ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {compact ? (shortlisted ? "Shortlisted" : "Shortlist") : shortlisted ? "Saved to shortlist" : "Add to shortlist"}
    </button>
  );
}
