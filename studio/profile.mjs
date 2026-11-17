export const PROFILE_VERSION = '2026-10-07-v1';
export const PRESETS = {
  bright: {
    label: 'Bright & fresh',
    reference: 'cucumber-tomato-avocado-salad.webp',
    direction: 'Luminous food, fresh rich but realistic colours, neutral clean whites, open shadows, controlled highlights. Light warm-neutral subtly textured stone or plaster background. Match the salad reference and approved toast calibration: polished, believable home cooking.',
  },
  dark: {
    label: 'Dark & warm',
    reference: 'golden-basa-fish-tikka.webp',
    direction: 'Illuminated food against deep charcoal-brown matte textured surroundings. Soft directional light, warm spices and golden browning, restrained background colours, deep but detailed shadows. Match the fish tikka reference without imposing its orange food colour on other ingredients.',
  },
};
export const FRAMES = {
  portrait: { label: 'Portrait · 4:5', size: '1024x1280', ratio: '4:5' },
  square: { label: 'Square · 1:1', size: '1024x1024', ratio: '1:1' },
  landscape: { label: 'Landscape · 3:2', size: '1536x1024', ratio: '3:2' },
};

export class StudioError extends Error {
  constructor(message, status = 400, code = 'invalid_request') {
    super(message); this.status = status; this.code = code;
  }
}

export function validateOptions(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new StudioError('Choose a photo and an editing style.');
  const { preset = 'bright', frame = 'portrait', background = 'replace', notes = '', name = 'cookbook-photo' } = body;
  if (!Object.hasOwn(PRESETS, preset)) throw new StudioError('Choose one of the two saved styles.');
  if (!Object.hasOwn(FRAMES, frame)) throw new StudioError('Choose portrait, square, or landscape.');
  if (!['replace', 'keep'].includes(background)) throw new StudioError('Choose whether to keep or replace the background.');
  if (typeof notes !== 'string' || notes.length > 500) throw new StudioError('Keep your editing notes under 500 characters.');
  if (typeof name !== 'string' || name.length > 160) throw new StudioError('Use a shorter photo name.');
  return { preset, frame, background, notes: notes.trim(), name };
}

export function buildPrompt(options) {
  const o = validateOptions(options);
  return `Edit image 1, the user's original food photograph, for Vijaya's Kitchen cookbook.
Image 2 is a style reference only.${o.preset === 'bright' ? ' Image 3 is the approved bright & fresh calibration image, also a style reference only.' : ''} Never copy food, servingware or props from reference images.

STYLE: ${PRESETS[o.preset].direction}
Use soft directional natural-looking daylight. Adapt exposure and white balance to the input; correct unwanted colour casts while retaining believable ingredient colours. Preserve visible texture, natural moisture, irregular edges and home-cooked imperfections. Avoid artificial gloss, plastic smoothing, fluorescent greens, orange whites, heavy HDR and sharpening halos.

PRESERVE: The original dish identity, exact visible ingredient and portion counts, arrangement, doneness, seasoning, texture, food shapes, and original camera angle. Preserve the original plate or bowl, its colour, shape and pattern. For eggs, preserve the original yolk opacity and cooking differences. Do not reconstruct the meal, perfect it, reshape it, or add/remove food. No invented garnish, herbs, cheese, sauces, steam, extra ingredients, text or watermark.

BACKGROUND: ${o.background === 'keep' ? 'Keep the original background, surface and surrounding objects. Only adjust lighting and colour naturally. Extend that same surface only if needed for framing.' : 'Replace distracting surroundings, furniture, tile lines, glass table edges and any hands outside the plate with the simple surface described in STYLE. Preserve the food and servingware. Do not add decorative props, cutlery, linen or bottles.'}

COMPOSITION: ${FRAMES[o.frame].ratio} ${o.frame} photograph. Keep the dish dominant and retain the existing viewpoint. Preserve all food when framing; extend the background rather than cropping food. Leave breathing room around the servingware when possible. Keep the food inside the central square for gallery use where the composition permits.

USER REFINEMENTS (apply only to the edit; keep subject-preservation rules): ${o.notes || 'No additional changes.'}

Deliver a single finished photograph. No collage, comparison, border or text layout.`;
}

export function outputFilename(name, preset, timestamp = Date.now()) {
  const stem = name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'cookbook-photo';
  return `${stem}-${preset}-${timestamp}.webp`;
}
