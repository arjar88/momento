import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { MascotBanner } from '@/components/mascot';
import { DataGate } from '@/components/screen-states';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { fetchAlbum, fetchInvites, fetchMembers, fetchNames, inviteByEmail } from '@/lib/api';
import { useSession } from '@/lib/session';
import { bubblyShadow, radius, spacing, useBrandColors } from '@/theme';
import { errorMessage } from '@/utils/errors';

export function InviteScreen({ albumId }: { albumId: string }) {
  const brand = useBrandColors();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['invite', albumId],
    queryFn: async () => {
      const album = await fetchAlbum(albumId);
      const members = await fetchMembers(albumId);
      const invites = await fetchInvites(albumId);
      const names = await fetchNames(members.map((member) => member.user_id));
      return { album, members, invites, names };
    },
  });

  const invite = useMutation({
    mutationFn: () => inviteByEmail(albumId, session!.user.id, email),
    onSuccess: async () => {
      setEmail('');
      setError(null);
      setNotice('If they already have an account, they’re in the album. If not, the invite waits until they sign up with this email. No message is sent.');
      await queryClient.invalidateQueries({ queryKey: ['invite', albumId] });
      await queryClient.invalidateQueries({ queryKey: ['people'] });
    },
    onError: (caught) => {
      setNotice(null);
      setError(errorMessage(caught));
    },
  });

  return (
    <DataGate
      query={query}
      isEmpty={(data) => !data.album}
      empty={<ThemedText variant="body">That album is gone.</ThemedText>}
    >
      {(data) => {
        const owner = data.album?.owner_id === session?.user.id;
        return (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: brand.paper }}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
          >
            <MascotBanner
              title="Share this album"
              subtitle="Invite someone by email. They join immediately if they have an account, or when they sign up."
              mood="happy"
            />
            {owner ? (
              <View style={{ gap: spacing.md }}>
                <TextField
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                />
                {error ? (
                  <ThemedText selectable variant="subhead">
                    {error}
                  </ThemedText>
                ) : null}
                {notice ? <ThemedText variant="subhead">{notice}</ThemedText> : null}
                <Button
                  title="Invite"
                  loading={invite.isPending}
                  disabled={!email.includes('@')}
                  onPress={() => invite.mutate()}
                />
              </View>
            ) : (
              <ThemedText variant="body">Only the owner can invite people.</ThemedText>
            )}
            <View
              style={{
                backgroundColor: brand.card,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                borderWidth: 1.5,
                borderColor: brand.line,
                padding: spacing.md + 2,
                gap: spacing.sm,
                boxShadow: bubblyShadow.card,
              }}
            >
              <ThemedText variant="smallCaps">In this album</ThemedText>
              {data.members.length === 0 ? <ThemedText variant="body">No one is here yet.</ThemedText> : null}
              {data.members.map((member) => (
                <ThemedText key={member.user_id} variant="headline">
                  {member.user_id === session?.user.id ? 'You' : data.names[member.user_id] || 'Someone'} · {member.role}
                </ThemedText>
              ))}
              <View style={{ height: 1, backgroundColor: brand.line, marginVertical: spacing.xs }} />
              <ThemedText variant="smallCaps">Waiting on an account</ThemedText>
              {data.invites.length === 0 ? (
                <ThemedText variant="body">No pending emails.</ThemedText>
              ) : (
                data.invites.map((row) => (
                  <ThemedText key={row.id} selectable variant="body">
                    {row.email}
                  </ThemedText>
                ))
              )}
            </View>
          </ScrollView>
        );
      }}
    </DataGate>
  );
}
