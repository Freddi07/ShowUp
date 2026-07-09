/**
 * Mobile client for the in-dashboard AI setup assistant.
 *
 * Talks to the same backend the web widget uses (`/api/assistant/*`) but with
 * bearer-token auth. Streaming replies use `expo/fetch`, whose Response body is
 * a real ReadableStream on native — React Native's built-in fetch cannot stream
 * a response body, so we must use the Expo one here.
 */
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE, getToken } from './auth';

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ToolResult {
  name: string;
  result: Record<string, unknown>;
}

export type ChatEvent =
  | { type: 'start'; conversationId: string }
  | { type: 'text'; content: string }
  | { type: 'tool'; name: string; status: string }
  | { type: 'tool_result'; name: string; result: Record<string, unknown> }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; error: string };

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

/** List the signed-in user's conversations, newest first. */
export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE}/api/assistant/conversations`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Kunne ikke hente samtaler');
  const body = (await res.json()) as { items: ConversationSummary[] };
  return body.items;
}

/** Load one conversation's messages. */
export async function getConversation(
  id: string,
): Promise<{ id: string; title: string; messages: StoredMessage[] }> {
  const res = await fetch(`${API_BASE}/api/assistant/conversations/${id}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Kunne ikke hente samtalen');
  return (await res.json()) as {
    id: string;
    title: string;
    messages: StoredMessage[];
  };
}

/**
 * Stream a chat reply. Invokes `onEvent` for each server-sent event
 * (start/text/tool/tool_result/done/error). Resolves when the stream ends.
 */
export async function streamChat(
  params: { conversationId: string | null; message: string; signal?: AbortSignal },
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const res = await expoFetch(`${API_BASE}/api/assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify({
      conversationId: params.conversationId,
      message: params.message,
    }),
    signal: params.signal,
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
    // Accept both LF and CRLF frame boundaries so a proxy that rewrites line
    // endings doesn't break parsing.
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      for (const rawLine of frame.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        try {
          onEvent(JSON.parse(line.slice(5).trim()) as ChatEvent);
        } catch {
          // Ignore malformed frames.
        }
      }
    }
  }
}
