import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { requestPasswordReset, SignInError } from '@/lib/auth';
import colors from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const c = useColors();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    if (loading) return;
    setError(null);
    if (!email.trim()) {
      setError('Fyll inn e-postadressen din.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (e) {
      setError(
        e instanceof SignInError ? e.message : 'Noe gikk galt. Prøv igjen.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[colors.brand[700], colors.brand[500], colors.brand[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoWrap}
        >
          <Ionicons
            name={submitted ? 'mail-unread' : 'lock-closed'}
            size={38}
            color="#fff"
          />
        </LinearGradient>

        <Text style={[styles.brand, { color: c.foreground }]}>Glemt passord?</Text>
        <Text style={[styles.tagline, { color: c.mutedForeground }]}>
          {submitted
            ? 'Sjekk innboksen din for å tilbakestille passordet.'
            : 'Skriv inn e-postadressen din, så sender vi deg en lenke.'}
        </Text>

        {submitted ? (
          <View style={styles.form}>
            <View
              style={[
                styles.successCard,
                { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
              ]}
            >
              <Text style={[styles.successText, { color: c.foreground }]}>
                Vi har sendt en e-post til{' '}
                <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{email.trim()}</Text>{' '}
                hvis kontoen finnes.
              </Text>
              <Text style={[styles.hint, { color: c.mutedForeground }]}>
                Ikke mottatt? Sjekk søppelpost, eller prøv på nytt.
              </Text>
            </View>

            <AppButton
              testID="reset-retry"
              label="Prøv en annen e-post"
              variant="secondary"
              onPress={() => setSubmitted(false)}
              style={{ marginTop: 16 }}
            />
            <AppButton
              testID="reset-back"
              label="Tilbake til innlogging"
              onPress={() => router.replace('/login')}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.label, { color: c.foreground }]}>E-post</Text>
            <TextInput
              testID="reset-email"
              value={email}
              onChangeText={setEmail}
              placeholder="deg@bedrift.no"
              placeholderTextColor={c.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              onSubmitEditing={onSubmit}
              returnKeyType="go"
              style={[
                styles.input,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  color: c.foreground,
                  borderRadius: c.radius,
                },
              ]}
            />

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={c.destructive} />
                <Text style={[styles.errorText, { color: c.destructive }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <AppButton
              testID="reset-submit"
              label="Send tilbakestillingslenke"
              onPress={onSubmit}
              loading={loading}
              style={{ marginTop: 24 }}
            />

            <Pressable
              testID="reset-to-login"
              onPress={() => router.replace('/login')}
              style={styles.linkRow}
              hitSlop={8}
            >
              <Text style={[styles.linkMuted, { color: c.mutedForeground }]}>
                Husket du passordet?{' '}
                <Text style={{ color: colors.brand[600], fontFamily: 'Inter_600SemiBold' }}>
                  Logg inn
                </Text>
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    ...Platform.select({
      web: { boxShadow: '0 10px 30px rgba(178,42,0,0.35)' },
      default: {
        shadowColor: '#b22a00',
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      },
    }),
  },
  brand: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  form: { marginTop: 32 },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    flex: 1,
  },
  successCard: {
    borderWidth: 1,
    padding: 18,
  },
  successText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 10,
  },
  linkRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkMuted: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
});
