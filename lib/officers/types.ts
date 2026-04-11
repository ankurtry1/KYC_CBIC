export type VerificationFlag = "verified" | "not_verified" | "unknown";
export type TimelineQuality = "full" | "partial" | "minimal";

export type OfficerPosting = {
  posting_id?: string;
  designation?: string | null;
  rank_held?: string | null;
  organization_unit_id?: string | null;
  organization_unit_name?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  source_doc?: string | null;
  confidence?: number | null;
};

export type CurrentPosting = {
  post_id?: string | null;
  designation?: string | null;
  organization_unit_id?: string | null;
  organization_unit_name?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  confidence?: number | null;
};

export type StationHistoryEntry = {
  station: string;
  postings_count: number;
  known_tenure_days: number;
};

export type RelatedOfficerLink = {
  id: string;
  score: number;
  reason: string;
};

export type OfficerInsightSummary = {
  posting_records: number;
  unique_stations_served: number;
  known_service_span_years: number | null;
  years_to_current_rank: number | null;
  mobility_profile: string;
  timeline_richness_label: string;
  probable_exposure_breadth: string;
  likely_career_archetype: string;
  similar_officers_count: number;
};

export type Officer = {
  id: string;
  employee_id: string;
  name: string | null;
  normalized_name: string | null;
  batch: number | null;
  cadre: string | null;
  current_designation: string | null;
  present_rank_date: string | null;
  dob?: string | null;
  date_of_entry_gr_a?: string | null;
  current_posting?: CurrentPosting | null;
  posting_history: OfficerPosting[];
  station_history: StationHistoryEntry[];
  inferred_rank_progression: string[];
  inferred_specialization: string[];
  verification_flag: VerificationFlag;
  data_quality?: {
    missing_fields?: string[];
    timeline_quality?: TimelineQuality;
    dedupe_confidence?: number | null;
    warnings?: string[];
  };
  data_quality_label?: "Strong" | "Moderate" | "Partial" | "Needs Review";
  timeline_richness_score: number;
  timeline_entry_count: number;
  unique_station_count: number;
  known_service_span_years: number | null;
  mobility_profile: string;
  station_diversity_label: string;
  exposure_breadth_label: string;
  career_archetype: string;
  career_archetype_reason: string;
  dominant_stations: string[];
  designation_path: string[];
  rank_depth_score: number;
  years_in_service?: number | null;
  years_to_current_rank?: number | null;
  related_officer_ids: string[];
  related_officers: RelatedOfficerLink[];
  insight_summary: OfficerInsightSummary | null;
  narrative_summary: string | null;
};

export type OfficerIndexRecord = {
  id: string;
  employee_id: string;
  name: string | null;
  normalized_name: string | null;
  batch: number | null;
  cadre: string | null;
  current_designation: string | null;
  present_rank_date: string | null;
  current_location: string | null;
  current_posting_summary: string;
  timeline_quality: TimelineQuality;
  timeline_richness_score: number;
  timeline_entry_count: number;
  unique_station_count: number;
  mobility_profile: string;
  career_archetype: string;
  verification_flag: VerificationFlag;
  data_quality_label: "Strong" | "Moderate" | "Partial" | "Needs Review";
  search_blob: string;
};

export type OfficerMetrics = {
  total_officers: number;
  timeline_rich_officers: number;
  partial_timeline_officers: number;
  minimal_timeline_officers: number;
  cadres_covered: number;
  designation_spread: number;
  average_timeline_entries: number;
  verification_breakdown: Record<string, number>;
  cadre_breakdown: Record<string, number>;
};

export type OfficerFilters = {
  q: string;
  cadre: string;
  batch: string;
  designation: string;
  timelineQuality: TimelineQuality | "all";
  verification: VerificationFlag | "all";
  location: string;
  sortBy:
    | "name"
    | "batch"
    | "employee_id"
    | "present_rank_date"
    | "timeline_richness";
  sortOrder: "asc" | "desc";
};
