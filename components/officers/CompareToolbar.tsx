"use client";

import { Copy, Link2 } from "lucide-react";
import { useState } from "react";

type CompareToolbarProps = {
  ids: string[];
  summary: string;
};

export function CompareToolbar({ ids, summary }: CompareToolbarProps): JSX.Element {
  const [copied, setCopied] = useState<"summary" | "url" | null>(null);
  const comparePath = `/compare?ids=${ids.join(",")}`;

  async function copyText(value: string, mode: "summary" | "url"): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(mode);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => copyText(summary, "summary")}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
      >
        <Copy className="h-4 w-4" />
        {copied === "summary" ? "Copied summary" : "Copy comparison summary"}
      </button>

      <button
        type="button"
        onClick={() => copyText(`${window.location.origin}${comparePath}`, "url")}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
      >
        <Link2 className="h-4 w-4" />
        {copied === "url" ? "Copied compare URL" : "Copy compare URL"}
      </button>
    </div>
  );
}
