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
import { useAuth } from '@/context/AuthContext';
import { SignInError } from '@/lib/auth';
import colors from '@/constants/colors';

export default function LoginScreen() {
  const c = useColors();
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onGoogle = async () => {
    if (loading || googleLoading) return;
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      // A user-cancelled sheet is not an error worth showing.
      if (e instanceof SignInError && e.message === 'CANCELLED') return;
      setError(
        e instanceof SignInError ? e.message : 'Noe gikk galt. Prøv igjen.',
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async () => {
    if (loading) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Fyll inn e-post og passord.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
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
          <Ionicons name="calendar-clear" size={40} color="#fff" />
        </LinearGradient>

        <Text style={[styles.brand, { color: c.foreground }]}>BookPling</Text>
        <Text style={[styles.tagline, { color: c.mutedForeground }]}>
          Færre bomturer. Flere fornøyde kunder.
        </Text>

        <View style={styles.form}>
          <Pressable
            testID="google-login"
            onPress={onGoogle}
            disabled={googleLoading || loading}
            style={[
              styles.googleBtn,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                borderRadius: c.radius,
                opacity: googleLoading ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="logo-google" size={18} color={c.foreground} />
            <Text style={[styles.googleText, { color: c.foreground }]}>
              {googleLoading ? 'Kobler til …' : 'Fortsett med Google'}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.mutedForeground }]}>
              eller
            </Text>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
          </View>

          <Text style={[styles.label, { color: c.foreground }]}>E-post</Text>
          <TextInput
            testID="login-email"
            value={email}
            onChangeText={setEmail}
            placeholder="deg@bedrift.no"
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
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

          <Text style={[styles.label, { color: c.foreground, marginTop: 16 }]}>
            Passord
          </Text>
          <TextInput
            testID="login-password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={c.mutedForeground}
            secureTextEntry
            autoCapitalize="none"
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
              <Ionicons
                name="alert-circle"
                size={16}
                color={c.destructive}
              />
              <Text style={[styles.errorText, { color: c.destructive }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <AppButton
            testID="login-submit"
            label="Logg inn"
            onPress={onSubmit}
            loading={loading}
            style={{ marginTop: 24 }}
          />

          <Pressable
            testID="forgot-password-link"
            onPress={() => router.push('/forgot-password')}
            style={styles.forgotRow}
            hitSlop={8}
          >
            <Text style={[styles.forgotText, { color: colors.brand[600] }]}>
              Glemt passord?
            </Text>
          </Pressable>
        </View>
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
    fontSize: 34,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
  },
  form: {
    marginTop: 36,
  },
  googleBtn: {
    height: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
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
  forgotRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
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
});
