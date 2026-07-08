import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGetAdminStats } from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { Card, MenuRow, SectionLabel, Sep } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function MoreScreen() {
  const c = useColors();
  const router = useRouter();
  const { user } = useAuth();

  // Admin routes are gated by an email allowlist on the server. Probe the
  // admin stats endpoint quietly; only administrators get a success, so we
  // show the Admin entry only then.
  const admin = useGetAdminStats({
    query: { retry: false, staleTime: 5 * 60 * 1000 } as never,
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader title="Mer" subtitle={user?.name ?? 'Meny'} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionLabel text="OVERSIKT" />
        <Card>
          <MenuRow
            icon="bar-chart-2"
            title="Statistikk"
            subtitle="Påminnelser, bekreftelser og no-show"
            onPress={() => router.push('/statistics')}
          />
          <Sep />
          <MenuRow
            icon="message-square"
            title="Meldingsmaler"
            subtitle="Rediger SMS-tekster"
            onPress={() => router.push('/templates')}
          />
        </Card>

        <SectionLabel text="KONTO" />
        <Card>
          <MenuRow
            icon="user"
            title="Konto og varsler"
            subtitle="Profil, passord og påminnelser"
            onPress={() => router.push('/account')}
          />
          <Sep />
          <MenuRow
            icon="credit-card"
            title="Abonnement"
            subtitle="Plan og fakturering"
            onPress={() => router.push('/subscription')}
          />
          <Sep />
          <MenuRow
            icon="link"
            title="Integrasjoner"
            subtitle="Importer kunder og API-nøkkel"
            onPress={() => router.push('/integrations')}
          />
        </Card>

        {admin.isSuccess ? (
          <>
            <SectionLabel text="ADMINISTRASJON" />
            <Card>
              <MenuRow
                icon="shield"
                title="Admin"
                subtitle="Plattformoversikt"
                onPress={() => router.push('/admin')}
              />
            </Card>
          </>
        ) : null}

        <Text style={[styles.footer, { color: c.mutedForeground }]}>
          BookPling
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'web' ? 110 : 48,
  },
  footer: {
    textAlign: 'center',
    marginTop: 32,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
