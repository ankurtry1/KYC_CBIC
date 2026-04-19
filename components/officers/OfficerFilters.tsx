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
  onChange: (patch: Partial<OfficerFilters>) => void;
};

function SelectField({
  label,
  value,
  options,
  onChange,
  testId
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  testId: string;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label">{label}</span>
      <select
        data-testid={testId}
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
    <div data-testid="directory-filters" className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-label">Advanced Filters</p>
        <p className="text-xs text-slate-500">Refine beyond quick filters</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SelectField
        testId="filter-cadre"
        label="Cadre"
        value={filters.cadre}
        onChange={(value) => onChange({ cadre: value })}
        options={[{ value: "all", label: "All cadres" }, ...options.cadres.map((item) => ({ value: item, label: item }))]}
      />

      <SelectField
        testId="filter-batch"
        label="Batch"
        value={filters.batch}
        onChange={(value) => onChange({ batch: value })}
        options={[{ value: "all", label: "All batches" }, ...options.batches.map((item) => ({ value: item, label: item }))]}
      />

      <SelectField
        testId="filter-designation"
        label="Designation"
        value={filters.designation}
        onChange={(value) => onChange({ designation: value })}
        options={[
          { value: "all", label: "All designations" },
          ...options.designations.map((item) => ({ value: item, label: item }))
        ]}
      />

      <SelectField
        testId="filter-location"
        label="Location"
        value={filters.location}
        onChange={(value) => onChange({ location: value })}
        options={[{ value: "all", label: "All locations" }, ...options.locations.map((item) => ({ value: item, label: item }))]}
      />

      <SelectField
        testId="filter-timeline-quality"
        label="Timeline Quality"
        value={filters.timelineQuality}
        onChange={(value) => onChange({ timelineQuality: value as TimelineQuality | "all" })}
        options={[
          { value: "all", label: "All profiles" },
          { value: "full", label: "Full timeline" },
          { value: "partial", label: "Partial timeline" },
          { value: "minimal", label: "Minimal timeline" }
        ]}
      />

      <SelectField
        testId="filter-verification"
        label="Verification"
        value={filters.verification}
        onChange={(value) => onChange({ verification: value as VerificationFlag | "all" })}
        options={[
          { value: "all", label: "All records" },
          { value: "verified", label: "Verified" },
          { value: "not_verified", label: "Not Verified" },
          { value: "unknown", label: "Unknown" }
        ]}
      />

      <SelectField
        testId="filter-sort-by"
        label="Sort By"
        value={filters.sortBy}
        onChange={(value) => onChange({ sortBy: value as OfficerFilters["sortBy"] })}
        options={[
          { value: "name", label: "Name" },
          { value: "employee_id", label: "Employee ID" },
          { value: "batch", label: "Batch" },
          { value: "present_rank_date", label: "Present rank date" },
          { value: "timeline_richness", label: "Timeline richness" }
        ]}
      />

      <SelectField
        testId="filter-sort-order"
        label="Sort Order"
        value={filters.sortOrder}
        onChange={(value) => onChange({ sortOrder: value as OfficerFilters["sortOrder"] })}
        options={[
          { value: "asc", label: "Ascending" },
          { value: "desc", label: "Descending" }
        ]}
      />
      </div>
    </div>
  );
}
