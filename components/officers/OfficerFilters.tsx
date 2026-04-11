"use client";

import type { OfficerFilters, TimelineQuality, VerificationFlag } from "@/lib/officers/types";

type OfficerFiltersProps = {
  filters: OfficerFilters;
  options: {
    cadres: string[];
    batches: string[];
    designations: string[];
    locations: string[];
  };
  onChange: (next: OfficerFilters) => void;
};

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(15,76,92,0.08)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OfficerFiltersPanel({ filters, options, onChange }: OfficerFiltersProps): JSX.Element {
  return (
    <div className="panel grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
      <SelectField
        label="Cadre"
        value={filters.cadre}
        onChange={(value) => onChange({ ...filters, cadre: value })}
        options={[{ value: "all", label: "All cadres" }, ...options.cadres.map((item) => ({ value: item, label: item }))]}
      />

      <SelectField
        label="Batch"
        value={filters.batch}
        onChange={(value) => onChange({ ...filters, batch: value })}
        options={[{ value: "all", label: "All batches" }, ...options.batches.map((item) => ({ value: item, label: item }))]}
      />

      <SelectField
        label="Designation"
        value={filters.designation}
        onChange={(value) => onChange({ ...filters, designation: value })}
        options={[
          { value: "all", label: "All designations" },
          ...options.designations.map((item) => ({ value: item, label: item }))
        ]}
      />

      <SelectField
        label="Location"
        value={filters.location}
        onChange={(value) => onChange({ ...filters, location: value })}
        options={[{ value: "all", label: "All locations" }, ...options.locations.map((item) => ({ value: item, label: item }))]}
      />

      <SelectField
        label="Timeline Quality"
        value={filters.timelineQuality}
        onChange={(value) => onChange({ ...filters, timelineQuality: value as TimelineQuality | "all" })}
        options={[
          { value: "all", label: "All profiles" },
          { value: "full", label: "Full timeline" },
          { value: "partial", label: "Partial timeline" },
          { value: "minimal", label: "Minimal timeline" }
        ]}
      />

      <SelectField
        label="Verification"
        value={filters.verification}
        onChange={(value) => onChange({ ...filters, verification: value as VerificationFlag | "all" })}
        options={[
          { value: "all", label: "All records" },
          { value: "verified", label: "Verified" },
          { value: "not_verified", label: "Not Verified" },
          { value: "unknown", label: "Unknown" }
        ]}
      />

      <SelectField
        label="Sort By"
        value={filters.sortBy}
        onChange={(value) => onChange({ ...filters, sortBy: value as OfficerFilters["sortBy"] })}
        options={[
          { value: "name", label: "Name" },
          { value: "employee_id", label: "Employee ID" },
          { value: "batch", label: "Batch" },
          { value: "present_rank_date", label: "Present rank date" },
          { value: "timeline_richness", label: "Timeline richness" }
        ]}
      />

      <SelectField
        label="Sort Order"
        value={filters.sortOrder}
        onChange={(value) => onChange({ ...filters, sortOrder: value as OfficerFilters["sortOrder"] })}
        options={[
          { value: "asc", label: "Ascending" },
          { value: "desc", label: "Descending" }
        ]}
      />
    </div>
  );
}
