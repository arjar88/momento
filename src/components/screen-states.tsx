import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from './button';
import { Mascot } from './mascot';
import { ThemedText } from './themed-text';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const brand = useBrandColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
      <Mascot size={56} mood="calm" />
      <ActivityIndicator color={brand.terracotta} />
      <ThemedText variant="subhead">{label}</ThemedText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const brand = useBrandColors();
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
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
        <Mascot size={52} mood="calm" />
        <ThemedText variant="title" style={{ textAlign: 'center' }}>
          We couldn’t load this
        </ThemedText>
        <ThemedText variant="body" selectable style={{ textAlign: 'center' }}>
          {message}
        </ThemedText>
        <Button title="Try again" onPress={onRetry} style={{ alignSelf: 'stretch' }} />
      </View>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const brand = useBrandColors();
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
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
        <Mascot size={56} mood="happy" />
        <ThemedText variant="title" style={{ textAlign: 'center' }}>
          {title}
        </ThemedText>
        <ThemedText variant="body" style={{ textAlign: 'center', color: brand.muted }}>
          {body}
        </ThemedText>
        {action && onAction ? <Button title={action} onPress={onAction} style={{ alignSelf: 'stretch' }} /> : null}
      </View>
    </View>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const brand = useBrandColors();
  return (
    <View
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: brand.card,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        borderWidth: 1.5,
        borderColor: brand.terracotta,
        boxShadow: bubblyShadow.pill,
      }}
    >
      <ThemedText variant="subhead" selectable>
        {message}
      </ThemedText>
      {onRetry ? <Button title="Try again" variant="secondary" size="sm" onPress={onRetry} /> : null}
    </View>
  );
}

type QuerySlice<T> = {
  data: T | undefined;
  error: Error | null;
  fetchStatus: 'fetching' | 'paused' | 'idle';
  refetch: () => void;
};

export function DataGate<T>({
  query,
  isEmpty,
  empty,
  children,
}: {
  query: QuerySlice<T>;
  isEmpty: (data: T) => boolean;
  empty: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.data === undefined) {
    if (query.error) return <ErrorState message={query.error.message} onRetry={query.refetch} />;
    if (query.fetchStatus === 'paused') {
      return (
        <EmptyState
          title="You’re offline"
          body="We’ll try again when you’re back."
          action="Try again"
          onAction={query.refetch}
        />
      );
    }
    return <LoadingState />;
  }

  return (
    <View style={{ flex: 1 }}>
      {query.error ? (
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <InlineError message="Couldn’t refresh. Showing what we already loaded." onRetry={query.refetch} />
        </View>
      ) : null}
      {isEmpty(query.data) ? empty : children(query.data)}
    </View>
  );
}
