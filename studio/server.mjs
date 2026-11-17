import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { editPhoto } from './editor.mjs';
import { PROFILE_VERSION, StudioError } from './profile.mjs';

const publicRoot = new URL('./public/', import.meta.url);
const staticRoutes = new Map([
  ['/', [new URL('index.html', publicRoot), 'text/html; charset=utf-8']],
  ['/app.js', [new URL('app.js', publicRoot), 'text/javascript; charset=utf-8']],
  ['/style.css', [new URL('style.css', publicRoot), 'text/css; charset=utf-8']],
  ['/favicon.svg', [new URL('favicon.svg', publicRoot), 'image/svg+xml']],
  ['/assets/original-toast.jpeg', [new URL('assets/original-toast.jpeg', publicRoot), 'image/jpeg']],
  ['/assets/approved-toast.png', [new URL('assets/approved-toast.png', publicRoot), 'image/png']],
  ['/assets/bright.webp', [new URL('../src/assets/images/cucumber-tomato-avocado-salad.webp', import.meta.url), 'image/webp']],
  ['/assets/dark.webp', [new URL('../src/assets/images/golden-basa-fish-tikka.webp', import.meta.url), 'image/webp']],
]);
const MAX_BODY = 17 * 1024 * 1024;

async function readJSON(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new StudioError('Send a JSON photo request.', 415);
  if (Number(req.headers['content-length']) > MAX_BODY) throw new StudioError('Choose a photo smaller than 12 MB.', 413);
  let length = 0; const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BODY) throw new StudioError('Choose a photo smaller than 12 MB.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new StudioError('The photo request could not be read. Please try again.'); }
}

export function createStudioServer({ apiKey = process.env.OPENAI_API_KEY, fetchImpl, timeoutMs } = {}) {
  const csrf = randomBytes(32).toString('hex');
  const downloads = new Map();
  let editing = false;
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    try {
      // Local-only by design. Host validation also prevents DNS rebinding.
      const port = server.address()?.port;
      if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host)) throw new StudioError('Open the studio using its localhost address.', 403);
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new StudioError('Open the studio on this computer to edit photos.', 403);
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (req.method === 'GET' && url.pathname === '/api/config') {
        return json(200, { ready: Boolean(apiKey), csrf, profileVersion: PROFILE_VERSION });
      }
      if (req.method === 'GET' && url.pathname.startsWith('/download/')) {
        const id = url.pathname.slice('/download/'.length);
        const saved = id === 'example'
          ? { bytes: await readFile(new URL('assets/approved-toast.png', publicRoot)), filename: 'avocado-egg-toast-bright-fresh-example.png', type: 'image/png' }
          : downloads.get(id);
        if (!saved) throw new StudioError('This download is no longer available. Keep this session open while downloading your edits.', 404);
        res.writeHead(200, { 'Content-Type': saved.type, 'Content-Disposition': `attachment; filename="${saved.filename}"`, 'Content-Length': saved.bytes.length });
        res.end(saved.bytes); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/edit') {
        const token = req.headers['x-studio-token'];
        if (typeof token !== 'string' || token.length !== csrf.length || !timingSafeEqual(Buffer.from(token), Buffer.from(csrf))) throw new StudioError('Refresh the page before editing.', 403);
        if (editing) throw new StudioError('One photo is already being edited. Please wait for it to finish.', 409, 'busy');
        editing = true;
        const controller = new AbortController();
        res.on('close', () => { if (!res.writableEnded) controller.abort(); });
        try {
          const body = await readJSON(req);
          const result = await editPhoto(body, { apiKey, fetchImpl, timeoutMs, signal: controller.signal });
          const downloadId = randomBytes(24).toString('hex');
          downloads.set(downloadId, { bytes: Buffer.from(result.image.split(',')[1], 'base64'), filename: result.filename, type: 'image/webp' });
          if (downloads.size > 8) downloads.delete(downloads.keys().next().value);
          result.downloadURL = `/download/${downloadId}`;
          if (!res.destroyed) json(200, result);
        } finally { editing = false; }
        return;
      }
      if (req.method === 'GET' && staticRoutes.has(url.pathname)) {
        const [file, type] = staticRoutes.get(url.pathname);
        const data = await readFile(file);
        res.writeHead(200, { 'Content-Type': type }); res.end(data); return;
      }
      json(404, { error: 'This page was not found.' });
    } catch (error) {
      if (res.destroyed || res.writableEnded) return;
      json(error instanceof StudioError ? error.status : 500, { error: error instanceof StudioError ? error.message : 'The studio could not finish that request.', code: error.code || 'server_error' });
    }
  });
  server.requestTimeout = 240_000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.STUDIO_PORT || 4322);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('STUDIO_PORT must be a port between 1024 and 65535.');
  const server = createStudioServer();
  server.listen(port, '127.0.0.1', () => console.log(`Kitchen photo studio: http://127.0.0.1:${port}\nNew AI edits: ${process.env.OPENAI_API_KEY ? 'connected' : 'add OPENAI_API_KEY to .env.local, then restart'}`));
}
