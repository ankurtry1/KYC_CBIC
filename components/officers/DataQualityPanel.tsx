import type { Officer } from "@/lib/officers/types";
import { DataQualityBadge } from "@/components/officers/DataQualityBadge";
import { VerificationBadge } from "@/components/officers/VerificationBadge";
import { confidenceLabel } from "@/lib/utils/format";

type DataQualityPanelProps = {
  officer: Officer;
};

export function DataQualityPanel({ officer }: DataQualityPanelProps): JSX.Element {
  const quality = officer.data_quality;
  const warnings = quality?.warnings ?? [];
  const missing = quality?.missing_fields ?? [];
  const dedupeConfidence = quality?.dedupe_confidence;
  const postingConfidence = officer.current_posting?.confidence;

  return (
    <section data-testid="data-quality-panel" className="panel p-5">
      <p className="text-label">Data Quality & Verification</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <VerificationBadge flag={officer.verification_flag ?? "unknown"} />
        <DataQualityBadge label={officer.data_quality_label ?? "Needs Review"} />
        <span className="pill">Timeline {quality?.timeline_quality ?? "minimal"}</span>
        {dedupeConfidence != null ? <span className="pill">Identity confidence {confidenceLabel(dedupeConfidence)}</span> : null}
        {postingConfidence != null ? <span className="pill">Posting confidence {confidenceLabel(postingConfidence)}</span> : null}
        {warnings.length > 0 ? <span className="pill">{warnings.length} warning{warnings.length === 1 ? "" : "s"}</span> : null}
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-700">
        <div>
          <p className="font-medium text-slate-800">Missing fields</p>
          {missing.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {missing.map((field) => (
                <span key={field} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                  {field}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No critical missing fields in the parsed profile.</p>
          )}
        </div>

        <div>
          <p className="font-medium text-slate-800">Warnings</p>
          {warnings.length > 0 ? (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No active warnings from current derivation rules.</p>
          )}
        </div>
      </div>
    </section>
  );
}
