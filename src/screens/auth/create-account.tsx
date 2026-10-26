import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Mascot } from '@/components/mascot';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/lib/session';
import { requireSupabase } from '@/lib/supabase';
import { spacing, useBrandColors } from '@/theme';
import { errorMessage } from '@/utils/errors';

export function CreateAccountScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const { refreshProfile } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setError(null);
    setNotice(null);
    setPending(true);
    console.log('[auth] create-account submit started for:', email.trim());
    try {
      const { data, error: signError } = await requireSupabase().auth.signUp({
        email: email.trim(),
        password,
      });
      if (signError) {
        console.error('[auth] signUp error:', signError.message);
        throw new Error(signError.message);
      }
      console.log('[auth] signUp succeeded:', { userId: data.user?.id, hasSession: !!data.session });
      if (!data.session) {
        setNotice('Check your email to confirm the account, then sign in. Keepsakes does not send album invitations.');
        return;
      }
      await refreshProfile(data.session.user.id);
      router.replace('/intro');
    } catch (caught) {
      const msg = errorMessage(caught, 'Could not create the account.');
      console.error('[auth] create-account failed:', msg);
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, gap: spacing.md, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
        <Mascot size={64} mood="happy" />
        <ThemedText variant="wordmark">Create account</ThemedText>
        <ThemedText variant="subhead" style={{ textAlign: 'center' }}>
          Use the email people will invite you with.
        </ThemedText>
      </View>
      <TextField
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        textContentType="username"
      />
      <TextField
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        textContentType="newPassword"
      />
      {error ? (
        <ThemedText variant="subhead" selectable>
          {error}
        </ThemedText>
      ) : null}
      {notice ? (
        <ThemedText variant="subhead" selectable>
          {notice}
        </ThemedText>
      ) : null}
      <Button title="Create account" onPress={submit} loading={pending} disabled={!email.trim() || password.length < 6} />
      <Link href="/sign-in" style={{ alignSelf: 'center', marginTop: spacing.xs }}>
        <ThemedText variant="headline" style={{ color: brand.terracotta }}>
          I already have an account
        </ThemedText>
      </Link>
    </View>
  );
}
