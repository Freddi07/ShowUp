import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetNotificationSettingsQueryKey,
  useDeleteAccount,
  useGetNotificationSettings,
  useGetTrialStatus,
  useUpdateNotificationSettings,
  type NotificationSettings,
} from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { AppButton } from '@/components/AppButton';
import { Card, SectionLabel, Sep } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { changePassword, ChangePasswordError } from '@/lib/auth';
import colors from '@/constants/colors';

type SettingKey = keyof NotificationSettings;

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  unlimited: 'Ubegrenset',
};

export default function AccountScreen() {
  const c = useColors();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const settingsKey = getGetNotificationSettingsQueryKey();

  const { data, isLoading } = useGetNotificationSettings();
  const trial = useGetTrialStatus();

  const mutation = useUpdateNotificationSettings({
    mutation: {
      onMutate: async (vars) => {
        await queryClient.cancelQueries({ queryKey: settingsKey });
        const prev = queryClient.getQueryData<NotificationSettings>(settingsKey);
        if (prev) {
          queryClient.setQueryData<NotificationSettings>(settingsKey, {
            ...prev,
            ...vars.data,
          });
        }
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        const prev = (ctx as { prev?: NotificationSettings } | undefined)?.prev;
        if (prev) queryClient.setQueryData(settingsKey, prev);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKey }),
    },
  });

  const toggle = (key: SettingKey, value: boolean) =>
    mutation.mutate({ data: { [key]: value } });

  const initials = (user?.name ?? 'B')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const planLabel = trial.data
    ? trial.data.plan
      ? PLAN_LABELS[trial.data.plan] ?? trial.data.plan
      : trial.data.trialActive
        ? 'Prøveperiode'
        : 'Ingen aktiv plan'
    : '—';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Konto"
        subtitle="Profil og varsler"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.brand[600] }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: c.foreground }]}>
              {user?.name ?? 'Bruker'}
            </Text>
            <Text
              style={[styles.profileEmail, { color: c.mutedForeground }]}
              numberOfLines={1}
            >
              {user?.email ?? ''}
            </Text>
          </View>
        </View>

        <SectionLabel text="ABONNEMENT" />
        <Card>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: c.mutedForeground }]}>
              Nåværende plan
            </Text>
            <Text style={[styles.infoValue, { color: c.foreground }]}>
              {planLabel}
            </Text>
          </View>
          <Sep />
          <AppButton
            label="Se abonnement"
            variant="secondary"
            onPress={() => router.push('/subscription')}
            style={{ marginVertical: 12 }}
          />
        </Card>

        <SectionLabel text="PÅMINNELSER" />
        <Card>
          <ToggleRow
            label="48 timer før"
            desc="Send SMS-påminnelse to dager før"
            value={data?.remind48h ?? false}
            disabled={isLoading}
            onChange={(v) => toggle('remind48h', v)}
          />
          <Sep />
          <ToggleRow
            label="24 timer før"
            desc="Send SMS-påminnelse dagen før"
            value={data?.remind24h ?? false}
            disabled={isLoading}
            onChange={(v) => toggle('remind24h', v)}
          />
          <Sep />
          <ToggleRow
            label="2 timer før"
            desc="Send en siste påminnelse samme dag"
            value={data?.remind2h ?? false}
            disabled={isLoading}
            onChange={(v) => toggle('remind2h', v)}
          />
          <Sep />
          <ToggleRow
            label="Automatisk oppfølging"
            desc="Følg opp kunder som ikke svarer"
            value={data?.autoFollowUp ?? false}
            disabled={isLoading}
            onChange={(v) => toggle('autoFollowUp', v)}
          />
        </Card>

        <SectionLabel text="SIKKERHET" />
        <Card>
          <ChangePasswordSection />
        </Card>

        <SectionLabel text="KONTO" />
        <DeleteAccountSection onDeleted={signOut} />

        <AppButton
          testID="logout"
          label="Logg ut"
          variant="destructive"
          onPress={signOut}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </View>
  );
}

function ChangePasswordSection() {
  const c = useColors();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 8) {
      Alert.alert('For kort', 'Nytt passord må ha minst 8 tegn.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      Alert.alert('Ferdig', 'Passordet ble endret.');
    } catch (err) {
      Alert.alert(
        'Kunne ikke endre',
        err instanceof ChangePasswordError ? err.message : 'Prøv igjen.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ paddingVertical: 12 }}>
      <PasswordField
        label="Nåværende passord"
        value={current}
        onChange={setCurrent}
        testID="current-password"
      />
      <PasswordField
        label="Nytt passord"
        value={next}
        onChange={setNext}
        testID="new-password"
      />
      <AppButton
        testID="change-password"
        label={busy ? 'Endrer…' : 'Bytt passord'}
        variant="secondary"
        onPress={submit}
        disabled={busy || !current || !next}
        style={{ marginTop: 4 }}
      />
    </View>
  );
}

function DeleteAccountSection({ onDeleted }: { onDeleted: () => void }) {
  const del = useDeleteAccount({
    mutation: {
      onSuccess: () => onDeleted(),
      onError: () =>
        Alert.alert('Kunne ikke slette', 'Prøv igjen om litt.'),
    },
  });

  const confirm = () => {
    Alert.alert(
      'Slett konto',
      'Dette sletter kontoen din og alle data permanent. Handlingen kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett permanent',
          style: 'destructive',
          onPress: () => del.mutate(),
        },
      ],
    );
  };

  return (
    <AppButton
      testID="delete-account"
      label={del.isPending ? 'Sletter…' : 'Slett konto'}
      variant="destructive"
      onPress={confirm}
      disabled={del.isPending}
    />
  );
}

function PasswordField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  const c = useColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.infoLabel, { color: c.mutedForeground, marginBottom: 6 }]}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        secureTextEntry
        autoCapitalize="none"
        style={[
          styles.input,
          { color: c.foreground, backgroundColor: c.background, borderColor: c.border, borderRadius: c.radius },
        ]}
      />
    </View>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.rowLabel, { color: c.foreground }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: c.mutedForeground }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: c.border, true: colors.brand[500] }}
        thumbColor="#ffffff"
        ios_backgroundColor={c.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 110 : 48,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  profileName: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  profileEmail: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  infoLabel: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  rowDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
});
