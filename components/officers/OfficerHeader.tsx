"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Briefcase, CalendarDays, Hash, MapPin } from "lucide-react";
import type { Officer } from "@/lib/officers/types";
import { officerDisplayName } from "@/lib/officers/derive";
import { stationHrefFromLocation } from "@/lib/officers/navigation";
import { createShortlistEntryFromOfficer } from "@/lib/officers/shortlist";
import { formatDate } from "@/lib/utils/date";
import { confidenceLabel } from "@/lib/utils/format";
import { VerificationBadge } from "@/components/officers/VerificationBadge";
import { DataQualityBadge } from "@/components/officers/DataQualityBadge";
import { ShortlistButton } from "@/components/officers/ShortlistButton";

type OfficerHeaderProps = {
  officer: Officer;
};

export function OfficerHeader({ officer }: OfficerHeaderProps): JSX.Element {
  const warnings = officer.data_quality?.warnings ?? [];
  const currentLocation =
    officer.current_posting?.station_display ?? officer.current_posting?.location ?? "Location unavailable";
  const stationHref = stationHrefFromLocation(currentLocation);
  const shortlistEntry = createShortlistEntryFromOfficer(officer);

  return (
    <motion.section
      data-testid="officer-header"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="panel relative overflow-hidden p-6 md:p-8"
    >
      <div className="absolute inset-0 bg-mesh-soft opacity-80" />
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-accent/20 to-transparent blur-3xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-label">Officer Profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {officerDisplayName(officer)}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="pill">Cadre {officer.cadre ?? "Unknown"}</span>
            <span className="pill">Batch {officer.batch ?? "NA"}</span>
            <span className="pill inline-flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              {officer.employee_id}
            </span>
          </div>

          <div className="mt-5 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-accent/80" />
              {officer.current_designation ?? "Designation unavailable"}
            </p>
            <p className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent/80" />
              {stationHref ? (
                <Link href={stationHref} className="text-accent transition hover:underline">
                  {currentLocation}
                </Link>
              ) : (
                currentLocation
              )}
            </p>
            <p className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent/80" />
              Present rank since {formatDate(officer.present_rank_date)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
          <ShortlistButton entry={shortlistEntry} />
          <VerificationBadge flag={officer.verification_flag ?? "unknown"} />
          <DataQualityBadge label={officer.data_quality_label ?? "Needs Review"} />
          <span className="pill">{officer.timeline_entry_count ?? 0} posting records</span>
          <span className="pill">Confidence {confidenceLabel(officer.current_posting?.confidence)}</span>
          {warnings.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {warnings.length} warning{warnings.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}
