import Anthropic from '@anthropic-ai/sdk';
import { getClient, MODEL, MAX_TOKENS } from './anthropic.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { checkRateLimit } from './rate-limit.js';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const MAX_HISTORY = 20;
const MAX_MESSAGE_LEN = 4000;

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'https://kitchen.vijaya.io',
];

function allowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigins();
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
  if (origin && allowed.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

function jsonError(
  status: number,
  message: string,
  origin: string | null,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

function validateMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of input) {
    if (typeof m !== 'object' || m === null) return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string' || content.length === 0) return null;
    if (content.length > MAX_MESSAGE_LEN) return null;
    out.push({ role, content });
  }
  if (out[out.length - 1].role !== 'user') return null;
  return out.slice(-MAX_HISTORY);
}

export type ChatContext = { request: Request; clientAddress?: string };

export async function handleChat(ctx: ChatContext): Promise<Response> {
  const origin = ctx.request.headers.get('origin');

  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (ctx.request.method !== 'POST') {
    return jsonError(405, 'Method not allowed', origin);
  }

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    return jsonError(400, 'Invalid JSON', origin);
  }

  const messages = validateMessages((body as { messages?: unknown })?.messages);
  if (!messages) return jsonError(400, 'Invalid messages', origin);

  const ip = ctx.clientAddress ?? 'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return jsonError(429, 'Too many requests', origin, { retryAfterSeconds: rl.retryAfterSeconds });
  }

  let client: Anthropic;
  try {
    client = getClient();
  } catch (err) {
    return jsonError(500, (err as Error).message, origin);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        const claudeStream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages,
        });
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send({ type: 'delta', text: event.delta.text });
          }
        }
        const final = await claudeStream.finalMessage();
        send({ type: 'done', stop_reason: final.stop_reason });
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) {
          send({ type: 'error', message: 'Upstream rate limit — try again in a moment.' });
        } else if (err instanceof Anthropic.APIError) {
          send({ type: 'error', message: `Upstream error (${err.status}).` });
        } else {
          send({ type: 'error', message: 'Unexpected error.' });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      ...corsHeaders(origin),
    },
  });
}
