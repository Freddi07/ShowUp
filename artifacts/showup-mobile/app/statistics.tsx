import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  useGetStats,
  type StatsPeriod,
  type StatsRow,
} from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { Card, SectionLabel } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

type PeriodKey = 'last7d' | 'last30d' | 'total';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'last7d', label: '7 dager' },
  { key: 'last30d', label: '30 dager' },
  { key: 'total', label: 'Totalt' },
];

function pct(part: number, whole: number): string {
  if (!whole) return '0 %';
  return `${Math.round((part / whole) * 100)} %`;
}

export default function StatisticsScreen() {
  const c = useColors();
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>('last30d');
  const { data, isLoading } = useGetStats();

  const p: StatsPeriod | undefined = data?.[period];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Statistikk"
        subtitle="Påminnelser og oppmøte"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.segment}>
          {PERIODS.map((it) => {
            const active = period === it.key;
            return (
              <Pressable
                key={it.key}
                onPress={() => setPeriod(it.key)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: active ? c.primary : c.card,
                    borderColor: active ? c.primary : c.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? c.primaryForeground : c.mutedForeground },
                  ]}
                >
                  {it.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading || !p ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
        ) : (
          <>
            <View style={styles.grid}>
              <Metric label="Påminnelser sendt" value={String(p.sent)} color={c.primary} />
              <Metric label="Bekreftet" value={String(p.confirmed)} color="#2e9e52" />
              <Metric label="Avlyst" value={String(p.cancelled)} color="#de3b3d" />
              <Metric label="Vil endre tid" value={String(p.rescheduleRequested)} color="#3a84ca" />
            </View>

            <SectionLabel text="RATER" />
            <Card>
              <RateRow label="Bekreftelsesrate" value={pct(p.confirmed, p.sent)} />
              <RateRow label="Avlysningsrate" value={pct(p.cancelled, p.sent)} />
              <RateRow label="Ombestillingsrate" value={pct(p.rescheduleRequested, p.sent)} />
              <RateRow label="Uten svar" value={pct(p.noResponse, p.sent)} last />
            </Card>

            {data?.dailySeries?.length ? (
              <>
                <SectionLabel text="SISTE 30 DAGER" />
                <Card style={{ paddingVertical: 16 }}>
                  <DailyChart rows={data.dailySeries} />
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const c = useColors();
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
      ]}
    >
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function RateRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={[
        styles.rateRow,
        !last && { borderBottomWidth: 1, borderBottomColor: c.border },
      ]}
    >
      <Text style={[styles.rateLabel, { color: c.foreground }]}>{label}</Text>
      <Text style={[styles.rateValue, { color: c.foreground }]}>{value}</Text>
    </View>
  );
}

function DailyChart({ rows }: { rows: StatsRow[] }) {
  const c = useColors();
  const data = rows.slice(-30);
  const max = Math.max(1, ...data.map((r) => r.sent));
  return (
    <View style={styles.chart}>
      {data.map((r, i) => (
        <View key={`${r.date}-${i}`} style={styles.barCol}>
          <View
            style={{
              width: '70%',
              height: `${Math.max(4, (r.sent / max) * 100)}%`,
              backgroundColor: c.primary,
              borderRadius: 3,
              opacity: r.sent ? 1 : 0.25,
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 110 : 48,
  },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  metric: {
    flexGrow: 1,
    flexBasis: '47%',
    borderWidth: 1,
    padding: 16,
  },
  metricValue: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  metricLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rateLabel: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  rateValue: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2,
  },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
});
