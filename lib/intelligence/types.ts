import type { Route } from "next";
import type { Officer } from "@/lib/officers/types";

export type CounterEntry = {
  key: string;
  count: number;
};

export type BatchIntelligence = {
  year: number;
  officer_count: number;
  cadre_mix: CounterEntry[];
  current_rank_distribution: CounterEntry[];
  average_timeline_entries: number;
  average_station_diversity: number;
  top_stations: CounterEntry[];
  common_designations: CounterEntry[];
  archetype_distribution: CounterEntry[];
  sample_officer_ids: string[];
  related_batch_years: number[];
  quick_insight: string;
  narrative: string;
};

export type CadreIntelligence = {
  cadre: string;
  slug: string;
  description: string;
  officer_count: number;
  average_timeline_entries: number;
  typical_current_rank_spread: CounterEntry[];
  common_rank_progressions: CounterEntry[];
  batch_spread: CounterEntry[];
  common_stations: CounterEntry[];
  archetype_distribution: CounterEntry[];
  sample_officer_ids: string[];
  distinctiveness: string;
};

export type StationRelated = {
  station: string;
  count: number;
  slug: string;
};

export type StationCorridor = {
  from: string;
  to: string;
  count: number;
};

export type StationIntelligence = {
  name: string;
  slug: string;
  officer_count: number;
  posting_frequency: number;
  total_known_tenure_days: number;
  importance_score: number;
  importance_label: string;
  common_designations: CounterEntry[];
  frequent_batches: CounterEntry[];
  notable_officer_ids: string[];
  related_stations: StationRelated[];
  movement_corridors: StationCorridor[];
  average_timeline_entries_for_linked_officers: number;
  narrative: string;
};

export type CareerPathBand = {
  threshold_years?: number | null;
  sample_size: number;
  sample_officer_ids: string[];
};

export type CareerPathIntelligence = {
  typical_progression_ladder: string[];
  common_progressions: CounterEntry[];
  rank_step_timings: Array<{
    rank: string;
    average_years_to_reach: number | null;
    sample_size: number;
  }>;
  trajectory_bands: {
    fast: CareerPathBand;
    steady: CareerPathBand;
    deliberate: CareerPathBand;
  };
  representative_journeys: Array<{
    officer_id: string;
    name: string | null;
    batch: number | null;
    cadre: string | null;
    timeline_entries: number;
    archetype: string;
  }>;
  caveat: string;
};

export type DiscoveryJourney = {
  id: string;
  title: string;
  description: string;
  href: Route;
  learn_outcome: string;
};

export type DiscoveryIntelligence = {
  journeys: DiscoveryJourney[];
};

export type RecommendationItem = {
  title: string;
  description: string;
  href: Route;
};

export type RelatedOfficerCard = {
  officer: Officer;
  score: number;
  reason: string;
};
