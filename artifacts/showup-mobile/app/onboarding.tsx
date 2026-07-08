import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import {
  BUSINESS_TYPES,
  INTEGRATION_OPTIONS,
  OPTIONAL_SECTION_KEYS,
  SECTION_META,
  saveOnboarding,
  type OptionItem,
} from '@/lib/onboarding';

const STEP_TITLES = ['Virksomhet', 'Funksjoner', 'Kundekilde', 'Ferdig'];

export default function OnboardingScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshOnboarding } = useAuth();

  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [sections, setSections] = useState<string[]>([...OPTIONAL_SECTION_KEYS]);
  const [integration, setIntegration] = useState('manuell');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (key: string) =>
    setSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const finish = async (skip = false) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(
        skip
          ? { onboardingCompleted: true, enabledSections: null }
          : { onboardingCompleted: true, businessType, enabledSections: sections },
      );
      await refreshOnboarding();
      router.replace('/(tabs)');
    } catch {
      setError('Kunne ikke lagre. Prøv igjen.');
      setSaving(false);
    }
  };

  const Card = ({
    item,
    active,
    onPress,
    multi,
  }: {
    item: OptionItem;
    active: boolean;
    onPress: () => void;
    multi?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: active ? c.primary + '14' : c.card,
          borderColor: active ? c.primary : c.border,
          borderRadius: c.radius,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardLabel, { color: c.foreground }]}>
          {item.label}
        </Text>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: c.mutedForeground }]}>
            {item.description}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          multi ? styles.checkbox : styles.radio,
          {
            borderColor: active ? c.primary : c.border,
            backgroundColor: active ? c.primary : 'transparent',
          },
        ]}
      >
        {active ? (
          <Ionicons name="checkmark" size={14} color="#fff" />
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24 }}>
        <View style={styles.progressRow}>
          <View style={styles.dots}>
            {STEP_TITLES.map((title, i) => (
              <View
                key={title}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i <= step ? c.primary : c.border,
                    width: i === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
          <Pressable onPress={() => finish(true)} hitSlop={8} disabled={saving}>
            <Text style={[styles.skip, { color: c.mutedForeground }]}>
              Hopp over
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <>
            <Text style={[styles.title, { color: c.foreground }]}>
              Hva slags virksomhet har du?
            </Text>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
              Vi bruker dette til å tilpasse opplevelsen din.
            </Text>
            {BUSINESS_TYPES.map((t) => (
              <Card
                key={t.key}
                item={t}
                active={businessType === t.key}
                onPress={() => setBusinessType(t.key)}
              />
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={[styles.title, { color: c.foreground }]}>
              Hvilke funksjoner vil du bruke?
            </Text>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
              Vi viser bare det du velger. Du kan endre dette senere.
            </Text>
            {SECTION_META.map((s) => (
              <Card
                key={s.key}
                item={s}
                multi
                active={sections.includes(s.key)}
                onPress={() => toggleSection(s.key)}
              />
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[styles.title, { color: c.foreground }]}>
              Hvordan får du inn kundene dine?
            </Text>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
              Du kan sette opp koblingen når som helst.
            </Text>
            {INTEGRATION_OPTIONS.map((o) => (
              <Card
                key={o.key}
                item={o}
                active={integration === o.key}
                onPress={() => setIntegration(o.key)}
              />
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[styles.title, { color: c.foreground }]}>
              Alt klart!
            </Text>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
              Appen din er tilpasset valgene dine. Du kan alltid endre dem
              senere.
            </Text>
            <View
              style={[
                styles.summary,
                { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
              ]}
            >
              <SummaryRow
                c={c}
                label="Virksomhet"
                value={
                  BUSINESS_TYPES.find((b) => b.key === businessType)?.label ??
                  'Ikke valgt'
                }
              />
              <SummaryRow
                c={c}
                label="Funksjoner"
                value={
                  sections.length
                    ? SECTION_META.filter((s) => sections.includes(s.key))
                        .map((s) => s.label)
                        .join(', ')
                    : 'Ingen'
                }
              />
              <SummaryRow
                c={c}
                label="Kundekilde"
                value={
                  INTEGRATION_OPTIONS.find((o) => o.key === integration)?.label ??
                  '—'
                }
              />
            </View>
          </>
        )}

        {error ? (
          <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16, borderTopColor: c.border },
        ]}
      >
        {step > 0 ? (
          <AppButton
            label="Tilbake"
            variant="secondary"
            onPress={() => setStep((s) => s - 1)}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {step < STEP_TITLES.length - 1 ? (
          <AppButton
            label="Neste"
            onPress={() => setStep((s) => s + 1)}
            style={{ flex: 1 }}
          />
        ) : (
          <AppButton
            label="Kom i gang"
            onPress={() => finish(false)}
            loading={saving}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </View>
  );
}

function SummaryRow({
  c,
  label,
  value,
}: {
  c: ReturnType<typeof useColors>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: c.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  skip: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 12 },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  cardDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  summaryValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
  },
  error: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
