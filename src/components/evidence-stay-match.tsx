"use client";

import { useMemo } from "react";

import { Panel, StatusTag } from "@/components/briefing";
import { UserTripProfileEditor } from "@/components/user-trip-profile";
import {
  buildStayMatch,
  type EvidenceSnippet,
  type RuleStatus,
} from "@/lib/stay-match-rag";
import type { ScoredStay } from "@/lib/scoring";
import type { UserTripProfile } from "@/lib/types";

const STATUS_MAP: Record<
  RuleStatus,
  { status: "go" | "caution" | "nogo" | "neutral"; label: string }
> = {
  met: { status: "go", label: "Met" },
  unmet: { status: "caution", label: "Unmet" },
  warning: { status: "nogo", label: "Risk" },
  unknown: { status: "neutral", label: "No data" },
};

const KIND_LABEL: Record<string, string> = {
  must: "Must",
  deal: "Deal-breaker",
  nice: "Nice",
  need: "Need",
};

function EvidenceList({ evidence }: { evidence: EvidenceSnippet[] }) {
  if (evidence.length === 0) {
    return <p className="eyebrow">No evidence snippet</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {evidence.map((snippet, index) => (
        <div
          key={`${snippet.source}-${index}`}
          className="border-l-2 border-border pl-3"
        >
          <span className="eyebrow">{snippet.sourceLabel}</span>
          <p className="text-sm italic leading-relaxed text-muted-foreground">
            &ldquo;{snippet.text}&rdquo;
          </p>
        </div>
      ))}
    </div>
  );
}

export function EvidenceStayMatch({
  scoredStays,
  profile,
  onProfileChange,
}: {
  scoredStays: ScoredStay[];
  profile: UserTripProfile;
  onProfileChange: (profile: UserTripProfile) => void;
}) {
  const match = useMemo(
    () => buildStayMatch(scoredStays, profile),
    [scoredStays, profile]
  );
  const bestScore =
    match.scores.find((s) => s.stayId === match.bestStayId)?.score ?? 0;
  const altScore =
    match.scores.find((s) => s.stayId === match.bestAlternativeId)?.score ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Retrieves evidence from each listing&apos;s description, reviews, house
        rules, amenities, ratings, nearby and airport data, and the scoring
        analysis, then matches it against your stated needs. Every claim cites
        the evidence it came from; where no evidence exists, it says so.
      </p>

      <UserTripProfileEditor profile={profile} onChange={onProfileChange} />

      {!match.hasProfile ? (
        <Panel title="Evidence match">
          <p className="text-sm text-muted-foreground">
            Add at least one need, must-have, deal-breaker, or threshold above
            to run the evidence-based match.
          </p>
        </Panel>
      ) : (
        <>
          {/* Best match + confidence */}
          <Panel
            title="Best match"
            aside={
              <span className="eyebrow">
                Confidence {match.confidence}%
              </span>
            }
            bodyClassName="flex flex-wrap items-baseline justify-between gap-3"
          >
            <h3 className="text-2xl font-bold tracking-tight">
              {match.bestStayName ?? "No match"}
            </h3>
            <span className="data text-xl font-bold">
              {bestScore}
              <span className="text-sm font-normal text-muted-foreground">
                /100 match
              </span>
            </span>
          </Panel>

          {/* Why it wins */}
          <Panel title="Why it wins" bodyClassName="flex flex-col gap-4">
            {match.whyItWins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enough positive evidence to justify a pick yet.
              </p>
            ) : (
              match.whyItWins.map((reason) => (
                <div key={reason.claim} className="flex flex-col gap-2">
                  <p className="text-sm font-semibold">{reason.claim}</p>
                  <EvidenceList evidence={reason.evidence} />
                </div>
              ))
            )}
          </Panel>

          {/* Deal-breaker warnings */}
          <Panel
            title="Deal-breaker warnings"
            aside={
              <span className="data text-xs text-muted-foreground">
                {String(match.dealbreakerWarnings.length).padStart(2, "0")}
              </span>
            }
            bodyClassName="flex flex-col gap-4"
          >
            {match.dealbreakerWarnings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deal-breakers flagged on any stay.
              </p>
            ) : (
              match.dealbreakerWarnings.map((warning, index) => (
                <div key={`${warning.stayId}-${index}`} className="flex flex-col gap-2">
                  <p className="text-sm">
                    <StatusTag status="nogo">{warning.stayName}</StatusTag>{" "}
                    <span className="font-medium">{warning.rule}</span>
                  </p>
                  <EvidenceList evidence={warning.evidence} />
                </div>
              ))
            )}
          </Panel>

          {/* Rule-by-rule comparison */}
          <Panel title="Rule-by-rule comparison" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="eyebrow h-9 px-3 text-left">Rule</th>
                    {scoredStays.map((entry) => (
                      <th
                        key={entry.stay.id}
                        className="eyebrow h-9 max-w-32 truncate px-3 text-left"
                        title={entry.stay.name}
                      >
                        {entry.stay.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {match.rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{rule.label}</span>{" "}
                        <span className="eyebrow">{KIND_LABEL[rule.kind]}</span>
                      </td>
                      {scoredStays.map((entry) => {
                        const outcome = rule.perStay[entry.stay.id];
                        const map = STATUS_MAP[outcome.status];
                        return (
                          <td key={entry.stay.id} className="px-3 py-2.5">
                            <StatusTag status={map.status}>{map.label}</StatusTag>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Must-have matches */}
          <Panel title="Must-have matches" bodyClassName="flex flex-col gap-3">
            {match.mustHaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No must-haves specified.
              </p>
            ) : (
              match.mustHaves.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="min-w-40 flex-1 text-sm font-medium">
                    {rule.label}
                  </span>
                  {scoredStays.map((entry) => {
                    const map = STATUS_MAP[rule.perStay[entry.stay.id].status];
                    return (
                      <span
                        key={entry.stay.id}
                        className="flex items-center gap-1.5"
                      >
                        <span className="eyebrow max-w-24 truncate">
                          {entry.stay.name}
                        </span>
                        <StatusTag status={map.status}>{map.label}</StatusTag>
                      </span>
                    );
                  })}
                </div>
              ))
            )}
          </Panel>

          {/* Best alternative + missing info */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Best alternative">
              {match.bestAlternativeName ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-semibold">
                    {match.bestAlternativeName}
                  </span>
                  <span className="data font-bold">{altScore}/100</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No alternative on the shortlist.
                </p>
              )}
            </Panel>

            <Panel
              title="Missing information"
              aside={
                <span className="data text-xs text-muted-foreground">
                  {String(match.missingInfo.length).padStart(2, "0")}
                </span>
              }
              bodyClassName="p-0"
            >
              {match.missingInfo.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Every rule had evidence on the best match.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {match.missingInfo.map((item) => (
                    <li key={item} className="px-4 py-2.5 text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
