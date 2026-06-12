"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildMarkdownReport,
  copyTextToClipboard,
  downloadMarkdown,
} from "@/lib/report-export";
import type { ComparisonResult, ScoreWeights } from "@/lib/scoring";

type CopyState = "idle" | "copied" | "failed";

export function ExportReportButton({
  result,
  weights,
}: {
  result: ComparisonResult;
  weights: ScoreWeights;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  const flashState = (state: CopyState) => {
    setCopyState(state);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleCopy = async () => {
    const report = buildMarkdownReport(result, weights);
    const ok = await copyTextToClipboard(report);
    if (ok) {
      flashState("copied");
    } else {
      // Clipboard unavailable (permissions, insecure context): fall back
      // to downloading so the user still gets the report.
      downloadMarkdown(report);
      flashState("failed");
    }
  };

  const handleDownload = () => {
    downloadMarkdown(buildMarkdownReport(result, weights));
  };

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        {copyState === "copied" ? (
          <>
            <Check className="size-4 text-emerald-600" />
            Copied!
          </>
        ) : copyState === "failed" ? (
          <>
            <TriangleAlert className="size-4 text-amber-600" />
            Downloaded instead
          </>
        ) : (
          <>
            <Copy className="size-4" />
            Copy report
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownload}
      >
        <Download className="size-4" />
        Download .md
      </Button>
    </div>
  );
}
