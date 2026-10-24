import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from './themed-text';
import { formatLongDate, formatTime, toDateKey, parseDateKey } from '@/utils/dates';
import { radius, spacing, useBrandColors } from '@/theme';

export function DateField({
  label,
  value,
  minimum,
  maximum,
  onChange,
  mode = 'date',
}: {
  label: string;
  value: Date;
  minimum?: Date;
  maximum?: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
}) {
  const brand = useBrandColors();
  const [open, setOpen] = useState(false);
  const summary = mode === 'time' ? formatTime(value.getHours(), value.getMinutes()) : formatLongDate(toDateKey(value));

  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="smallCaps">{label}</ThemedText>
      {process.env.EXPO_OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          minimumDate={minimum}
          maximumDate={maximum}
          accentColor={brand.terracotta}
          onValueChange={(_event, next) => onChange(next)}
        />
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${summary}`}
            onPress={() => setOpen(true)}
            style={({ pressed }) => ({
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: brand.line,
              backgroundColor: brand.card,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ThemedText variant="body">{summary}</ThemedText>
          </Pressable>
          {open ? (
            <DateTimePicker
              value={value}
              mode={mode}
              presentation="dialog"
              minimumDate={minimum}
              maximumDate={maximum}
              accentColor={brand.terracotta}
              onValueChange={(_event, next) => {
                setOpen(false);
                onChange(next);
              }}
              onDismiss={() => setOpen(false)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

export function dateFromKey(key: string): Date {
  return parseDateKey(key);
}
