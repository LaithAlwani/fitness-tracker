import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  formatMuscleGroup,
  type ExerciseCategory,
} from "@fitness/shared";

import { ExerciseRow } from "@/components/exercises/ExerciseRow";
import { FilterChip } from "@/components/exercises/FilterChip";
import { AddExerciseSheet } from "@/components/exercises/AddExerciseSheet";

const searchInputStyles =
  "rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-50";

export default function ExercisesScreen() {
  const router = useRouter();
  const exercises = useQuery(api.exercises.list, {});
  const me = useQuery(api.users.me);
  const deleteExercise = useMutation(api.exercises.deleteExercise);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(
    null,
  );
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

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

  const handleDelete = (exerciseId: string, exerciseName: string) => {
    Alert.alert(
      "Delete exercise?",
      `"${exerciseName}" will be removed from your library. If you've already used it in a workout, it will be hidden from the library but kept in your history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteExercise({ exerciseId: exerciseId as never });
          },
        },
      ],
    );
  };

  const isLoading = exercises === undefined;

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      edges={["top"]}
    >
      <View className="flex-row items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="p-1 active:opacity-60"
        >
          <Ionicons name="chevron-back" size={26} color="#0ea5e9" />
        </Pressable>
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Exercises
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : filteredExercises.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="barbell-outline" size={48} color="#9ca3af" />
          <Text className="mt-4 text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
            No exercises match your filters.
          </Text>
          <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Try clearing filters or add a custom exercise with the + button.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <ExerciseRow
              name={item.name}
              category={item.category}
              muscleGroup={item.muscleGroup}
              equipment={item.equipment}
              isCustom={item.userId === me?._id}
              onDelete={
                item.userId === me?._id
                  ? () => handleDelete(item._id, item.name)
                  : undefined
              }
            />
          )}
        />
      )}

      <Pressable
        onPress={() => setIsAddSheetOpen(true)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg active:bg-brand-600"
        style={{ elevation: 6 }}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>

      <AddExerciseSheet
        visible={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
      />
    </SafeAreaView>
  );
}
