import { Panel, StatusTag } from "@/components/briefing";
import { scoreTextClass } from "@/components/verdict-badge";
import {
  buildTravelTimelines,
  type CheckpointStatus,
  type Friction,
  type StayTimeline,
} from "@/lib/travel-timeline";
import type { ComparisonResult } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const NODE_FILL: Record<CheckpointStatus, string> = {
  go: "bg-go",
  caution: "bg-caution",
  nogo: "bg-nogo",
  signal: "bg-signal",
  neutral: "bg-muted-foreground",
};

const FRICTION_STATUS: Record<Friction, "go" | "caution" | "nogo" | "neutral"> = {
  Low: "go",
  Moderate: "caution",
  High: "nogo",
  Unknown: "neutral",
};

function TimelineRail({ timeline }: { timeline: StayTimeline }) {
  return (
    <ol className="flex flex-col">
      {timeline.checkpoints.map((checkpoint, index) => {
        const isLast = index === timeline.checkpoints.length - 1;
        return (
          <li key={checkpoint.id} className="flex gap-3">
            {/* Route rail */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-1.5 size-2.5 shrink-0 border-2 border-foreground",
                  NODE_FILL[checkpoint.status]
                )}
                aria-hidden
              />
              {!isLast && <span className="w-px flex-1 bg-border" />}
            </div>
            {/* Checkpoint */}
            <div className={cn("flex-1", isLast ? "pb-0" : "pb-5")}>
              {checkpoint.time && (
                <span className="data block text-xs font-semibold text-muted-foreground">
                  {checkpoint.time}
                </span>
              )}
              <p className="font-semibold leading-tight">{checkpoint.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {checkpoint.detail}
              </p>
              {checkpoint.sub.map((line) => (
                <p key={line} className="eyebrow mt-1">
                  {line}
                </p>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StayTimelineCard({ timeline }: { timeline: StayTimeline }) {
  return (
    <Panel
      title={<span className="block truncate">{timeline.stayName}</span>}
      titleClassName="text-sm font-semibold"
      aside={
        <span className={cn("data text-sm font-bold", scoreTextClass(timeline.overallScore))}>
          {timeline.overallScore}
        </span>
      }
      bodyClassName="flex flex-col gap-4"
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        {timeline.narrative}
      </p>

      {/* Route summary metrics */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-3 border-y border-border py-3">
        <div>
          <span className="eyebrow block">Transfer</span>
          <span className="data text-sm font-semibold">
            {timeline.transferMinutes != null
              ? `${timeline.transferMinutes} min`
              : "—"}
          </span>
        </div>
        <div>
          <span className="eyebrow block">Distance</span>
          <span className="data text-sm font-semibold">
            {timeline.distanceKm != null ? `${timeline.distanceKm} km` : "—"}
          </span>
        </div>
        <div>
          <span className="eyebrow block">Walkability</span>
          <span className="data text-sm font-semibold">
            {timeline.walkability}
          </span>
        </div>
      </div>

      <TimelineRail timeline={timeline} />
    </Panel>
  );
}

function RouteComparison({ timelines }: { timelines: StayTimeline[] }) {
  const cell = "px-3 py-2.5 text-sm";
  return (
    <Panel title="Route comparison" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="eyebrow h-9 px-3 text-left">Stay</th>
              <th className="eyebrow h-9 px-3 text-left">Transfer</th>
              <th className="eyebrow h-9 px-3 text-left">To food</th>
              <th className="eyebrow h-9 px-3 text-left">To transit</th>
              <th className="eyebrow h-9 px-3 text-left">Activity</th>
              <th className="eyebrow h-9 px-3 text-left">Arrival</th>
            </tr>
          </thead>
          <tbody>
            {timelines.map((timeline) => (
              <tr
                key={timeline.stayId}
                className="border-b border-border last:border-0"
              >
                <td
                  className={cn(cell, "max-w-40 truncate font-medium")}
                  title={timeline.stayName}
                >
                  {timeline.stayName}
                </td>
                <td className={cn(cell, "data text-muted-foreground")}>
                  {timeline.transferMinutes != null
                    ? `${timeline.transferMinutes} min`
                    : "—"}
                </td>
                <td className={cn(cell, "data text-muted-foreground")}>
                  {timeline.foodWalkMinutes != null
                    ? `${timeline.foodWalkMinutes} min`
                    : "—"}
                </td>
                <td className={cn(cell, "data text-muted-foreground")}>
                  {timeline.transitWalkMinutes != null
                    ? `${timeline.transitWalkMinutes} min`
                    : "—"}
                </td>
                <td className={cn(cell, "text-muted-foreground")}>
                  {timeline.activityLevel}
                </td>
                <td className={cell}>
                  <StatusTag status={FRICTION_STATUS[timeline.arrivalFriction]}>
                    {timeline.arrivalFriction}
                  </StatusTag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function TravelTimeline({ result }: { result: ComparisonResult }) {
  const timelines = buildTravelTimelines(result);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Door-to-door journey for each stay — built from airport transfer
        estimates and real walking distances to food, transit, and nightlife.
        Times reference a nominal midday landing.
      </p>
      <RouteComparison timelines={timelines} />
      <div className="grid gap-4 lg:grid-cols-2">
        {timelines.map((timeline) => (
          <StayTimelineCard key={timeline.stayId} timeline={timeline} />
        ))}
      </div>
    </div>
  );
}
