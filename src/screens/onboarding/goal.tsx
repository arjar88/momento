import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import type { WeeklyGoal } from '@/lib/database';
import { useOnboardingDraft } from '@/lib/onboarding-draft';
import { radius, spacing, useBrandColors } from '@/theme';

const choices: { value: WeeklyGoal; label: string }[] = [
  { value: 1, label: '1 memory a week' },
  { value: 2, label: '2 memories a week' },
  { value: 3, label: '3 memories a week' },
  { value: null, label: 'I’ll decide myself' },
];

export function GoalScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const { weeklyGoal, goalChosen, setWeeklyGoal } = useOnboardingDraft();

  return (
    <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, gap: spacing.md }}>
      <ThemedText variant="body">
        The week card uses this number. Choosing to decide yourself leaves the quota off, with no unmet-goal nudge.
      </ThemedText>
      {choices.map((choice) => {
        const selected = goalChosen && choice.value === weeklyGoal;
        return (
          <Pressable
            key={choice.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setWeeklyGoal(choice.value)}
            style={{
              padding: spacing.md,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: selected ? brand.terracotta : brand.line,
              backgroundColor: brand.card,
            }}
          >
            <ThemedText variant="headline">{choice.label}</ThemedText>
          </Pressable>
        );
      })}
      <Button title="Continue" disabled={!goalChosen} onPress={() => router.push('/album')} />
    </View>
  );
}
