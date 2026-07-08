import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGetTrialStatus } from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { AppButton } from '@/components/AppButton';
import { Card, SectionLabel, Sep } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { WEB_BASE } from '@/lib/auth';
import { formatLongDate } from '@/lib/format';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  unlimited: 'Ubegrenset',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  trialing: 'Prøveperiode',
  past_due: 'Forfalt',
  canceled: 'Kansellert',
};

export default function SubscriptionScreen() {
  const c = useColors();
  const router = useRouter();
  const { data, isLoading } = useGetTrialStatus();

  const planLabel = data
    ? data.plan
      ? PLAN_LABELS[data.plan] ?? data.plan
      : data.trialActive
        ? 'Prøveperiode'
        : 'Ingen aktiv plan'
    : '—';

  const statusLabel = data?.subscriptionStatus
    ? STATUS_LABELS[data.subscriptionStatus] ?? data.subscriptionStatus
    : data?.trialActive
      ? 'Prøveperiode'
      : 'Ingen';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Abonnement"
        subtitle="Plan og fakturering"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading || !data ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
        ) : (
          <>
            <SectionLabel text="DIN PLAN" />
            <Card>
              <Row label="Plan" value={planLabel} />
              <Sep />
              <Row label="Status" value={statusLabel} />
              <Sep />
              <Row
                label="Maks kunder"
                value={data.maxCustomers == null ? 'Ubegrenset' : String(data.maxCustomers)}
              />
              {data.trialActive && data.trialEndsAt ? (
                <>
                  <Sep />
                  <Row
                    label="Prøveperiode utløper"
                    value={formatLongDate(new Date(data.trialEndsAt))}
                  />
                </>
              ) : null}
            </Card>

            <Text style={[styles.note, { color: c.mutedForeground }]}>
              Oppgradering og fakturadetaljer håndteres trygt i nettleseren.
            </Text>

            <AppButton
              label="Administrer abonnement"
              onPress={() => Linking.openURL(`${WEB_BASE}/upgrade`)}
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: c.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: c.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 110 : 48,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  label: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  value: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  note: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 20,
    marginBottom: 12,
  },
});
