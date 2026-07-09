import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, RefreshCw, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const WELCOME =
  "Hei! Jeg er LokalRadar-rådgiveren din. Jeg kjenner bedriften din, konkurrentene du følger og de siste varslene — spør meg om hva du bør gjøre for å ligge i forkant.";

const SUGGESTIONS = [
  "Hva bør jeg prioritere denne uken?",
  "En konkurrent har satt ned prisene — hvordan bør jeg svare?",
  "Lag et tilbud for en rolig tirsdag formiddag.",
  "Hvordan ligger jeg an mot konkurrentene på anmeldelser?",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load any existing conversation on mount.
  useEffect(() => {
    let active = true;
    apiFetch<{ items: ChatMessage[] }>("/api/lokalradar/chat/messages")
      .then((data) => {
        if (active) setMessages(data.items ?? []);
      })
      .catch(() => {
        /* empty conversation is fine */
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "assistant") {
          next[i] = fn(next[i]);
          break;
        }
      }
      return next;
    });

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "", streaming: true },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/lokalradar/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok || !res.body) throw new Error(`chat failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let payload: { type: string; content?: string; error?: string };
          try {
            payload = JSON.parse(line.slice(5).trim());
          } catch {
            continue; // ignore a malformed frame rather than break the stream
          }
          if (payload.type === "text" && payload.content) {
            patchLast((m) => ({ ...m, content: m.content + payload.content }));
          } else if (payload.type === "error") {
            patchLast((m) => ({
              ...m,
              content: m.content || payload.error || "Noe gikk galt. Prøv igjen.",
            }));
          }
        }
      }
      patchLast((m) => ({ ...m, streaming: false }));
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        patchLast((m) => ({ ...m, streaming: false }));
      } else {
        patchLast((m) => ({
          ...m,
          streaming: false,
          content:
            m.content ||
            "Beklager, jeg fikk ikke svart nå. Sjekk tilkoblingen og prøv igjen.",
        }));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function reset() {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages([]);
    try {
      await apiFetch("/api/lokalradar/chat/reset", { method: "POST" });
    } catch {
      /* ignore */
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 md:px-8 py-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              AI-rådgiver
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Kjenner bedriften, konkurrentene og varslene dine
            </p>
          </div>
        </div>
        {!isEmpty && (
          <Button variant="outline" size="sm" onClick={reset} disabled={streaming}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Ny samtale
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center text-center pt-8 md:pt-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Din personlige rådgiver
              </h2>
              <p className="text-muted-foreground max-w-md mb-8">
                {WELCOME}
              </p>
              <div className="grid sm:grid-cols-2 gap-3 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="flex items-center gap-3 text-left text-sm p-3 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground",
                    )}
                  >
                    {m.content ||
                      (m.streaming ? (
                        <span className="inline-flex gap-1 py-1">
                          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-current" />
                        </span>
                      ) : null)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t bg-card shrink-0">
        <form
          className="max-w-3xl mx-auto flex items-end gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Spør rådgiveren …"
            rows={1}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl"
            disabled={streaming}
          />
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0 rounded-xl"
            disabled={streaming || !input.trim()}
          >
            {streaming ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
