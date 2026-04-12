export type ArchetypeGlossaryItem = {
  name: string;
  meaning: string;
  evidence: string;
};

export const ARCHETYPE_GLOSSARY: ArchetypeGlossaryItem[] = [
  {
    name: "Broad Multi-Station Leader",
    meaning: "Rich posting history across many stations with senior-rank movement.",
    evidence: "High posting count, high station diversity, and senior progression."
  },
  {
    name: "High-Mobility Officer",
    meaning: "Frequent movement across multiple stations and posting contexts.",
    evidence: "High posting count and broad station footprint."
  },
  {
    name: "Deep Senior Leadership Track",
    meaning: "Long known service span with sustained progression into senior roles.",
    evidence: "Senior current rank with strong service span continuity."
  },
  {
    name: "Field-Heavy Trajectory",
    meaning: "Journey reflects broad on-ground movement and rank progression depth.",
    evidence: "Multiple rank steps with continued posting movement."
  },
  {
    name: "Administrative Continuity Profile",
    meaning: "Stable continuity with focused movement in known records.",
    evidence: "Lower mobility footprint with consistent role continuity."
  },
  {
    name: "Narrow but Deep Service Track",
    meaning: "Dense posting depth concentrated across fewer stations.",
    evidence: "High posting depth but lower station diversity."
  },
  {
    name: "Emerging Leader Path",
    meaning: "Early-to-mid career profile with visible progression momentum.",
    evidence: "Relatively faster movement toward current rank with rank progression signals."
  },
  {
    name: "Mixed Exposure Profile",
    meaning: "Balanced combination of movement and progression evidence.",
    evidence: "Moderate posting depth and station diversity with mixed rank progression."
  }
];

export const INTELLIGENCE_TERMS: Array<{ term: string; meaning: string }> = [
  {
    term: "Posting records",
    meaning: "Known structured entries in posting history after cleanup and deduplication."
  },
  {
    term: "Timeline entries",
    meaning: "Chronological posting rows used to reconstruct the officer journey."
  },
  {
    term: "Known service span",
    meaning: "Approximate duration between earliest and latest known posting dates."
  },
  {
    term: "Mobility profile",
    meaning: "Descriptive label derived from posting count and station diversity."
  },
  {
    term: "Station diversity",
    meaning: "Count and spread of unique stations in known records."
  },
  {
    term: "Exposure breadth",
    meaning: "Composite descriptive label combining station spread, posting depth, and rank depth."
  },
  {
    term: "Related officers",
    meaning: "Deterministic similarity from batch, cadre, station overlap, and progression overlap."
  },
  {
    term: "Inference confidence",
    meaning: "Confidence indicator for inferred fields when source records are partial or noisy."
  }
];

export const INTELLIGENCE_DISCLAIMER =
  "These labels are descriptive and non-evaluative. They summarize available records and may under-represent missing or unverified source entries.";
