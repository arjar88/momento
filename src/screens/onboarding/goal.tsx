import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { MascotBanner } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import type { WeeklyGoal } from '@/lib/database';
import { useOnboardingDraft } from '@/lib/onboarding-draft';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';

const choices: { value: WeeklyGoal; label: string; badge: string }[] = [
  { value: 1, label: '1 memory a week', badge: '1' },
  { value: 2, label: '2 memories a week', badge: '2' },
  { value: 3, label: '3 memories a week', badge: '3' },
  { value: null, label: 'I’ll decide myself', badge: '∞' },
];

export function GoalScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const { weeklyGoal, goalChosen, setWeeklyGoal } = useOnboardingDraft();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: brand.paper }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <MascotBanner
        title="Pick your weekly pace"
        subtitle="The week card uses this number. Choosing to decide yourself leaves the quota off."
        mood="happy"
      />
      {choices.map((choice) => {
        const selected = goalChosen && choice.value === weeklyGoal;
        return (
          <Pressable
            key={choice.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setWeeklyGoal(choice.value)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              borderWidth: 2,
              borderColor: selected ? brand.terracotta : brand.line,
              backgroundColor: brand.card,
              boxShadow: bubblyShadow.card,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            {/* Ahead-inspired stepping stone numbered node */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: selected ? brand.terracotta : brand.paper,
                borderWidth: 3,
                borderColor: selected ? '#fffdfb' : brand.line,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: bubblyShadow.pill,
              }}
            >
              <ThemedText
                variant="title"
                style={{ color: selected ? '#fffdfb' : brand.muted, fontVariant: ['tabular-nums'] }}
              >
                {choice.badge}
              </ThemedText>
            </View>
            <ThemedText variant="headline" style={{ flex: 1, color: selected ? brand.terracotta : brand.ink }}>
              {choice.label}
            </ThemedText>
          </Pressable>
        );
      })}
      <Button title="Continue" disabled={!goalChosen} onPress={() => router.push('/album')} />
    </ScrollView>
  );
}
