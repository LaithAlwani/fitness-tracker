import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@fitness/convex";
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  formatMuscleGroup,
  type ExerciseCategory,
} from "@fitness/shared";

import { FilterChip } from "@/components/exercises/FilterChip";

const searchInputStyles =
  "rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-50";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (exerciseId: string, category: ExerciseCategory) => void;
};

export function ExercisePickerSheet({ visible, onClose, onPick }: Props) {
  const exercises = useQuery(api.exercises.list, {});
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(
    null,
  );
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    const lowerQuery = searchQuery.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (categoryFilter && exercise.category !== categoryFilter) return false;
      if (muscleFilter && exercise.muscleGroup !== muscleFilter) return false;
      if (lowerQuery && !exercise.name.toLowerCase().includes(lowerQuery)) {
        return false;
      }
      return true;
    });
  }, [exercises, searchQuery, categoryFilter, muscleFilter]);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-neutral-950 pt-12">
        <View className="flex-row items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8} className="p-1 active:opacity-60">
            <Ionicons name="close" size={26} color="#0ea5e9" />
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Pick exercise
          </Text>
          <View className="w-9" />
        </View>

        <View className="px-4 pt-4 pb-2">
          <TextInput
            className={searchInputStyles}
            placeholder="Search exercises..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <View className="mb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            <FilterChip
              label="All"
              selected={categoryFilter === null}
              onPress={() => setCategoryFilter(null)}
            />
            {EXERCISE_CATEGORIES.map((category) => (
              <FilterChip
                key={category}
                label={category === "strength" ? "Strength" : "Cardio"}
                selected={categoryFilter === category}
                onPress={() => setCategoryFilter(category)}
              />
            ))}
          </ScrollView>
        </View>

        <View className="mb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            <FilterChip
              label="All muscles"
              selected={muscleFilter === null}
              onPress={() => setMuscleFilter(null)}
            />
            {MUSCLE_GROUPS.map((group) => (
              <FilterChip
                key={group}
                label={formatMuscleGroup(group)}
                selected={muscleFilter === group}
                onPress={() => setMuscleFilter(group)}
              />
            ))}
          </ScrollView>
        </View>

        {exercises === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        ) : filteredExercises.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-base font-medium text-neutral-700 dark:text-neutral-300">
              No exercises match.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <Pressable
                className="flex-row items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-800"
                onPress={() => onPick(item._id, item.category)}
              >
                <View className="flex-1">
                  <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    {item.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {item.category === "cardio" ? "Cardio" : "Strength"}
                    {item.muscleGroup
                      ? ` · ${formatMuscleGroup(item.muscleGroup)}`
                      : ""}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color="#0ea5e9" />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
