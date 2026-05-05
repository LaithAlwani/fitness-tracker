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

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
  description: z.string().max(200).optional(),
});

type CreatePlanForm = z.infer<typeof formSchema>;

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (planId: string) => void;
};

export function CreatePlanSheet({ visible, onClose, onCreated }: Props) {
  const createPlan = useMutation(api.plans.createPlan);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePlanForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const handleCreate = async (values: CreatePlanForm) => {
    const planId = await createPlan({
      name: values.name,
      description: values.description?.trim() || undefined,
    });
    reset();
    onCreated(planId as unknown as string);
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
                Create plan
              </Text>
              <Text className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                Give it a name. You&apos;ll add days and exercises next.
              </Text>

              <Controller
                control={control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <AuthInput
                    label="Plan name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. PPL, 5/3/1, Upper/Lower"
                    autoCapitalize="words"
                    errorMessage={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange, onBlur } }) => (
                  <AuthInput
                    label="Description (optional)"
                    value={value ?? ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Notes about this plan"
                    autoCapitalize="sentences"
                    multiline
                    errorMessage={errors.description?.message}
                  />
                )}
              />

              <View className="mb-4 mt-2 gap-3">
                <AuthButton
                  label="Create plan"
                  loading={isSubmitting}
                  onPress={handleSubmit(handleCreate)}
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
