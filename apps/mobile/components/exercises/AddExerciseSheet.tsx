import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { api } from "@fitness/convex";
import {
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  formatMuscleGroup,
} from "@fitness/shared";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { FilterChip } from "@/components/exercises/FilterChip";

const NONE = "__none__";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  category: z.enum(["strength", "cardio"]),
  muscleGroup: z.string(),
  equipment: z.string(),
});

type AddExerciseForm = z.infer<typeof formSchema>;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AddExerciseSheet({ visible, onClose }: Props) {
  const createExercise = useMutation(api.exercises.create);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddExerciseForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "strength",
      muscleGroup: NONE,
      equipment: NONE,
    },
  });

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const selectedCategory = watch("category");
  const selectedMuscleGroup = watch("muscleGroup");
  const selectedEquipment = watch("equipment");

  const handleSave = async (values: AddExerciseForm) => {
    await createExercise({
      name: values.name,
      category: values.category,
      muscleGroup:
        values.muscleGroup === NONE ? undefined : values.muscleGroup,
      equipment: values.equipment === NONE ? undefined : values.equipment,
    });
    reset();
    onClose();
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

            <ScrollView
              className="px-6 py-4"
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                Add custom exercise
              </Text>
              <Text className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                Stays on your account, separate from the seeded library.
              </Text>

              <Controller
                control={control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <AuthInput
                    label="Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Pause Bench Press"
                    autoCapitalize="words"
                    errorMessage={errors.name?.message}
                  />
                )}
              />

              <Text className="mb-1.5 mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Category
              </Text>
              <View className="flex-row mb-4">
                {EXERCISE_CATEGORIES.map((category) => (
                  <FilterChip
                    key={category}
                    label={category === "strength" ? "Strength" : "Cardio"}
                    selected={selectedCategory === category}
                    onPress={() => setValue("category", category)}
                  />
                ))}
              </View>

              <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Muscle group
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                <FilterChip
                  label="None"
                  selected={selectedMuscleGroup === NONE}
                  onPress={() => setValue("muscleGroup", NONE)}
                />
                {MUSCLE_GROUPS.map((group) => (
                  <FilterChip
                    key={group}
                    label={formatMuscleGroup(group)}
                    selected={selectedMuscleGroup === group}
                    onPress={() => setValue("muscleGroup", group)}
                  />
                ))}
              </ScrollView>

              <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Equipment
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6"
              >
                <FilterChip
                  label="None"
                  selected={selectedEquipment === NONE}
                  onPress={() => setValue("equipment", NONE)}
                />
                {EQUIPMENT_TYPES.map((equipmentType) => (
                  <FilterChip
                    key={equipmentType}
                    label={
                      equipmentType.charAt(0).toUpperCase() +
                      equipmentType.slice(1)
                    }
                    selected={selectedEquipment === equipmentType}
                    onPress={() => setValue("equipment", equipmentType)}
                  />
                ))}
              </ScrollView>

              <View className="mb-4 gap-3">
                <AuthButton
                  label="Save exercise"
                  loading={isSubmitting}
                  onPress={handleSubmit(handleSave)}
                />
                <AuthButton
                  label="Cancel"
                  variant="secondary"
                  onPress={onClose}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
