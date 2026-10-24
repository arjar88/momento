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

export function SignInScreen() {
  const brand = useBrandColors();
  const router = useRouter();
  const { refreshProfile } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setError(null);
    setPending(true);
    try {
      const { data, error: signError } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) throw new Error(signError.message);
      const profile = data.user ? await refreshProfile() : null;
      router.replace(profile?.onboarding_complete ? '/calendar' : '/intro');
    } catch (caught) {
      setError(errorMessage(caught, 'Could not sign in.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: brand.paper, padding: spacing.lg, gap: spacing.md, justifyContent: 'center' }}>
      <ThemedText variant="wordmark">Keepsakes</ThemedText>
      <ThemedText variant="tagline">moments worth keeping</ThemedText>
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
        textContentType="password"
      />
      {error ? (
        <ThemedText variant="subhead" selectable>
          {error}
        </ThemedText>
      ) : null}
      <Button title="Sign in" onPress={submit} loading={pending} disabled={!email.trim() || password.length < 6} />
      <Link href="/create-account">
        <ThemedText variant="subhead" style={{ color: brand.terracotta }}>
          Create an account
        </ThemedText>
      </Link>
    </View>
  );
}
