import { zodResolver } from "@hookform/resolvers/zod";
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

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

const formSchema = z.object({
  name: z.string().min(1, "Day name is required").max(40),
});

type AddDayForm = z.infer<typeof formSchema>;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export function AddDaySheet({ visible, onClose, onSubmit }: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddDayForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const handleSave = async (values: AddDayForm) => {
    await onSubmit(values.name);
    reset();
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
                Add a day
              </Text>
              <Text className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                Like &quot;Push&quot;, &quot;Pull&quot;, &quot;Legs&quot;, or &quot;Day 1&quot;.
              </Text>

              <Controller
                control={control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <AuthInput
                    label="Day name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Push"
                    autoCapitalize="words"
                    autoFocus
                    errorMessage={errors.name?.message}
                  />
                )}
              />

              <View className="mb-4 mt-2 gap-3">
                <AuthButton
                  label="Add day"
                  loading={isSubmitting}
                  onPress={handleSubmit(handleSave)}
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
