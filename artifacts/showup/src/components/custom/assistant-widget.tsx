'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

interface IntegrationItem {
  provider: string;
  label: string;
  implemented: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
}

interface ToolResult {
  name: string;
  result: Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolResult[];
  /** True while this assistant message is still being streamed. */
  streaming?: boolean;
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    'Hei! Jeg er BookPling-assistenten. Jeg kan forklare hvordan påminnelser fungerer og hjelpe deg å koble til bookingsystemet ditt — jeg kan til og med sette opp webhook og starte tilkoblinger for deg. Hva vil du gjøre?',
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
          {value}
        </code>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7 shrink-0"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success('Kopiert');
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

/** Rich rendering for a tool's structured result (secrets, links, sync stats). */
function ToolResultCard({ tool }: { tool: ToolResult }) {
  const r = tool.result;
  if (tool.name === 'generate_webhook_credentials' && r.ok) {
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-brand-500" />
          Webhook klar
        </div>
        {typeof r.webhookUrl === 'string' ? (
          <CopyRow label="Webhook-URL" value={r.webhookUrl} />
        ) : null}
        {typeof r.secret === 'string' && r.secret ? (
          <CopyRow label="Hemmelig nøkkel (vises kun nå)" value={r.secret} />
        ) : null}
        {typeof r.signatureHeader === 'string' ? (
          <p className="text-xs text-muted-foreground">
            Signér forespørsler (HMAC-SHA256) i headeren{' '}
            <code className="rounded bg-muted px-1">{r.signatureHeader}</code>.
          </p>
        ) : null}
      </div>
    );
  }
  if (tool.name === 'start_oauth_flow' && r.ok && typeof r.authUrl === 'string') {
    const authUrl = r.authUrl;
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-lg border bg-card p-3">
        <p className="text-sm">Klar til å koble til. Klikk for å logge inn:</p>
        <Button
          type="button"
          size="sm"
          className="self-start"
          onClick={() => {
            window.location.href = authUrl;
          }}
        >
          <ExternalLink className="size-4" />
          Koble til nå
        </Button>
      </div>
    );
  }
  if (!r.ok && typeof r.error === 'string') {
    return (
      <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
        {r.error}
      </p>
    );
  }
  return null;
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiFetch<{ items: IntegrationItem[] }>('/api/integrations'),
    enabled: open,
  });

  const missing = (integrations.data?.items ?? []).filter(
    (i) => i.implemented && i.status === 'disconnected',
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function resetConversation() {
    abortRef.current?.abort();
    setStreaming(false);
    setConversationId(null);
    setMessages([WELCOME]);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '', tools: [], streaming: true },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    /** Update the last (in-progress) assistant message. */
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

    try {
      const res = await fetch(`${API_BASE}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ conversationId, message: trimmed }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`chat failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const payload = JSON.parse(line.slice(5).trim()) as {
            type: string;
            content?: string;
            conversationId?: string;
            name?: string;
            result?: Record<string, unknown>;
            error?: string;
          };
          if (payload.type === 'start' && payload.conversationId) {
            setConversationId(payload.conversationId);
          } else if (payload.type === 'text' && payload.content) {
            patchLast((m) => ({ ...m, content: m.content + payload.content }));
          } else if (payload.type === 'tool_result' && payload.name) {
            patchLast((m) => ({
              ...m,
              tools: [
                ...(m.tools ?? []),
                { name: payload.name!, result: payload.result ?? {} },
              ],
            }));
          } else if (payload.type === 'error') {
            patchLast((m) => ({
              ...m,
              content:
                m.content || payload.error || 'Noe gikk galt. Prøv igjen.',
            }));
          } else if (payload.type === 'done') {
            if (payload.conversationId) setConversationId(payload.conversationId);
          }
        }
      }
      patchLast((m) => ({ ...m, streaming: false }));
      integrations.refetch();
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
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
      setStreaming(false);
      abortRef.current = null;
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 size-14 rounded-full shadow-lg"
        aria-label="Åpne BookPling-assistenten"
      >
        <Bot className="size-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(600px,calc(100dvh-2.5rem))] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-500/10">
            <Bot className="size-4 text-brand-500" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">BookPling-assistent</p>
            <p className="text-xs text-muted-foreground">Oppsett & hjelp</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title="Ny samtale"
            onClick={resetConversation}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title="Lukk"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-3 p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'flex flex-col gap-1',
                m.role === 'user' ? 'items-end' : 'items-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                  m.role === 'user'
                    ? 'rounded-br-sm bg-brand-500 text-white'
                    : 'rounded-bl-sm bg-muted text-foreground',
                )}
              >
                {m.content ||
                  (m.streaming ? (
                    <span className="inline-flex gap-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-current" />
                    </span>
                  ) : null)}
              </div>
              {m.tools?.map((t, j) => (
                <div key={j} className="w-[85%]">
                  <ToolResultCard tool={t} />
                </div>
              ))}
            </div>
          ))}

          {/* Quick actions for integrations that aren't connected yet. */}
          {missing.length > 0 && !streaming ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground">Forslag:</span>
              <div className="flex flex-wrap gap-1.5">
                {missing.slice(0, 4).map((i) => (
                  <Button
                    key={i.provider}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => send(`Hjelp meg å sette opp ${i.label}`)}
                  >
                    Sett opp {i.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <form
        className="flex items-end gap-2 border-t bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Skriv en melding …"
          rows={1}
          className="max-h-28 min-h-9 flex-1 resize-none"
          disabled={streaming}
        />
        <Button
          type="submit"
          size="icon"
          className="size-9 shrink-0"
          disabled={streaming || !input.trim()}
        >
          {streaming ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
