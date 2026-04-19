import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { OfficerMiniCard } from "@/components/intelligence/OfficerMiniCard";
import type { Officer } from "@/lib/officers/types";
import type { OfficerOfficeContext } from "@/lib/intelligence/officeContext";

type OfficeContextPanelProps = {
  officer: Officer;
  context: OfficerOfficeContext;
  returnTo?: string | null;
};

export function OfficeContextPanel({
  officer,
  context,
  returnTo
}: OfficeContextPanelProps): JSX.Element {
  const groups = [
    {
      title: "Same current station",
      items: context.sameStation
    },
    {
      title: "Same current organization unit",
      items: context.sameOrganization
    },
    {
      title: "Nearby designation band",
      items: context.nearbyDesignationBand
    }
  ].filter((group) => group.items.length > 0);

  return (
    <InsightPanel
      testId="office-context-panel"
      title="Current Office Context"
      subtitle="Co-location and current-unit context, separated from trajectory similarity"
    >
      <p className="text-sm text-slate-700">
        Reporting-line data is not available in this dataset. For {officer.name ?? officer.employee_id}, the context
        below shows current station, unit, and designation proximity only.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {context.station ? <span className="pill">Station {context.station}</span> : null}
        {context.organization ? <span className="pill">{context.organization}</span> : null}
        {context.designation ? <span className="pill">{context.designation}</span> : null}
        <span className="pill">Hierarchy unavailable</span>
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          Current office context could not be resolved from available current-posting data.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <section key={group.title}>
              <div className="mb-3">
                <p className="text-label">{group.title}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((item) => (
                  <OfficerMiniCard
                    key={`${group.title}-${item.officer.id}`}
                    officer={item.officer}
                    reason={item.reason}
                    returnTo={returnTo}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </InsightPanel>
  );
}
