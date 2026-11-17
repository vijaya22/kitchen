import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { PRESETS, FRAMES, PROFILE_VERSION, StudioError, buildPrompt, outputFilename, validateOptions } from './profile.mjs';

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const imageRoot = new URL('../src/assets/images/', import.meta.url);
const approvedToast = new URL('./public/assets/approved-toast.png', import.meta.url);

export async function decodeUpload(dataURL) {
  if (typeof dataURL !== 'string') throw new StudioError('Please upload a JPEG, PNG, or WebP photo.');
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataURL);
  if (!match || match[2].length % 4 !== 0) throw new StudioError('Please upload a JPEG, PNG, or WebP photo.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new StudioError('Choose a photo smaller than 12 MB.', 413);
  try {
    const meta = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages || 1) !== 1) throw new Error('unsupported');
    if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 128) throw new StudioError('Choose a photo at least 128 pixels wide and tall.');
    // Normalize orientation, remove location/EXIF metadata and bound API input size.
    return await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer();
  } catch (error) {
    if (error instanceof StudioError) throw error;
    throw new StudioError('This photo could not be opened. Use a still JPEG, PNG, or WebP under 40 megapixels.');
  }
}

export async function editPhoto(body, { apiKey, fetchImpl = fetch, timeoutMs = 180_000, signal } = {}) {
  const options = validateOptions(body);
  const original = await decodeUpload(body.image);
  if (!apiKey) throw new StudioError('Add your OpenAI API key to .env.local and restart the studio to enable new edits.', 503, 'setup_required');
  const form = new FormData();
  form.append('model', 'gpt-image-2');
  form.append('image[]', new Blob([original], { type: 'image/jpeg' }), 'original.jpg');
  form.append('image[]', new Blob([await readFile(new URL(PRESETS[options.preset].reference, imageRoot))], { type: 'image/webp' }), 'style-reference.webp');
  if (options.preset === 'bright') form.append('image[]', new Blob([await readFile(approvedToast)], { type: 'image/png' }), 'approved-calibration.png');
  const prompt = buildPrompt(options);
  form.append('prompt', prompt);
  form.append('n', '1');
  form.append('size', FRAMES[options.frame].size);
  form.append('quality', 'high');
  form.append('output_format', 'webp');
  form.append('output_compression', '85');
  const timeout = AbortSignal.timeout(timeoutMs);
  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/images/edits', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      if (response.status === 401) throw new StudioError('The API key was not accepted. Check .env.local and restart the studio.', 502, 'invalid_key');
      if (response.status === 403) throw new StudioError('This API project does not have image-editing access. Check model access and organization verification in OpenAI.', 502, 'access_denied');
      if (response.status === 429) throw new StudioError('The API is at its usage or billing limit. Check your account, then try again.', 429, 'rate_limited');
      throw new StudioError('The image service could not complete this edit. Your original is still here. Please try again.', 502, 'provider_error');
    }
    const result = await response.json();
    const encoded = result?.data?.[0]?.b64_json;
    if (typeof encoded !== 'string' || encoded.length > 40_000_000) throw new Error('invalid_result');
    const bytes = Buffer.from(encoded, 'base64');
    const meta = await sharp(bytes, { limitInputPixels: 12_000_000 }).metadata();
    if (meta.format !== 'webp' || !meta.width || !meta.height) throw new Error('invalid_result');
    return { image: `data:image/webp;base64,${encoded}`, filename: outputFilename(options.name, options.preset), width: meta.width, height: meta.height, bytes: bytes.length, options, profileVersion: PROFILE_VERSION, prompt };
  } catch (error) {
    if (error instanceof StudioError) throw error;
    if (timeout.aborted) throw new StudioError('The edit took too long. It may still finish at the provider. Check usage before trying again.', 504, 'timeout');
    if (signal?.aborted) throw new StudioError('The connection was closed. The provider may still process the edit.', 499, 'cancelled');
    throw new StudioError('The image service returned no usable photo. Your original is safe; please try again.', 502, 'provider_error');
  }
}
