import { handleChat } from './handler.js';

const PORT = Number(process.env.PORT ?? 3001);

Bun.serve({
  port: PORT,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname !== '/chat') {
      return new Response('Not Found', { status: 404 });
    }
    const clientAddress = server.requestIP?.(request)?.address ?? 'dev';
    return handleChat({ request, clientAddress });
  },
});

console.log(`Chat dev server listening on http://localhost:${PORT}/chat`);
