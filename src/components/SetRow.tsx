"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { BandIntensity, WeightUnit } from "@/lib/types";

const BAND_LABELS: Record<BandIntensity, string> = {
  L: "Light",
  M: "Moderate",
  H: "Heavy",
};

interface SetRowProps {
  setNumber: number;
  targetReps: number;
  targetWeight: number;
  weightUnit: WeightUnit;
  // Only meaningful when weightUnit === "band".
  targetBandIntensity?: BandIntensity | null;
  done: boolean;
  loggedReps?: number;
  loggedWeight?: number;
  loggedBandIntensity?: BandIntensity | null;
  // Decision: logging must capture actual reps/weight, not just done/not-done.
  // Pre-filled with the target so confirming is usually a single tap, but
  // both fields are editable before confirming. For band exercises,
  // actualWeight is unused (0) and actualBandIntensity carries the L/M/H.
  onConfirm: (actualReps: number, actualWeight: number, actualBandIntensity: BandIntensity | null) => void;
}

export function SetRow({
  setNumber,
  targetReps,
  targetWeight,
  weightUnit,
  targetBandIntensity,
  done,
  loggedReps,
  loggedWeight,
  loggedBandIntensity,
  onConfirm,
}: SetRowProps) {
  const [editing, setEditing] = useState(false);
  const [reps, setReps] = useState(targetReps);
  const [weight, setWeight] = useState(targetWeight);
  const [bandIntensity, setBandIntensity] = useState<BandIntensity>(targetBandIntensity ?? "M");
  const isBand = weightUnit === "band";

  const weightSummary = isBand
    ? loggedBandIntensity
      ? ` · ${BAND_LABELS[loggedBandIntensity]} band`
      : ""
    : targetWeight
      ? ` · ${loggedWeight ?? targetWeight} ${weightUnit}`
      : "";

  if (done) {
    return (
      <div className="mb-2 flex items-center justify-between rounded-xl border-[1.5px] border-complete bg-complete px-4 py-4 text-white">
        <span className="text-sm font-bold">Set {setNumber}</span>
        <span className="tabular text-[13px] text-white/90">
          {loggedReps ?? targetReps} reps
          {weightSummary}
        </span>
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/20">
          <Check size={15} className="text-white" />
        </span>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mb-2 rounded-xl border-[1.5px] border-primary bg-card px-4 py-4">
        <span className="mb-2 block text-sm font-bold text-ink">Set {setNumber}</span>
        <div className="mb-3 flex gap-3">
          <label className="flex-1 text-xs text-slate">
            Reps
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="tabular mt-1 w-full rounded-lg border border-border px-2 py-2 text-sm text-ink"
            />
          </label>
          {isBand ? (
            <label className="flex-1 text-xs text-slate">
              Band intensity
              <div className="mt-1 flex gap-1.5">
                {(["L", "M", "H"] as BandIntensity[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setBandIntensity(level)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-bold ${
                      bandIntensity === level
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-ink"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </label>
          ) : (
            targetWeight > 0 && (
              <label className="flex-1 text-xs text-slate">
                Weight ({weightUnit})
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="tabular mt-1 w-full rounded-lg border border-border px-2 py-2 text-sm text-ink"
                />
              </label>
            )
          )}
        </div>
        <button
          onClick={() => onConfirm(reps, isBand ? 0 : weight, isBand ? bandIntensity : null)}
          className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold uppercase tracking-wide text-white"
        >
          Confirm set
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="mb-2 flex w-full items-center justify-between rounded-xl border-[1.5px] border-border bg-card px-4 py-4"
    >
      <span className="text-sm font-bold text-ink">Set {setNumber}</span>
      <span className="tabular text-[13px] text-slate">
        {targetReps} reps
        {isBand
          ? targetBandIntensity
            ? ` · ${BAND_LABELS[targetBandIntensity]} band`
            : ""
          : targetWeight
            ? ` · ${targetWeight} ${weightUnit}`
            : ""}
      </span>
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-chalk text-slate">
        +
      </span>
    </button>
  );
}
