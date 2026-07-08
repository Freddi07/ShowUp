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
import { useGetAdminStats } from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { AppButton } from '@/components/AppButton';
import { Card, SectionLabel, Sep } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { WEB_BASE } from '@/lib/auth';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Venter',
  REMINDED: 'Påminnet',
  CONFIRMED: 'Bekreftet',
  CANCELLED: 'Avlyst',
  RESCHEDULE_REQUESTED: 'Vil endre',
};

export default function AdminScreen() {
  const c = useColors();
  const router = useRouter();
  const { data, isLoading, isError } = useGetAdminStats({
    query: { retry: false } as never,
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Admin"
        subtitle="Plattformoversikt"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
        ) : isError || !data ? (
          <Text style={[styles.error, { color: c.mutedForeground }]}>
            Du har ikke tilgang til dette området.
          </Text>
        ) : (
          <>
            <View style={styles.grid}>
              <Metric label="Brukere" value={String(data.totalUsers)} />
              <Metric label="Nye (7 d)" value={String(data.newUsers7d)} />
              <Metric label="Aktive abonnement" value={String(data.activeSubscriptions)} />
              <Metric label="I prøveperiode" value={String(data.trialingUsers)} />
              <Metric label="Kunder totalt" value={String(data.totalCustomers)} />
              <Metric label="Avtaler totalt" value={String(data.totalAppointments)} />
            </View>

            <SectionLabel text="AVTALER PER STATUS" />
            <Card>
              {Object.entries(data.appointmentsByStatus).map(([status, n], i, arr) => (
                <View key={status}>
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: c.foreground }]}>
                      {STATUS_LABELS[status] ?? status}
                    </Text>
                    <Text style={[styles.rowValue, { color: c.foreground }]}>{n}</Text>
                  </View>
                  {i < arr.length - 1 ? <Sep /> : null}
                </View>
              ))}
            </Card>

            {data.bannedUsers > 0 ? (
              <Text style={[styles.note, { color: c.mutedForeground }]}>
                {data.bannedUsers} utestengte brukere
              </Text>
            ) : null}

            <AppButton
              label="Full admin i nettleseren"
              variant="secondary"
              onPress={() => Linking.openURL(`${WEB_BASE}/admin`)}
              style={{ marginTop: 20 }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
      ]}
    >
      <Text style={[styles.metricValue, { color: c.primary }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 110 : 48,
  },
  error: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    paddingHorizontal: 24,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  metricValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  metricLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  rowValue: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  note: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
});
