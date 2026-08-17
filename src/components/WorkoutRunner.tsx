"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { SetRow } from "@/components/SetRow";
import { logSetOffline } from "@/lib/offline/queue";
import { completeSession } from "@/lib/actions/completeSession";
import type { BandIntensity, Equipment, WeightUnit } from "@/lib/types";

interface RunnerExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  weightUnit: WeightUnit;
  // Only meaningful when weightUnit === "band".
  bandIntensity: BandIntensity | null;
  equipment: Equipment | null;
  notes: string | null;
}

interface ExistingLog {
  assignment_exercise_id: string;
  set_number: number;
  actual_reps: number;
  actual_weight: number;
  actual_band_intensity: BandIntensity | null;
}

export function WorkoutRunner({
  sessionId,
  sessionTitle,
  clientId,
  exercises,
  existingLogs,
}: {
  sessionId: string;
  sessionTitle: string;
  clientId: string;
  weightUnit: WeightUnit;
  exercises: RunnerExercise[];
  existingLogs: ExistingLog[];
}) {
  const router = useRouter();
  const [exIndex, setExIndex] = useState(0);
  // Keyed by `${exerciseId}:${setNumber}` -> { reps, weight, bandIntensity }.
  // Seeded from whatever already synced, so resuming a session shows prior
  // progress.
  const [logs, setLogs] = useState<
    Record<string, { reps: number; weight: number; bandIntensity: BandIntensity | null }>
  >(() => {
    const initial: Record<string, { reps: number; weight: number; bandIntensity: BandIntensity | null }> = {};
    for (const log of existingLogs) {
      initial[`${log.assignment_exercise_id}:${log.set_number}`] = {
        reps: log.actual_reps,
        weight: log.actual_weight,
        bandIntensity: log.actual_band_intensity,
      };
    }
    return initial;
  });

  const exercise = exercises[exIndex];
  const loggedCount = useMemo(
    () => Array.from({ length: exercise.sets }, (_, i) => i + 1).filter((n) => logs[`${exercise.id}:${n}`]).length,
    [logs, exercise]
  );
  const progressPct = Math.round(((exIndex + loggedCount / exercise.sets) / exercises.length) * 100);

  async function handleLogSet(
    setNumber: number,
    actualReps: number,
    actualWeight: number,
    actualBandIntensity: BandIntensity | null
  ) {
    // Instant local write — the whole point of the offline-first design is
    // that this never waits on the network (see lib/offline/queue.ts).
    setLogs((prev) => ({
      ...prev,
      [`${exercise.id}:${setNumber}`]: { reps: actualReps, weight: actualWeight, bandIntensity: actualBandIntensity },
    }));
    await logSetOffline({
      assignment_exercise_id: exercise.id,
      client_id: clientId,
      set_number: setNumber,
      actual_reps: actualReps,
      actual_weight: actualWeight,
      actual_weight_unit: exercise.weightUnit,
      actual_band_intensity: actualBandIntensity,
      client_logged_at: new Date().toISOString(),
    });
  }

  async function handleNext() {
    if (exIndex < exercises.length - 1) {
      setExIndex(exIndex + 1);
    } else {
      await completeSession(sessionId);
      router.push("/");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title={sessionTitle} backHref="/" />
      <div className="px-5 pb-2.5">
        <div className="h-[5px] overflow-hidden rounded-full bg-border">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="m-0 mt-1.5 text-[11px] text-slate">
          Exercise {exIndex + 1} of {exercises.length}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        <div className="mb-4 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2B2D2C] to-ink">
          <Play size={28} className="fill-primary text-primary" />
        </div>

        <div className="mb-1 flex items-center gap-2">
          <h2 className="m-0 text-[21px] font-bold text-ink">{exercise.name}</h2>
          {exercise.equipment && (
            <span className="rounded-full bg-chalk px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate">
              {exercise.equipment}
            </span>
          )}
        </div>
        <p className="tabular m-0 mb-2 text-[13px] text-slate">
          Target: {exercise.sets} sets × {exercise.reps} reps
          {exercise.weightUnit === "band"
            ? exercise.bandIntensity
              ? ` @ ${exercise.bandIntensity} band`
              : ""
            : exercise.weight
              ? ` @ ${exercise.weight}${exercise.weightUnit}`
              : ""}
        </p>
        {exercise.notes && <p className="m-0 mb-4.5 text-[12px] leading-relaxed text-slate">{exercise.notes}</p>}

        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate">Log your sets</p>
        <div className="flex flex-col gap-0">
          {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNumber) => {
            const logged = logs[`${exercise.id}:${setNumber}`];
            return (
              <SetRow
                key={setNumber}
                setNumber={setNumber}
                targetReps={exercise.reps}
                targetWeight={exercise.weight}
                weightUnit={exercise.weightUnit}
                targetBandIntensity={exercise.bandIntensity}
                done={!!logged}
                loggedReps={logged?.reps}
                loggedWeight={logged?.weight}
                loggedBandIntensity={logged?.bandIntensity}
                onConfirm={(reps, weight, bandIntensity) => handleLogSet(setNumber, reps, weight, bandIntensity)}
              />
            );
          })}
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={handleNext}
          className="w-full rounded-[10px] bg-ink py-3.5 text-sm font-bold uppercase tracking-wide text-chalk"
        >
          {exIndex < exercises.length - 1 ? "Next exercise" : "Finish workout"}
        </button>
      </div>
    </div>
  );
}
