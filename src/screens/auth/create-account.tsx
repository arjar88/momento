import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
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
    try {
      const { data, error: signError } = await requireSupabase().auth.signUp({
        email: email.trim(),
        password,
      });
      if (signError) throw new Error(signError.message);
      if (!data.session) {
        setNotice('Check your email to confirm the account, then sign in. Keepsakes does not send album invitations.');
        return;
      }
      await refreshProfile();
      router.replace('/intro');
    } catch (caught) {
      setError(errorMessage(caught, 'Could not create the account.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, gap: spacing.md, justifyContent: 'center' }}>
      <ThemedText variant="wordmark">Create account</ThemedText>
      <ThemedText variant="body">Use the email people will invite you with.</ThemedText>
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
      <Link href="/sign-in">
        <ThemedText variant="subhead" style={{ color: brand.terracotta }}>
          I already have an account
        </ThemedText>
      </Link>
    </View>
  );
}
