"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  type Variants,
} from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { IntakeQuestionCard } from "@/components/intake-question-card";
import { Button } from "@/components/ui/button";
import {
  createDefaultTripContext,
  getVisibleQuestions,
  type TripContext,
} from "@/lib/trip-intake";

const variants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 64 : -64,
    opacity: 0,
    scale: 0.98,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -64 : 64,
    opacity: 0,
    scale: 0.98,
  }),
};

const SWIPE_THRESHOLD = 80;

export function TripIntakeFlow({
  initialContext,
  onComplete,
  onUseSample,
}: {
  initialContext?: TripContext;
  onComplete: (context: TripContext) => void;
  /** Optional shortcut that fills a sample trip and jumps ahead. */
  onUseSample?: () => void;
}) {
  const [context, setContext] = useState<TripContext>(
    () => initialContext ?? createDefaultTripContext()
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const questions = useMemo(() => getVisibleQuestions(context), [context]);

  // Conditional questions can shrink the list; keep the index in range.
  const safeIndex = Math.min(index, questions.length - 1);
  const current = questions[safeIndex];
  const total = questions.length;
  const isLast = safeIndex === total - 1;
  const canAdvance = !current.required || current.answered(context);

  const goNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      onComplete(context);
      return;
    }
    setDirection(1);
    setIndex(safeIndex + 1);
  };

  const goBack = () => {
    if (safeIndex === 0) return;
    setDirection(-1);
    setIndex(safeIndex - 1);
  };

  // Keyboard navigation, bound once, calling the latest handlers via refs.
  const goNextRef = useRef(goNext);
  const goBackRef = useRef(goBack);
  goNextRef.current = goNext;
  goBackRef.current = goBack;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const inField =
        !!el &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
          el.getAttribute("role") === "slider" ||
          !!el.closest("[data-keep-keys]"));

      if (event.key === "Escape") {
        event.preventDefault();
        goBackRef.current();
        return;
      }
      // Let inputs and sliders consume their own arrow/enter keys.
      if (inField) return;
      if (event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        goNextRef.current();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBackRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) {
      goNext();
    } else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500) {
      goBack();
    }
  };

  const patch = (next: Partial<TripContext>) =>
    setContext((prev) => ({ ...prev, ...next }));

  // Swiping a card with a slider/search field inside fights those controls.
  const swipeable = current.kind === "single";
  const progress = Math.round(((safeIndex + 1) / total) * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-foreground">
            Trip intake, question {safeIndex + 1} of {total}
          </span>
          {onUseSample && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onUseSample}
            >
              <Sparkles className="size-4" />
              Use sample trip
            </Button>
          )}
        </div>
        <div
          className="h-1.5 w-full overflow-hidden bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-signal transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
            drag={swipeable ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={swipeable ? handleDragEnd : undefined}
            className="panel min-h-[20rem] cursor-default p-6 sm:p-8"
          >
            <IntakeQuestionCard
              question={current}
              context={context}
              onChange={patch}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={safeIndex === 0}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {!current.required && !isLast && (
            <Button type="button" variant="ghost" onClick={goNext}>
              Skip
            </Button>
          )}
          <Button type="button" onClick={goNext} disabled={!canAdvance}>
            {isLast ? "Continue to stays" : "Next"}
            {!isLast && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>

      {!canAdvance && (
        <p className="text-center text-sm text-muted-foreground">
          Pick an option to continue.
        </p>
      )}
    </div>
  );
}
