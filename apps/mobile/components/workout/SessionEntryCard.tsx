import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { formatMuscleGroup, formatWeight, type WeightUnit } from "@fitness/shared";

import { useUnits } from "@/lib/useUnits";
import { CardioEntry } from "@/components/workout/CardioEntry";
import { SetInputRow } from "@/components/workout/SetInputRow";
import { SetRow } from "@/components/workout/SetRow";

type SetData = {
  _id: string;
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
};

type CardioData = {
  _id: string;
  durationSec: number;
  distanceM?: number;
};

type Props = {
  exerciseName: string;
  category: "strength" | "cardio";
  muscleGroup?: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetWeight?: number;
  targetDurationSec?: number;
  targetDistanceM?: number;
  sets: SetData[];
  cardioLogs: CardioData[];
  onLogSet: (reps: number, weight: number) => Promise<void>;
  onRemoveSet: (setId: string) => Promise<void>;
  onLogCardio: (durationSec: number, distanceM?: number) => Promise<void>;
  onUpdateCardio: (
    cardioLogId: string,
    durationSec: number,
    distanceM?: number,
  ) => Promise<void>;
  onRemoveCardio: (cardioLogId: string) => Promise<void>;
  onRemoveEntry: () => void;
};

const cardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";

function formatTargetLine(props: Props, units: WeightUnit): string {
  if (props.category === "strength") {
    const parts: string[] = [];
    if (props.targetSets !== undefined) parts.push(`${props.targetSets} sets`);
    if (
      props.targetRepsMin !== undefined &&
      props.targetRepsMax !== undefined
    ) {
      parts.push(
        props.targetRepsMin === props.targetRepsMax
          ? `${props.targetRepsMin} reps`
          : `${props.targetRepsMin}-${props.targetRepsMax} reps`,
      );
    }
    if (props.targetWeight !== undefined) {
      parts.push(formatWeight(props.targetWeight, units));
    }
    return parts.length > 0 ? `Target: ${parts.join(" · ")}` : "";
  }

  const parts: string[] = [];
  if (props.targetDurationSec !== undefined) {
    parts.push(`${Math.round(props.targetDurationSec / 60)} min`);
  }
  if (props.targetDistanceM !== undefined) {
    parts.push(
      `${(props.targetDistanceM / 1000).toFixed(1).replace(/\.0$/, "")} km`,
    );
  }
  return parts.length > 0 ? `Target: ${parts.join(" · ")}` : "";
}

export function SessionEntryCard(props: Props) {
  const units = useUnits();
  const targetLine = formatTargetLine(props, units);
  const lastCompletedSet = [...props.sets]
    .reverse()
    .find((set) => set.completed);
  const defaultReps = lastCompletedSet?.reps ?? props.targetRepsMin;
  const defaultWeight = lastCompletedSet?.weight ?? props.targetWeight;

  return (
    <View className={cardStyles}>
      <View className="mb-2 flex-row items-start">
        <View className="flex-1">
          <Text
            className="text-lg font-bold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {props.exerciseName}
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {props.category === "cardio" ? "Cardio" : "Strength"}
            {props.muscleGroup
              ? ` · ${formatMuscleGroup(props.muscleGroup)}`
              : ""}
          </Text>
        </View>
        <Pressable
          onPress={props.onRemoveEntry}
          hitSlop={6}
          className="p-1 active:opacity-60"
        >
          <Ionicons name="close" size={18} color="#9ca3af" />
        </Pressable>
      </View>

      {targetLine ? (
        <Text className="mb-3 text-xs italic text-neutral-500 dark:text-neutral-400">
          {targetLine}
        </Text>
      ) : null}

      {props.category === "strength" ? (
        <>
          {props.sets.length > 0 ? (
            <View className="mb-3 gap-1.5">
              {props.sets.map((set) => (
                <SetRow
                  key={set._id}
                  setNumber={set.setNumber}
                  reps={set.reps}
                  weight={set.weight}
                  completed={set.completed}
                  onRemove={() => props.onRemoveSet(set._id)}
                />
              ))}
            </View>
          ) : null}

          <SetInputRow
            defaultReps={defaultReps}
            defaultWeightKg={defaultWeight}
            onLog={props.onLogSet}
          />
        </>
      ) : (
        <CardioEntry
          cardioLogId={props.cardioLogs[0]?._id ?? null}
          durationSec={props.cardioLogs[0]?.durationSec}
          distanceM={props.cardioLogs[0]?.distanceM}
          onLog={props.onLogCardio}
          onUpdate={async (durationSec, distanceM) => {
            const log = props.cardioLogs[0];
            if (log) await props.onUpdateCardio(log._id, durationSec, distanceM);
          }}
          onRemove={async () => {
            const log = props.cardioLogs[0];
            if (log) await props.onRemoveCardio(log._id);
          }}
        />
      )}
    </View>
  );
}
