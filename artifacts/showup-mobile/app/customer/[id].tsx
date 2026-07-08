import React from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetCustomer } from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useColors } from '@/hooks/useColors';
import { formatShortDate, formatTime } from '@/lib/format';

export default function CustomerDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useGetCustomer(String(id));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title={data?.name ?? 'Kunde'}
        subtitle={data ? `${data.appointmentCount} avtaler` : undefined}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 60 }} />
      ) : isError || !data ? (
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={44}
            color={c.mutedForeground}
          />
          <Text style={[styles.errorText, { color: c.mutedForeground }]}>
            Fant ikke kunden.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Contact card */}
          <View
            style={[
              styles.card,
              { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
            ]}
          >
            {data.phone ? (
              <InfoRow icon="call-outline" label="Telefon" value={data.phone} />
            ) : null}
            {data.email ? (
              <InfoRow icon="mail-outline" label="E-post" value={data.email} />
            ) : null}
            {data.source ? (
              <InfoRow
                icon="link-outline"
                label="Kilde"
                value={data.source}
              />
            ) : null}
            {data.lastVisitAt ? (
              <InfoRow
                icon="time-outline"
                label="Siste besøk"
                value={formatShortDate(new Date(data.lastVisitAt))}
              />
            ) : null}
          </View>

          <Text style={[styles.heading, { color: c.foreground }]}>
            Avtalehistorikk
          </Text>

          {data.appointments.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>
              Ingen avtaler registrert.
            </Text>
          ) : (
            data.appointments.map((a) => (
              <View
                key={a.id}
                style={[
                  styles.apptRow,
                  {
                    backgroundColor: c.card,
                    borderColor: c.border,
                    borderRadius: c.radius,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.apptDate, { color: c.foreground }]}>
                    {formatShortDate(new Date(a.scheduledAt))}
                  </Text>
                  <Text
                    style={[styles.apptTime, { color: c.mutedForeground }]}
                  >
                    kl. {formatTime(new Date(a.scheduledAt))}
                  </Text>
                </View>
                <StatusBadge status={a.status} size="sm" />
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const c = useColors();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={c.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: c.mutedForeground }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: c.foreground }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 60 : 40,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  infoValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginTop: 1,
  },
  heading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginTop: 24,
    marginBottom: 12,
  },
  empty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  apptDate: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  apptTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
});
