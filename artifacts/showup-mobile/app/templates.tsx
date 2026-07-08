import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListTemplatesQueryKey,
  TemplateType,
  useListTemplates,
  useSaveTemplate,
  type Template,
} from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';

const TYPES: { key: TemplateType; label: string; desc: string }[] = [
  { key: TemplateType.reminder_24h, label: '24-timers påminnelse', desc: 'Sendes dagen før' },
  { key: TemplateType.reminder_2h, label: '2-timers påminnelse', desc: 'Sendes samme dag' },
  { key: TemplateType.confirmation, label: 'Bekreftelse', desc: 'Sendes ved booking' },
];

const PLACEHOLDERS = ['{{navn}}', '{{dato}}', '{{tid}}', '{{bedrift}}'];

export default function TemplatesScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<TemplateType>(TemplateType.reminder_24h);
  const [body, setBody] = useState('');

  const { data, isLoading } = useListTemplates();
  const current: Template | undefined = data?.items.find((t) => t.type === active);

  useEffect(() => {
    setBody(current?.body ?? '');
  }, [current?.id, active]);

  const save = useSaveTemplate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        Alert.alert('Lagret', 'Malen ble oppdatert.');
      },
      onError: () => Alert.alert('Kunne ikke lagre', 'Prøv igjen.'),
    },
  });

  const submit = () => {
    if (!body.trim()) {
      Alert.alert('Tom mal', 'Skriv inn en meldingstekst.');
      return;
    }
    save.mutate({ type: active, data: { language: 'no', body: body.trim() } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Meldingsmaler"
        subtitle="Tilpass SMS-tekstene"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {TYPES.map((t) => {
          const isActive = active === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActive(t.key)}
              style={[
                styles.typeRow,
                {
                  backgroundColor: c.card,
                  borderColor: isActive ? c.primary : c.border,
                  borderRadius: c.radius,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeLabel, { color: c.foreground }]}>{t.label}</Text>
                <Text style={[styles.typeDesc, { color: c.mutedForeground }]}>{t.desc}</Text>
              </View>
              {isActive ? (
                <View style={[styles.dot, { backgroundColor: c.primary }]} />
              ) : null}
            </Pressable>
          );
        })}

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={c.primary} />
        ) : (
          <>
            <Text style={[styles.editorLabel, { color: c.mutedForeground }]}>
              MELDINGSTEKST
            </Text>
            <TextInput
              testID="template-body"
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
              placeholder="Skriv meldingen din her…"
              placeholderTextColor={c.mutedForeground}
              style={[
                styles.editor,
                {
                  color: c.foreground,
                  backgroundColor: c.card,
                  borderColor: c.border,
                  borderRadius: c.radius,
                },
              ]}
            />

            <Text style={[styles.editorLabel, { color: c.mutedForeground }]}>
              VARIABLER (TRYKK FOR Å SETTE INN)
            </Text>
            <View style={styles.chips}>
              {PLACEHOLDERS.map((ph) => (
                <Pressable
                  key={ph}
                  onPress={() => setBody((b) => `${b}${ph}`)}
                  style={[styles.chip, { backgroundColor: c.secondary, borderColor: c.border }]}
                >
                  <Text style={[styles.chipText, { color: c.foreground }]}>{ph}</Text>
                </Pressable>
              ))}
            </View>

            <AppButton
              testID="save-template"
              label={save.isPending ? 'Lagrer…' : 'Lagre mal'}
              onPress={submit}
              disabled={save.isPending}
              style={{ marginTop: 20 }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 120 : 60,
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  typeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  typeDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  editorLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },
  editor: {
    borderWidth: 1,
    padding: 14,
    minHeight: 130,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
});
