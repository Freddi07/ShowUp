import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useGetStats,
  useListAppointments,
  type Appointment,
} from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { AppointmentCard } from '@/components/AppointmentCard';
import {
  AppointmentActionsSheet,
  type ActionableAppointment,
} from '@/components/AppointmentActionsSheet';
import { useColors } from '@/hooks/useColors';
import { formatDayHeading, dayKey, startOfDay } from '@/lib/format';

type Filter = 'upcoming' | 'past';

export default function DashboardScreen() {
  const c = useColors();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [actionTarget, setActionTarget] =
    useState<ActionableAppointment | null>(null);

  const appointmentsQuery = useListAppointments();
  const statsQuery = useGetStats();

  const items = appointmentsQuery.data?.items ?? [];

  const sections = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const filtered = items.filter((a) => {
      const t = new Date(a.scheduledAt).getTime();
      return filter === 'upcoming' ? t >= todayStart : t < todayStart;
    });
    filtered.sort((a, b) => {
      const ta = new Date(a.scheduledAt).getTime();
      const tb = new Date(b.scheduledAt).getTime();
      return filter === 'upcoming' ? ta - tb : tb - ta;
    });

    const groups = new Map<string, { title: string; data: Appointment[] }>();
    for (const a of filtered) {
      const d = new Date(a.scheduledAt);
      const key = dayKey(d);
      if (!groups.has(key)) {
        groups.set(key, { title: formatDayHeading(d), data: [] });
      }
      groups.get(key)!.data.push(a);
    }
    return Array.from(groups.values());
  }, [items, filter]);

  const stats = statsQuery.data?.last30d;
  const refreshing =
    appointmentsQuery.isRefetching || statsQuery.isRefetching;

  const onRefresh = () => {
    appointmentsQuery.refetch();
    statsQuery.refetch();
  };

  const loading = appointmentsQuery.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader title="BookPling" subtitle="Dine avtaler" />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {stats ? (
              <View style={styles.kpiRow}>
                <KpiPill
                  label="Bekreftet"
                  value={stats.confirmed}
                  color="#2e9e52"
                  icon="checkmark-circle"
                />
                <KpiPill
                  label="Avlyst"
                  value={stats.cancelled}
                  color="#de3b3d"
                  icon="close-circle"
                />
                <KpiPill
                  label="Vil endre"
                  value={stats.rescheduleRequested}
                  color="#3a84ca"
                  icon="calendar"
                />
              </View>
            ) : null}

            <View
              style={[
                styles.segment,
                { backgroundColor: c.secondary, borderRadius: c.radius },
              ]}
            >
              <SegmentButton
                label="Kommende"
                active={filter === 'upcoming'}
                onPress={() => setFilter('upcoming')}
              />
              <SegmentButton
                label="Tidligere"
                active={filter === 'past'}
                onPress={() => setFilter('past')}
              />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionCount, { color: c.mutedForeground }]}>
              {section.data.length}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <AppointmentCard
            clientName={item.clientName}
            clientPhone={item.clientPhone}
            scheduledAt={item.scheduledAt}
            status={item.status}
            onPress={
              item.customerId
                ? () => router.push(`/customer/${item.customerId}`)
                : undefined
            }
            onActions={() =>
              setActionTarget({
                id: item.id,
                clientName: item.clientName,
                clientPhone: item.clientPhone,
                scheduledAt: item.scheduledAt,
                status: item.status,
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={c.primary}
              style={{ marginTop: 60 }}
            />
          ) : (
            <EmptyState filter={filter} />
          )
        }
      />

      <AppointmentActionsSheet
        appointment={actionTarget}
        visible={actionTarget !== null}
        onClose={() => setActionTarget(null)}
      />
    </View>
  );
}

function KpiPill({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const c = useColors();
  return (
    <View
      style={[
        styles.kpi,
        { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.kpiValue, { color: c.foreground }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: c.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentBtn,
        active && {
          backgroundColor: c.card,
          borderRadius: c.radius - 2,
        },
      ]}
    >
      <Text
        style={[
          styles.segmentText,
          { color: active ? c.primary : c.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Ionicons
        name="calendar-outline"
        size={48}
        color={c.mutedForeground}
      />
      <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
        {filter === 'upcoming'
          ? 'Ingen kommende avtaler.'
          : 'Ingen tidligere avtaler.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 100 : 40,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpi: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  kpiValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  kpiLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  segmentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  sectionCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
});
