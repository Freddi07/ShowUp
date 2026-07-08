import React from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { GradientHeader } from '@/components/GradientHeader';
import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { WEB_BASE } from '@/lib/auth';

const ITEMS: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  desc: string;
}[] = [
  {
    icon: 'upload',
    title: 'Importer kunder (CSV)',
    desc: 'Last opp kundelister fra Excel eller andre systemer.',
  },
  {
    icon: 'key',
    title: 'API-nøkkel',
    desc: 'Koble bookingsystemet ditt til BookPling automatisk.',
  },
  {
    icon: 'book-open',
    title: 'Veiledninger',
    desc: 'Steg-for-steg for de vanligste plattformene.',
  },
];

export default function IntegrationsScreen() {
  const c = useColors();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Integrasjoner"
        subtitle="Koble til kundedata"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: c.mutedForeground }]}>
          Integrasjoner og import administreres i nettleseren, der du har full
          oversikt over filer og nøkler.
        </Text>

        <Card>
          {ITEMS.map((it, i) => (
            <View
              key={it.title}
              style={[
                styles.row,
                i < ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: c.secondary }]}>
                <Feather name={it.icon} size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.foreground }]}>{it.title}</Text>
                <Text style={[styles.desc, { color: c.mutedForeground }]}>{it.desc}</Text>
              </View>
            </View>
          ))}
        </Card>

        <AppButton
          label="Åpne i nettleseren"
          onPress={() => Linking.openURL(`${WEB_BASE}/dashboard/integrations`)}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 110 : 48,
  },
  intro: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  desc: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
});
