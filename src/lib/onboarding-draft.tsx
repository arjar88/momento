import { createContext, use, useMemo, useState, type ReactNode } from 'react';

import type { WeeklyGoal } from './database';

type OnboardingValue = {
  displayName: string;
  weeklyGoal: WeeklyGoal;
  goalChosen: boolean;
  setDisplayName: (name: string) => void;
  setWeeklyGoal: (goal: WeeklyGoal) => void;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayName] = useState('');
  const [weeklyGoal, setGoal] = useState<WeeklyGoal>(null);
  const [goalChosen, setGoalChosen] = useState(false);

  const value = useMemo<OnboardingValue>(
    () => ({
      displayName,
      weeklyGoal,
      goalChosen,
      setDisplayName,
      setWeeklyGoal: (goal) => {
        setGoal(goal);
        setGoalChosen(true);
      },
    }),
    [displayName, goalChosen, weeklyGoal],
  );

  return <OnboardingContext value={value}>{children}</OnboardingContext>;
}

export function useOnboardingDraft() {
  const value = use(OnboardingContext);
  if (!value) throw new Error('useOnboardingDraft must be used inside OnboardingDraftProvider');
  return value;
}
