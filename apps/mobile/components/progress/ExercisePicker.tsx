import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

import { formatMuscleGroup } from "@fitness/shared";

type ExerciseOption = {
  _id: string;
  name: string;
  category: "strength" | "cardio";
  muscleGroup?: string;
};

type Props = {
  exercises: ExerciseOption[];
  selectedId: string | null;
  onSelect: (exerciseId: string) => void;
};

const triggerStyles =
  "flex-row items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-800";
const listRowStyles =
  "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-800";

export function ExercisePicker({ exercises, selectedId, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = exercises.find((e) => e._id === selectedId) ?? null;

  return (
    <>
      <Pressable className={triggerStyles} onPress={() => setIsOpen(true)}>
        <View className="flex-1">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Exercise
          </Text>
          <Text
            className="mt-0.5 text-base font-semibold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {selected ? selected.name : "Pick an exercise"}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#9ca3af" />
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setIsOpen(false)} />
          <View
            className="rounded-t-3xl bg-white dark:bg-neutral-950"
            style={{ maxHeight: "75%" }}
          >
            <View className="items-center pt-3">
              <View className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </View>
            <View className="px-6 pt-3 pb-2">
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                Pick exercise
              </Text>
              <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Only exercises with logged sets show up here.
              </Text>
            </View>

            <FlatList
              data={exercises}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 32,
              }}
              ItemSeparatorComponent={() => <View className="h-2" />}
              renderItem={({ item }) => (
                <Pressable
                  className={listRowStyles}
                  onPress={() => {
                    onSelect(item._id);
                    setIsOpen(false);
                  }}
                >
                  <View className="flex-row items-center">
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
                    {item._id === selectedId ? (
                      <Ionicons name="checkmark" size={20} color="#0ea5e9" />
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
