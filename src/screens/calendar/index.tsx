import { MenuView } from '@expo/ui/community/menu';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { DataGate } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbums, fetchMemoryDates } from '@/lib/api';
import { useSelectedAlbum } from '@/lib/selected-album';
import { useSession } from '@/lib/session';
import { radius, spacing, useBrandColors } from '@/theme';
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
  const weekCount = (datesQuery.data ?? []).filter((memory) => {
    const start = startOfWeek(today);
    const end = endOfWeek(today);
    return memory.taken_on >= start && memory.taken_on <= end;
  }).length;

  const go = (delta: number) => {
    if (!selected || !visible) return;
    const next = shiftMonth(visible.year, visible.monthIndex, delta);
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
        <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg }}>
          <ThemedText variant="headline">No album yet</ThemedText>
          <ThemedText variant="body">The calendar opens on an album. Create one to start keeping days.</ThemedText>
          <Link href="/albums/form" style={{ marginTop: spacing.md }}>
            <ThemedText variant="headline" style={{ color: brand.terracotta }}>
              New album
            </ThemedText>
          </Link>
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
              paddingBottom: spacing.xxl,
              gap: spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon ios="heart" android="favorite_border" color={brand.terracotta} size={26} />
              <View>
                <ThemedText variant="wordmark">Keepsakes</ThemedText>
                <ThemedText variant="tagline">moments worth keeping</ThemedText>
              </View>
            </View>

            <ThemedText variant="body">
              Hi {profile?.display_name?.trim() || 'there'} — here’s what you’ve been keeping.
            </ThemedText>

            <MenuView
              title="Albums"
              actions={(albums ?? []).map((album) => ({
                id: album.id,
                title: album.name,
                state: album.id === selected.id ? 'on' : 'off',
              }))}
              onPressAction={({ nativeEvent }) => setAlbumId(nativeEvent.event)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' }}>
                <ThemedText variant="smallCaps">{selected.name}</ThemedText>
                <Icon ios="chevron.down" android="expand_more" size={16} color={brand.muted} />
              </View>
            </MenuView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText variant="month" style={{ color: brand.ink, flex: 1 }}>
                {formatMonthYear(visible.year, visible.monthIndex)}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <MonthArrow label="Previous month" icon="chevron.left" android="chevron_left" onPress={() => go(-1)} disabled={!monthIntersectsAlbum(shiftMonth(visible.year, visible.monthIndex, -1).year, shiftMonth(visible.year, visible.monthIndex, -1).monthIndex, selected.start_date, selected.end_date)} />
                <MonthArrow label="Next month" icon="chevron.right" android="chevron_right" onPress={() => go(1)} disabled={!monthIntersectsAlbum(shiftMonth(visible.year, visible.monthIndex, 1).year, shiftMonth(visible.year, visible.monthIndex, 1).monthIndex, selected.start_date, selected.end_date)} />
              </View>
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
                <Pressable
                  accessibilityRole="button"
                  style={{
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderCurve: 'continuous',
                    backgroundColor: brand.card,
                    borderWidth: 1,
                    borderColor: brand.terracotta,
                    gap: spacing.xs,
                  }}
                >
                  <ThemedText variant="headline">This week still has room</ThemedText>
                  <ThemedText variant="subhead">Add a memory when it feels right.</ThemedText>
                </Pressable>
              </Link>
            ) : null}

            <GestureDetector gesture={pan}>
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row' }}>
                  {WEEKDAY_LETTERS.map((letter) => (
                    <ThemedText key={letter} variant="caption" style={{ width: (width - spacing.lg * 2) / 7, textAlign: 'center', letterSpacing: 0.6 }}>
                      {letter}
                    </ThemedText>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {monthGrid(visible.year, visible.monthIndex).map((date, index) => {
                    const cellWidth = (width - spacing.lg * 2) / 7;
                    if (!date) return <View key={`blank-${index}`} style={{ width: cellWidth, height: 48 }} />;
                    const key = toDateKey(date);
                    const inRange = key >= selected.start_date && key <= selected.end_date;
                    const tappable = inRange && key <= today;
                    const isToday = key === today;
                    const cell = (
                      <View key={key} style={{ width: cellWidth, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            borderCurve: 'continuous',
                            borderWidth: isToday ? 1.5 : 0,
                            borderColor: brand.ink,
                          }}
                        >
                          <ThemedText
                            variant="body"
                            style={{ color: tappable ? brand.ink : brand.quiet, fontVariant: ['tabular-nums'] }}
                          >
                            {date.getDate()}
                          </ThemedText>
                        </View>
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            marginTop: 2,
                            backgroundColor: marked.has(key) ? brand.terracotta : 'transparent',
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
                          style={{ width: cellWidth, height: 52, alignItems: 'center', justifyContent: 'center' }}
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
              Swipe or use the arrows to move between months. Tap any day up to today to add a memory — a photo always lands on the day it was taken.
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
        borderWidth: 1,
        borderColor: brand.line,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        padding: spacing.md,
        gap: spacing.sm,
        backgroundColor: brand.paper,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: spacing.xs, flex: 1 }}>
          <ThemedText variant="smallCaps">This week in memories</ThemedText>
          <ThemedText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
            {goal ? `${count} of ${goal} memories` : count === 1 ? '1 memory' : `${count} memories`}
          </ThemedText>
        </View>
        {percent !== null ? (
          <ThemedText variant="screenTitle" style={{ color: brand.quiet, fontVariant: ['tabular-nums'] }}>
            {percent}%
          </ThemedText>
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
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: brand.line,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Icon ios={icon} android={android} size={16} color={brand.ink} />
    </Pressable>
  );
}
