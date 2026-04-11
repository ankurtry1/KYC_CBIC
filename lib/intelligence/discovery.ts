import type { DiscoveryJourney } from "@/lib/intelligence/types";

export function groupedJourneys(journeys: DiscoveryJourney[]): {
  title: string;
  items: DiscoveryJourney[];
}[] {
  return [
    {
      title: "Start with people",
      items: journeys.filter((journey) => journey.href === "/officers" || journey.href === "/batches")
    },
    {
      title: "Understand system patterns",
      items: journeys.filter((journey) => journey.href === "/cadres" || journey.href === "/stations" || journey.href === "/career-paths")
    },
    {
      title: "Guided orientation",
      items: journeys.filter((journey) => journey.href === "/learn")
    }
  ];
}
