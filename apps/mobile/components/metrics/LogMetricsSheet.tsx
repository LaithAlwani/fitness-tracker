import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { api } from "@fitness/convex";
import {
  formatWeightValue,
  parseWeightInputToKg,
  type WeightUnit,
} from "@fitness/shared";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

type ExistingMetric = {
  _id: string;
  bodyweight?: number;
  bodyFatPct?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
    arm?: number;
  };
};

type Props = {
  visible: boolean;
  onClose: () => void;
  units: WeightUnit;
  existingMetric?: ExistingMetric | null;
};

const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export function LogMetricsSheet({ visible, onClose, units, existingMetric }: Props) {
  const logMetric = useMutation(api.metrics.log);
  const updateMetric = useMutation(api.metrics.update);

  const [bodyweight, setBodyweight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [thigh, setThigh] = useState("");
  const [arm, setArm] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (existingMetric) {
      setBodyweight(
        existingMetric.bodyweight !== undefined
          ? formatWeightValue(existingMetric.bodyweight, units)
          : "",
      );
      setBodyFat(existingMetric.bodyFatPct?.toString() ?? "");
      setChest(existingMetric.measurements?.chest?.toString() ?? "");
      setWaist(existingMetric.measurements?.waist?.toString() ?? "");
      setHips(existingMetric.measurements?.hips?.toString() ?? "");
      setThigh(existingMetric.measurements?.thigh?.toString() ?? "");
      setArm(existingMetric.measurements?.arm?.toString() ?? "");
    } else {
      setBodyweight("");
      setBodyFat("");
      setChest("");
      setWaist("");
      setHips("");
      setThigh("");
      setArm("");
    }
    setSubmissionError(null);
  }, [visible, existingMetric, units]);

  const handleSubmit = async () => {
    setSubmissionError(null);

    const bodyweightKg = parseWeightInputToKg(bodyweight, units);
    const bodyFatPct = parseOptionalNumber(bodyFat);
    const chestCm = parseOptionalNumber(chest);
    const waistCm = parseOptionalNumber(waist);
    const hipsCm = parseOptionalNumber(hips);
    const thighCm = parseOptionalNumber(thigh);
    const armCm = parseOptionalNumber(arm);

    const measurements =
      chestCm !== undefined ||
      waistCm !== undefined ||
      hipsCm !== undefined ||
      thighCm !== undefined ||
      armCm !== undefined
        ? {
            chest: chestCm,
            waist: waistCm,
            hips: hipsCm,
            thigh: thighCm,
            arm: armCm,
          }
        : undefined;

    const hasAny =
      bodyweightKg !== undefined ||
      bodyFatPct !== undefined ||
      measurements !== undefined;
    if (!hasAny) {
      setSubmissionError("Enter at least one value to log.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingMetric) {
        await updateMetric({
          metricId: existingMetric._id as never,
          bodyweight: bodyweightKg,
          bodyFatPct,
          measurements,
        });
      } else {
        await logMetric({
          bodyweight: bodyweightKg,
          bodyFatPct,
          measurements,
        });
      }
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save. Try again.";
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="rounded-t-3xl bg-white dark:bg-neutral-950">
            <View className="items-center pt-3">
              <View className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </View>

            <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                {existingMetric ? "Edit entry" : "Log body metrics"}
              </Text>
              <Text className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                Bodyweight is the most useful for tracking. Measurements are
                optional.
              </Text>

              <AuthInput
                label={`Bodyweight (${units})`}
                value={bodyweight}
                onChangeText={setBodyweight}
                placeholder={units === "kg" ? "75" : "165"}
                keyboardType="decimal-pad"
              />

              <AuthInput
                label="Body fat % (optional)"
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder="15"
                keyboardType="decimal-pad"
              />

              <Text className="mb-1.5 mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Measurements (cm, optional)
              </Text>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AuthInput
                    label="Chest"
                    value={chest}
                    onChangeText={setChest}
                    placeholder="100"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <AuthInput
                    label="Waist"
                    value={waist}
                    onChangeText={setWaist}
                    placeholder="80"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AuthInput
                    label="Hips"
                    value={hips}
                    onChangeText={setHips}
                    placeholder="95"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <AuthInput
                    label="Thigh"
                    value={thigh}
                    onChangeText={setThigh}
                    placeholder="55"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <AuthInput
                label="Arm"
                value={arm}
                onChangeText={setArm}
                placeholder="35"
                keyboardType="decimal-pad"
              />

              {submissionError ? (
                <View className="mb-3 rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
                  <Text className="text-sm text-red-600 dark:text-red-400">
                    {submissionError}
                  </Text>
                </View>
              ) : null}

              <View className="mb-4 mt-2 gap-3">
                <AuthButton
                  label={existingMetric ? "Save changes" : "Log entry"}
                  loading={isSubmitting}
                  onPress={handleSubmit}
                />
                <AuthButton label="Cancel" variant="secondary" onPress={onClose} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
