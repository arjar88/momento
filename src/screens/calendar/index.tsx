import { MenuView } from '@expo/ui/community/menu';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Mascot, MascotBanner } from '@/components/mascot';
import { DataGate } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbums, fetchMemoryDates } from '@/lib/api';
import { useSelectedAlbum } from '@/lib/selected-album';
import { useSession } from '@/lib/session';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';
import {
  formatMonthYear,
  initialMonth,
  isAtOrAfterTime,
  monthGrid,
  monthIntersectsAlbum,
  parseTime,
  shiftMonth,
  startOfWeek,
  endOfWeek,
  todayKey,
  toDateKey,
  WEEKDAY_LETTERS,
} from '@/utils/dates';

const SHORT_WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export function CalendarScreen() {
  const brand = useBrandColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useSession();
  const { albumId, setAlbumId } = useSelectedAlbum();
  const albumsQuery = useQuery({ queryKey: ['albums'], queryFn: fetchAlbums });
  const albums = albumsQuery.data;
  const selected = albums?.find((album) => album.id === albumId) ?? albums?.[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== albumId) setAlbumId(selected.id);
  }, [albumId, selected, setAlbumId]);

  const datesQuery = useQuery({
    queryKey: ['memory-dates', selected?.id],
    queryFn: () => fetchMemoryDates(selected!.id),
    enabled: !!selected,
  });

  const [visible, setVisible] = useState<{ year: number; monthIndex: number } | null>(null);
  useEffect(() => {
    if (!selected) return;
    setVisible((current) => {
      if (
        current &&
        monthIntersectsAlbum(current.year, current.monthIndex, selected.start_date, selected.end_date)
      ) {
        return current;
      }
      return initialMonth(selected.start_date, selected.end_date);
    });
  }, [selected]);

  const today = todayKey();
  const marked = useMemo(() => new Set((datesQuery.data ?? []).map((memory) => memory.taken_on)), [datesQuery.data]);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const weekCount = (datesQuery.data ?? []).filter((memory) => {
    return memory.taken_on >= weekStart && memory.taken_on <= weekEnd;
  }).length;

  const weekDates = useMemo(() => {
    const [y, m, d] = weekStart.split('-').map(Number);
    return Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(y, m - 1, d + idx);
      return {
        key: toDateKey(date),
        label: SHORT_WEEKDAYS[date.getDay()],
        dayNum: date.getDate(),
      };
    });
  }, [weekStart]);

  const go = (delta: number) => {
    if (!selected || !visible) return;
    const next = shiftMonth(visible.year, visible.monthIndex, delta);
    if (!monthIntersectsAlbum(next.year, visible.monthIndex, selected.start_date, selected.end_date) && !monthIntersectsAlbum(next.year, next.monthIndex, selected.start_date, selected.end_date)) return;
    if (!monthIntersectsAlbum(next.year, next.monthIndex, selected.start_date, selected.end_date)) return;
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    setVisible(next);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      if (event.translationX > 48) runOnJS(go)(-1);
      else if (event.translationX < -48) runOnJS(go)(1);
    });

  const goal = profile?.weekly_goal ?? null;
  const percent = goal ? Math.min(100, Math.round((weekCount / goal) * 100)) : null;
  const { hour, minute } = parseTime(profile?.reminder_time ?? '09:00:00');
  const showNudge = Boolean(
    profile?.reminder_enabled &&
      goal &&
      profile.reminder_weekdays.includes(new Date().getDay()) &&
      isAtOrAfterTime(hour, minute) &&
      datesQuery.data &&
      weekCount < goal,
  );

  return (
    <DataGate
      query={albumsQuery}
      isEmpty={(rows) => rows.length === 0}
      empty={
        <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, justifyContent: 'center' }}>
          <View
            style={{
              backgroundColor: brand.card,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              borderWidth: 1.5,
              borderColor: brand.line,
              padding: spacing.lg,
              gap: spacing.md,
              alignItems: 'center',
              boxShadow: bubblyShadow.card,
            }}
          >
            <Mascot size={60} mood="happy" />
            <ThemedText variant="title">No album yet</ThemedText>
            <ThemedText variant="body" style={{ textAlign: 'center', color: brand.muted }}>
              The calendar opens on an album. Create one to start keeping days.
            </ThemedText>
            <Link href="/albums/form" asChild>
              <Button title="New album" style={{ alignSelf: 'stretch' }} />
            </Link>
          </View>
        </View>
      }
    >
      {() =>
        selected && visible ? (
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1, backgroundColor: brand.paper }}
            contentContainerStyle={{
              paddingTop: insets.top + spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.xxl + spacing.md,
              gap: spacing.md + 4,
            }}
          >
            {/* Top Ahead-inspired header: Album selector pill + Flame streak pill */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <MenuView
                title="Albums"
                actions={(albums ?? []).map((album) => ({
                  id: album.id,
                  title: album.name,
                  state: album.id === selected.id ? 'on' : 'off',
                }))}
                onPressAction={({ nativeEvent }) => setAlbumId(nativeEvent.event)}
              >
                <View
                  style={{
                    backgroundColor: brand.card,
                    paddingVertical: spacing.xs + 4,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    borderCurve: 'continuous',
                    borderWidth: 1.5,
                    borderColor: brand.line,
                    gap: 4,
                    boxShadow: bubblyShadow.pill,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <ThemedText variant="headline">{selected.name}</ThemedText>
                    <Icon ios="chevron.down" android="expand_more" size={15} color={brand.muted} />
                  </View>
                  {percent !== null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <View
                        style={{
                          width: 72,
                          height: 5,
                          borderRadius: radius.full,
                          backgroundColor: brand.line,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            borderRadius: radius.full,
                            backgroundColor: brand.terracotta,
                          }}
                        />
                      </View>
                      <ThemedText variant="caption" style={{ color: brand.terracotta, fontVariant: ['tabular-nums'] }}>
                        {percent}%
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </MenuView>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: brand.card,
                    paddingVertical: spacing.xs + 4,
                    paddingHorizontal: spacing.sm + 4,
                    borderRadius: radius.full,
                    borderWidth: 1.5,
                    borderColor: brand.line,
                    boxShadow: bubblyShadow.pill,
                  }}
                >
                  <Icon ios="flame.fill" android="local_fire_department" color={brand.terracotta} size={18} />
                  <ThemedText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                    {weekCount}
                  </ThemedText>
                </View>
                <Link href="/you" asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="You"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.full,
                      backgroundColor: brand.card,
                      borderWidth: 1.5,
                      borderColor: brand.line,
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: bubblyShadow.pill,
                    }}
                  >
                    <Icon ios="person.fill" android="person" color={brand.ink} size={18} />
                  </Pressable>
                </Link>
              </View>
            </View>

            {/* Headspace-inspired Greeting + Month Header */}
            <View style={{ gap: 2 }}>
              <ThemedText variant="subhead">
                Hi {profile?.display_name?.trim() || 'there'} — moments worth keeping
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText variant="month" style={{ color: brand.ink, flex: 1 }}>
                  {formatMonthYear(visible.year, visible.monthIndex)}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <MonthArrow
                    label="Previous month"
                    icon="chevron.left"
                    android="chevron_left"
                    onPress={() => go(-1)}
                    disabled={
                      !monthIntersectsAlbum(
                        shiftMonth(visible.year, visible.monthIndex, -1).year,
                        shiftMonth(visible.year, visible.monthIndex, -1).monthIndex,
                        selected.start_date,
                        selected.end_date,
                      )
                    }
                  />
                  <MonthArrow
                    label="Next month"
                    icon="chevron.right"
                    android="chevron_right"
                    onPress={() => go(1)}
                    disabled={
                      !monthIntersectsAlbum(
                        shiftMonth(visible.year, visible.monthIndex, 1).year,
                        shiftMonth(visible.year, visible.monthIndex, 1).monthIndex,
                        selected.start_date,
                        selected.end_date,
                      )
                    }
                  />
                </View>
              </View>
            </View>

            {/* Ahead-inspired Horizontal Week Strip */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                backgroundColor: brand.card,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                borderWidth: 1.5,
                borderColor: brand.line,
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.sm,
                boxShadow: bubblyShadow.pill,
              }}
            >
              {weekDates.map((item) => {
                const isToday = item.key === today;
                const hasMemory = marked.has(item.key);
                return (
                  <View
                    key={item.key}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 6,
                      borderRadius: radius.md,
                      borderCurve: 'continuous',
                      backgroundColor: isToday ? brand.terracotta : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 1.5,
                        borderColor: isToday ? '#fffdfb' : hasMemory ? brand.terracotta : brand.quiet,
                        backgroundColor: hasMemory ? (isToday ? '#fffdfb' : brand.terracotta) : 'transparent',
                      }}
                    />
                    <ThemedText
                      variant="caption"
                      style={{
                        fontSize: 11,
                        color: isToday ? '#fffdfb' : brand.muted,
                      }}
                    >
                      {item.label}
                    </ThemedText>
                  </View>
                );
              })}
            </View>

            {datesQuery.data === undefined ? (
              datesQuery.error ? (
                <ThemedText selectable variant="subhead">
                  {datesQuery.error.message}
                </ThemedText>
              ) : (
                <ThemedText variant="subhead">Gathering this album…</ThemedText>
              )
            ) : (
              <WeekCard count={weekCount} goal={goal} />
            )}

            {showNudge ? (
              <Link href="/add" asChild>
                <Pressable accessibilityRole="button">
                  <MascotBanner
                    title="This week still has room"
                    subtitle="Add a memory when it feels right."
                    mood="happy"
                  />
                </Pressable>
              </Link>
            ) : null}

            {/* Bubbly Puffy Calendar Card */}
            <GestureDetector gesture={pan}>
              <View
                style={{
                  backgroundColor: brand.card,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  borderWidth: 1.5,
                  borderColor: brand.line,
                  padding: spacing.md,
                  gap: spacing.sm,
                  boxShadow: bubblyShadow.card,
                }}
              >
                <View style={{ flexDirection: 'row' }}>
                  {WEEKDAY_LETTERS.map((letter) => (
                    <ThemedText
                      key={letter}
                      variant="caption"
                      style={{
                        width: (width - spacing.lg * 2 - spacing.md * 2 - 3) / 7,
                        textAlign: 'center',
                        letterSpacing: 0.6,
                      }}
                    >
                      {letter}
                    </ThemedText>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {monthGrid(visible.year, visible.monthIndex).map((date, index) => {
                    const cellWidth = (width - spacing.lg * 2 - spacing.md * 2 - 3) / 7;
                    if (!date) return <View key={`blank-${index}`} style={{ width: cellWidth, height: 48 }} />;
                    const key = toDateKey(date);
                    const inRange = key >= selected.start_date && key <= selected.end_date;
                    const tappable = inRange && key <= today;
                    const isToday = key === today;
                    const hasMemory = marked.has(key);
                    const cell = (
                      <View key={key} style={{ width: cellWidth, height: 50, alignItems: 'center', justifyContent: 'center' }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 14,
                            borderCurve: 'continuous',
                            backgroundColor: isToday ? brand.terracotta : hasMemory ? brand.paper : 'transparent',
                            borderWidth: hasMemory && !isToday ? 1.5 : 0,
                            borderColor: brand.line,
                          }}
                        >
                          <ThemedText
                            variant="headline"
                            style={{
                              color: isToday ? '#fffdfb' : tappable ? brand.ink : brand.quiet,
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {date.getDate()}
                          </ThemedText>
                        </View>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            marginTop: 3,
                            backgroundColor: hasMemory ? brand.terracotta : 'transparent',
                          }}
                        />
                      </View>
                    );
                    if (!tappable) return cell;
                    return (
                      <Link key={key} href={`/calendar/${key}`} asChild>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={isToday ? `${key}, today` : key}
                          style={{ width: cellWidth, height: 50, alignItems: 'center', justifyContent: 'center' }}
                        >
                          {cell}
                        </Pressable>
                      </Link>
                    );
                  })}
                </View>
              </View>
            </GestureDetector>

            <ThemedText variant="caption" style={{ textAlign: 'center' }}>
              Swipe or use the arrows to move between months. Tap any day up to today to add a memory.
            </ThemedText>
          </ScrollView>
        ) : null
      }
    </DataGate>
  );
}

