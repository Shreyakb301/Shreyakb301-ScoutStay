"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/report-export";
import {
  buildShareUrl,
  MAX_SHARE_URL_LENGTH,
  type ShareState,
} from "@/lib/share-comparison";

type ShareState_ = "idle" | "copied" | "long" | "failed";

const LABELS: Record<ShareState_, string> = {
  idle: "Copy share link",
  copied: "Link copied!",
  long: "Link is large — copied",
  failed: "Couldn't copy link",
};

export function ShareComparisonButton({ state }: { state: ShareState }) {
  const [status, setStatus] = useState<ShareState_>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  // A new comparison should reset any lingering feedback.
  useEffect(() => {
    setStatus("idle");
  }, [state]);

  const flash = (next: ShareState_) => {
    setStatus(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2500);
  };

  const handleShare = async () => {
    try {
      const url = await buildShareUrl(state);
      const ok = await copyTextToClipboard(url);
      if (!ok) {
        flash("failed");
        return;
      }
      flash(url.length > MAX_SHARE_URL_LENGTH ? "long" : "copied");
    } catch {
      flash("failed");
    }
  };

  const Icon =
    status === "copied"
      ? Check
      : status === "failed"
        ? TriangleAlert
        : status === "long"
          ? TriangleAlert
          : Link2;

  const iconClass =
    status === "copied"
      ? "size-4 text-emerald-600"
      : status === "failed" || status === "long"
        ? "size-4 text-amber-600"
        : "size-4";

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleShare}>
      <Icon className={iconClass} />
      {LABELS[status]}
    </Button>
  );
}
