import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

import { CreatePlanSheet } from "@/components/plans/CreatePlanSheet";
import { PlanRow } from "@/components/plans/PlanRow";

type PlanWithDayCount = {
  _id: string;
  name: string;
  description?: string;
};

export default function PlansListScreen() {
  const router = useRouter();
  const plans = useQuery(api.plans.listMyPlans);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const isLoading = plans === undefined;

  const handleCreated = (planId: string) => {
    setIsCreateOpen(false);
    router.push({ pathname: "/(app)/plans/[planId]", params: { planId } });
  };

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
          Plans
        </Text>
        <View className="w-9" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : plans.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="clipboard-outline" size={48} color="#9ca3af" />
          <Text className="mt-4 text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
            No plans yet
          </Text>
          <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Tap + to create your first workout plan.
          </Text>
        </View>
      ) : (
        <FlatList
          data={plans as Array<PlanWithDayCount & { _id: string }>}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 96,
          }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <PlanRowWithCount
              planId={item._id}
              name={item.name}
              description={item.description}
              onPress={() =>
                router.push({
                  pathname: "/(app)/plans/[planId]",
                  params: { planId: item._id },
                })
              }
            />
          )}
        />
      )}

      <Pressable
        onPress={() => setIsCreateOpen(true)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg active:bg-brand-600"
        style={{ elevation: 6 }}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>

      <CreatePlanSheet
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </SafeAreaView>
  );
}

function PlanRowWithCount({
  planId,
  name,
  description,
  onPress,
}: {
  planId: string;
  name: string;
  description?: string;
  onPress: () => void;
}) {
  const detail = useQuery(api.plans.getPlan, {
    planId: planId as never,
  });
  const dayCount = detail?.days?.length ?? 0;

  return (
    <PlanRow
      name={name}
      description={description}
      dayCount={dayCount}
      onPress={onPress}
    />
  );
}