function WeekCard({ count, goal }: { count: number; goal: number | null }) {
  const brand = useBrandColors();
  const percent = goal ? Math.round((count / goal) * 100) : null;
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: brand.line,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        padding: spacing.md + 2,
        gap: spacing.sm,
        backgroundColor: brand.card,
        boxShadow: bubblyShadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
        <Mascot size={44} mood={count > 0 ? 'happy' : 'calm'} />
        <View style={{ gap: 2, flex: 1 }}>
          <ThemedText variant="smallCaps">This week in memories</ThemedText>
          <ThemedText variant="title" style={{ fontVariant: ['tabular-nums'] }}>
            {goal ? `${count} of ${goal} memories` : count === 1 ? '1 memory' : `${count} memories`}
          </ThemedText>
        </View>
        {percent !== null ? (
          <View
            style={{
              backgroundColor: brand.paper,
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: spacing.xs,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: brand.line,
            }}
          >
            <ThemedText variant="headline" style={{ color: brand.terracotta, fontVariant: ['tabular-nums'] }}>
              {percent}%
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={{ height: 1, backgroundColor: brand.line }} />
      <ThemedText variant="subhead">
        {count === 0
          ? 'Just a few moments is plenty. Add one whenever it feels right.'
          : 'These are the moments you’ve kept this week.'}
      </ThemedText>
    </View>
  );
}

function MonthArrow({
  label,
  icon,
  android,
  onPress,
  disabled,
}: {
  label: string;
  icon: 'chevron.left' | 'chevron.right';
  android: 'chevron_left' | 'chevron_right';
  onPress: () => void;
  disabled: boolean;
}) {
  const brand = useBrandColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: brand.card,
        borderWidth: 1.5,
        borderColor: brand.line,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: bubblyShadow.pill,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Icon ios={icon} android={android} size={16} color={brand.ink} />
    </Pressable>
  );
}
