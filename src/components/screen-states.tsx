import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';
import { spacing, useBrandColors } from '@/theme';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const brand = useBrandColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg }}>
      <ActivityIndicator color={brand.terracotta} />
      <ThemedText variant="subhead">{label}</ThemedText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
      <ThemedText variant="headline">We couldn’t load this</ThemedText>
      <ThemedText variant="body" selectable>
        {message}
      </ThemedText>
      <Button title="Try again" onPress={onRetry} />
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
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
      <ThemedText variant="headline">{title}</ThemedText>
      <ThemedText variant="body">{body}</ThemedText>
      {action && onAction ? <Button title={action} onPress={onAction} /> : null}
    </View>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const brand = useBrandColors();
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, backgroundColor: brand.card, borderRadius: 12, borderCurve: 'continuous' }}>
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
