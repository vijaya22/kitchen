import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import sharp from 'sharp';
import { buildPrompt, validateOptions, outputFilename } from '../profile.mjs';
import { decodeUpload, editPhoto } from '../editor.mjs';
import { createStudioServer } from '../server.mjs';

const png = await sharp({ create: { width: 256, height: 320, channels: 3, background: '#9ba178' } }).png().toBuffer();
const image = `data:image/png;base64,${png.toString('base64')}`;
const webp = await sharp(png).webp().toBuffer();
const resultJSON = { data: [{ b64_json: webp.toString('base64') }] };
const mockResponse = () => Response.json(resultJSON);

test('input validation rejects unsupported settings, oversized notes and inherited object keys', () => {
  for (const body of [{ preset: 'toString' }, { frame: '__proto__' }, { notes: 'x'.repeat(501) }, { background: 'invent' }, null]) assert.throws(() => validateOptions(body));
  assert.equal(validateOptions({}).preset, 'bright');
  assert.match(buildPrompt({ preset: 'dark', background: 'keep' }), /Keep the original background/);
  assert.doesNotMatch(buildPrompt({ preset: 'dark' }), /Image 3/);
  assert.match(outputFilename('../../Dinner.JPG', 'bright', 10), /^dinner-bright-10.webp$/);
});

test('upload decoding checks real image bytes, dimensions, and normalizes EXIF rotation', async () => {
  await assert.rejects(decodeUpload('data:image/png;base64,' + Buffer.from('<svg/>').toString('base64')));
  const small = await sharp(png).resize(64, 64).png().toBuffer();
  await assert.rejects(decodeUpload(`data:image/png;base64,${small.toString('base64')}`), /128 pixels/);
  await assert.rejects(decodeUpload('data:image/svg+xml;base64,PHN2Zy8+'));
  const rotated = await sharp(png).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const clean = await decodeUpload(`data:image/jpeg;base64,${rotated.toString('base64')}`);
  const meta = await sharp(clean).metadata();
  assert.equal(meta.width, 320); assert.equal(meta.height, 256); assert.equal(meta.exif, undefined);
});

test('bright edit sends original and both approved references with fixed export settings', async () => {
  let calls = 0;
  const result = await editPhoto({ image, name: 'My Lunch.jpg', preset: 'bright', frame: 'portrait', notes: 'Softer light' }, {
    apiKey: 'test-key', fetchImpl: async (url, request) => {
      calls++;
      assert.equal(url, 'https://api.openai.com/v1/images/edits');
      assert.equal(request.headers.Authorization, 'Bearer test-key');
      const f = request.body;
      assert.equal(f.get('model'), 'gpt-image-2'); assert.equal(f.get('size'), '1024x1280');
      assert.equal(f.get('n'), '1'); assert.equal(f.get('output_compression'), '85');
      const images = f.getAll('image[]');
      assert.deepEqual(images.map(x => x.name), ['original.jpg', 'style-reference.webp', 'approved-calibration.png']);
      assert.equal((await sharp(Buffer.from(await images[0].arrayBuffer())).metadata()).format, 'jpeg');
      assert.deepEqual(Buffer.from(await images[1].arrayBuffer()), await readFile(new URL('../../src/assets/images/cucumber-tomato-avocado-salad.webp', import.meta.url)));
      assert.match(f.get('prompt'), /Softer light/);
      return mockResponse();
    },
  });
  assert.equal(calls, 1); assert.match(result.image, /^data:image\/webp;base64,/);
  assert.equal(result.width, 256); assert.equal(result.height, 320);
  assert.match(result.filename, /^my-lunch-bright-\d+\.webp$/);
  assert.equal(result.options.preset, 'bright');
});

