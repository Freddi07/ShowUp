import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetNotificationSettingsQueryKey,
  useGetNotificationSettings,
  useUpdateNotificationSettings,
  type NotificationSettings,
} from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import colors from '@/constants/colors';

type SettingKey = keyof NotificationSettings;

export default function SettingsScreen() {
  const c = useColors();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const settingsKey = getGetNotificationSettingsQueryKey();

  const { data, isLoading } = useGetNotificationSettings();
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
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: settingsKey });
      },
    },
  });

  const toggle = (key: SettingKey, value: boolean) => {
    mutation.mutate({ data: { [key]: value } });
  };

  const initials = (user?.name ?? 'S')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader title="Innstillinger" subtitle="Konto og varsler" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
          ]}
        >
          <View
            style={[styles.avatar, { backgroundColor: colors.brand[600] }]}
          >
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
        </Card>

        <SectionLabel text="KANALER" />
        <Card>
          <ToggleRow
            label="SMS"
            desc="Send påminnelser på SMS"
            value={data?.channelSms ?? false}
            disabled={isLoading}
            onChange={(v) => toggle('channelSms', v)}
          />
          <Sep />
          <ToggleRow
            label="E-post"
            desc="Send påminnelser på e-post"
            value={data?.channelEmail ?? false}
            disabled={isLoading}
            onChange={(v) => toggle('channelEmail', v)}
          />
        </Card>

        <SectionLabel text="ANNET" />
        <Card>
          <ToggleRow
            label="Automatisk oppfølging"
            desc="Følg opp kunder som ikke svarer"
            value={data?.autoFollowUp ?? false}
            disabled={isLoading}
            onChange={(v) => toggle('autoFollowUp', v)}
          />
        </Card>

        <AppButton
          testID="logout"
          label="Logg ut"
          variant="destructive"
          onPress={signOut}
          style={{ marginTop: 28 }}
        />
      </ScrollView>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
      ]}
    >
      {children}
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const c = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
      {text}
    </Text>
  );
}

function Sep() {
  const c = useColors();
  return <View style={[styles.sep, { backgroundColor: c.border }]} />;
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
        <Text style={[styles.rowDesc, { color: c.mutedForeground }]}>
          {desc}
        </Text>
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
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#fff',
  },
  profileName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  profileEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  rowDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  sep: {
    height: 1,
  },
});
