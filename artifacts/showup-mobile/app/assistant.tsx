import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { GradientHeader } from '@/components/GradientHeader';
import { useColors } from '@/hooks/useColors';
import { API_BASE, getToken } from '@/lib/auth';
import {
  streamChat,
  type ChatEvent,
  type ToolResult,
} from '@/lib/assistant';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolResult[];
  streaming?: boolean;
}

interface IntegrationItem {
  provider: string;
  label: string;
  implemented: boolean;
  status: string;
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    'Hei! Jeg er BookPling-assistenten. Jeg kan forklare hvordan påminnelser fungerer og hjelpe deg å koble til bookingsystemet ditt — jeg kan til og med sette opp webhook og starte tilkoblinger for deg. Hva vil du gjøre?',
};

export default function AssistantScreen() {
  const c = useColors();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [missing, setMissing] = useState<IntegrationItem[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  // Identifies the active stream. Bumped on every send and on reset, so late
  // events from an aborted/superseded stream can't mutate a newer conversation.
  const requestIdRef = useRef(0);

  const loadMissing = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = (await res.json()) as { items: IntegrationItem[] };
      setMissing(
        body.items.filter((i) => i.implemented && i.status === 'disconnected'),
      );
    } catch {
      // Ignore — suggestions are best-effort.
    }
  }, []);

  useEffect(() => {
    loadMissing();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [loadMissing]);

  const scrollToEnd = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  function resetConversation() {
    requestIdRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setConversationId(null);
    setMessages([WELCOME]);
  }

  const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') {
          next[i] = fn(next[i]);
          break;
        }
      }
      return next;
    });

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '', tools: [], streaming: true },
    ]);
    setStreaming(true);
    scrollToEnd();

    const controller = new AbortController();
    abortRef.current = controller;
    const myId = ++requestIdRef.current;
    // True only while this exact stream is still the active one and the screen
    // is mounted — guards every post-await state mutation against reset/unmount.
    const isActive = () => mountedRef.current && requestIdRef.current === myId;

    const handle = (event: ChatEvent) => {
      if (!isActive()) return;
      if (event.type === 'start') {
        setConversationId(event.conversationId);
      } else if (event.type === 'text') {
        patchLast((m) => ({ ...m, content: m.content + event.content }));
        scrollToEnd();
      } else if (event.type === 'tool_result') {
        patchLast((m) => ({
          ...m,
          tools: [...(m.tools ?? []), { name: event.name, result: event.result }],
        }));
        scrollToEnd();
      } else if (event.type === 'error') {
        patchLast((m) => ({
          ...m,
          content: m.content || event.error || 'Noe gikk galt. Prøv igjen.',
        }));
      } else if (event.type === 'done') {
        setConversationId(event.conversationId);
      }
    };

    try {
      await streamChat(
        { conversationId, message: trimmed, signal: controller.signal },
        handle,
      );
      if (isActive()) {
        patchLast((m) => ({ ...m, streaming: false }));
        loadMissing();
      }
    } catch (err) {
      if (!isActive()) {
        // Superseded/unmounted — drop the result silently.
      } else if ((err as Error).name === 'AbortError') {
        patchLast((m) => ({ ...m, streaming: false }));
      } else {
        patchLast((m) => ({
          ...m,
          streaming: false,
          content:
            m.content ||
            'Beklager, jeg fikk ikke svart nå. Sjekk tilkoblingen og prøv igjen.',
        }));
      }
    } finally {
      if (isActive()) setStreaming(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Assistent"
        subtitle="Oppsett & hjelp"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={resetConversation}
            hitSlop={10}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <Feather name="plus" size={22} color="#fff" />
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          onContentSizeChange={scrollToEnd}
          keyboardDismissMode="interactive"
        >
          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubbleRow,
                { alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' },
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  m.role === 'user'
                    ? { backgroundColor: c.primary, borderBottomRightRadius: 4 }
                    : { backgroundColor: c.muted, borderBottomLeftRadius: 4 },
                ]}
              >
                {m.content ? (
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: m.role === 'user' ? c.primaryForeground : c.foreground },
                    ]}
                  >
                    {m.content}
                  </Text>
                ) : m.streaming ? (
                  <ActivityIndicator size="small" color={c.mutedForeground} />
                ) : null}
              </View>
              {m.tools?.map((t, j) => (
                <ToolResultCard key={j} tool={t} onChanged={loadMissing} />
              ))}
            </View>
          ))}

          {missing.length > 0 && !streaming ? (
            <View style={styles.suggestions}>
              <Text style={[styles.suggestLabel, { color: c.mutedForeground }]}>
                Forslag
              </Text>
              <View style={styles.chips}>
                {missing.slice(0, 4).map((i) => (
                  <Pressable
                    key={i.provider}
                    onPress={() => send(`Hjelp meg å sette opp ${i.label}`)}
                    style={[styles.chip, { borderColor: c.border, backgroundColor: c.card }]}
                  >
                    <Text style={[styles.chipText, { color: c.foreground }]}>
                      Sett opp {i.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.card }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Skriv en melding …"
            placeholderTextColor={c.mutedForeground}
            multiline
            style={[styles.input, { color: c.foreground, backgroundColor: c.muted }]}
            editable={!streaming}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={streaming || !input.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  streaming || !input.trim() ? c.muted : c.primary,
              },
            ]}
          >
            {streaming ? (
              <ActivityIndicator size="small" color={c.mutedForeground} />
            ) : (
              <Feather
                name="send"
                size={18}
                color={input.trim() ? c.primaryForeground : c.mutedForeground}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Rich rendering for a tool's structured result (secrets, links). */
function ToolResultCard({
  tool,
  onChanged,
}: {
  tool: ToolResult;
  onChanged: () => void;
}) {
  const c = useColors();
  const r = tool.result;

  if (tool.name === 'generate_webhook_credentials' && r.ok) {
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardTitleRow}>
          <Feather name="zap" size={15} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.foreground }]}>Webhook klar</Text>
        </View>
        {typeof r.webhookUrl === 'string' ? (
          <CopyField label="Webhook-URL" value={r.webhookUrl} />
        ) : null}
        {typeof r.secret === 'string' && r.secret ? (
          <CopyField label="Hemmelig nøkkel (vises kun nå)" value={r.secret} />
        ) : null}
        {typeof r.signatureHeader === 'string' ? (
          <Text style={[styles.cardNote, { color: c.mutedForeground }]}>
            Signér forespørsler (HMAC-SHA256) i headeren {String(r.signatureHeader)}.
          </Text>
        ) : null}
      </View>
    );
  }

  if (tool.name === 'start_oauth_flow' && r.ok && typeof r.authUrl === 'string') {
    const authUrl = r.authUrl;
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.cardNote, { color: c.foreground, marginBottom: 8 }]}>
          Klar til å koble til. Trykk for å logge inn:
        </Text>
        <Pressable
          onPress={async () => {
            await WebBrowser.openBrowserAsync(authUrl);
            onChanged();
          }}
          style={[styles.connectBtn, { backgroundColor: c.primary }]}
        >
          <Feather name="external-link" size={16} color={c.primaryForeground} />
          <Text style={[styles.connectBtnText, { color: c.primaryForeground }]}>
            Koble til nå
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!r.ok && typeof r.error === 'string') {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: 'rgba(231,0,11,0.06)', borderColor: 'rgba(231,0,11,0.3)' },
        ]}
      >
        <Text style={[styles.cardNote, { color: c.destructive }]}>{String(r.error)}</Text>
      </View>
    );
  }

  return null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const c = useColors();
  const [copied, setCopied] = useState(false);
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{label}</Text>
      <View style={styles.fieldRow}>
        <Text
          numberOfLines={1}
          style={[styles.fieldValue, { color: c.foreground, backgroundColor: c.muted }]}
        >
          {value}
        </Text>
        <Pressable
          onPress={() => {
            // Reflect the copied state immediately; the clipboard write itself
            // can reject on the web build, and we don't want that to swallow the
            // visual confirmation.
            setCopied(true);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Clipboard.setStringAsync(value).catch(() => {});
            setTimeout(() => setCopied(false), 1800);
          }}
          style={[styles.copyBtn, { borderColor: c.border }]}
        >
          <Feather name={copied ? 'check' : 'copy'} size={15} color={c.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24, gap: 10 },
  bubbleRow: { width: '100%' },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21 },
  suggestions: { marginTop: 6, gap: 8 },
  suggestLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  card: {
    marginTop: 8,
    maxWidth: '86%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  cardNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, marginBottom: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldValue: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  copyBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  connectBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