test('dark edits use only fish reference and carry requested frame and background', async () => {
  await editPhoto({ image, preset: 'dark', frame: 'landscape', background: 'keep' }, {
    apiKey: 'test-key', fetchImpl: async (_, { body: f }) => {
      assert.equal(f.get('size'), '1536x1024'); assert.equal(f.getAll('image[]').length, 2);
      assert.deepEqual(Buffer.from(await f.getAll('image[]')[1].arrayBuffer()), await readFile(new URL('../../src/assets/images/golden-basa-fish-tikka.webp', import.meta.url)));
      assert.match(f.get('prompt'), /Keep the original background/); return mockResponse();
    },
  });
});

test('missing key, provider failures and malformed output return useful errors without leaking upstream details', async () => {
  await assert.rejects(editPhoto({ image }, { apiKey: '' }), error => error.code === 'setup_required');
  for (const status of [401, 403, 429, 500]) {
    let calls = 0;
    await assert.rejects(editPhoto({ image }, { apiKey: 'private-key', fetchImpl: async () => { calls++; return new Response('secret-provider-details', { status }); } }), error => !error.message.includes('secret') && !error.message.includes('private-key'));
    assert.equal(calls, 1);
  }
  await assert.rejects(editPhoto({ image }, { apiKey: 'test', fetchImpl: async () => Response.json({ data: [] }) }), error => error.code === 'provider_error');
});

async function start(t, options = {}) {
  const server = createStudioServer(options);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const config = await (await fetch(`${origin}/api/config`)).json();
  return { server, origin, config, post: (body, headers = {}) => fetch(`${origin}/api/edit`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Token': config.csrf, ...headers }, body: JSON.stringify(body) }) };
}

test('HTTP routes keep keys private, reject foreign origins, bad CSRF and unknown files', async t => {
  const { origin, post, server, config } = await start(t, { apiKey: 'never-leak-this', fetchImpl: async () => mockResponse() });
  assert.equal(config.ready, true); assert.ok(!JSON.stringify(config).includes('never-leak'));
  assert.equal((await fetch(`${origin}/.env.local`)).status, 404);
  assert.equal((await fetch(`${origin}/studio/server.mjs`)).status, 404);
  assert.equal((await post({ image }, { Origin: 'https://foreign.example' })).status, 403);
  assert.equal((await post({ image }, { 'X-Studio-Token': 'wrong' })).status, 403);
  const edited = await post({ image }, { Origin: origin });
  assert.equal(edited.status, 200);
  const result = await edited.json();
  const downloaded = await fetch(`${origin}${result.downloadURL}`);
  assert.equal(downloaded.status, 200);
  assert.match(downloaded.headers.get('content-disposition'), /^attachment; filename="cookbook-photo-bright-/);
  assert.equal(downloaded.headers.get('content-type'), 'image/webp');
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), webp);
  assert.equal((await fetch(`${origin}/download/unknown`)).status, 404);
  assert.equal((await post({ image: 'not a photo' })).status, 400);
  const forbidden = await new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port: server.address().port, path: '/api/config', headers: { Host: 'attacker.example' } }, response => { resolve(response.statusCode); response.resume(); }); request.on('error', reject); request.end();
  });
  assert.equal(forbidden, 403);
  const home = await fetch(origin); assert.equal(home.status, 200); assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('concurrent edits are rejected and the lock clears after the first completes', async t => {
  let release; let signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const { post } = await start(t, { apiKey: 'test', fetchImpl: async () => { signalStarted(); await new Promise(resolve => { release = resolve; }); return mockResponse(); } });
  const first = post({ image }); await started;
  assert.equal((await post({ image })).status, 409);
  release(); assert.equal((await first).status, 200);
  assert.equal((await post({ image: 'invalid' })).status, 400);
});

test('HTTP rejects oversized declared bodies and remains usable', async t => {
  const { server, origin, config } = await start(t);
  const status = await new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port: server.address().port, path: '/api/edit', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': 18 * 1024 * 1024, 'X-Studio-Token': config.csrf } }, response => { resolve(response.statusCode); response.resume(); });
    request.on('error', reject); request.end('{}');
  });
  assert.equal(status, 413); assert.equal((await fetch(`${origin}/api/config`)).status, 200);
});
