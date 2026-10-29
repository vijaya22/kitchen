# Vijaya's Kitchen photo editing profile

Status: the user approved the bright / fresh calibration edit on 2026-10-07.
The dark / warm variation remains based on the user-selected fish tikka reference.

## Reference images

- Dark / warm: `src/assets/images/golden-basa-fish-tikka.webp`, used by
  `src/content/recipes/golden-basa-fish-tikka.md`.
- Bright / fresh: `src/assets/images/cucumber-tomato-avocado-salad.webp`, used by
  `src/content/recipes/cucumber-tomato-avocado-salad.md`.

Both reference files are WebP, 1122 × 1402 pixels (approximately 4:5 portrait).
Use the actual reference images with the editing model, not just this description.
They provide visual style guidance; do not copy their ingredients or servingware
into a different dish.

## Shared visual target

- Photographic, appetising home-cooked food with a polished cookbook finish.
- Overhead or near-overhead composition, with the food as the dominant subject.
- Directional, soft, natural-looking light; retain shadows that give food depth.
- Rich but credible ingredient colours, neutral whites, and visible natural
  texture. Avoid fluorescent greens, an orange cast on whites, artificial shine,
  plastic smoothing, heavy HDR, and sharpening halos.
- Simple textured backgrounds that support the food's colours.
- Keep attention on the dish. Do not add decorative props by default.

## Two variations

| Parameter | Bright / fresh | Dark / warm |
| --- | --- | --- |
| Visual reference | Cucumber Tomato Avocado Salad | Golden Basa Fish Tikka |
| Background target | Light warm-neutral stone or plaster | Dark charcoal-brown matte texture |
| Tonal balance | Luminous food, open shadows, controlled highlights | Illuminated food against deeper background shadows |
| Colour emphasis | Fresh greens, clear reds, clean whites | Golden browning, warm spices, subdued surroundings |
| Texture | Crisp vegetables and natural moisture | Toasted edges, spice coating, uneven cooked surfaces |

Select the variation that best fits the dish and original servingware, unless the
user specifies one. This is a proposed default, not a requirement to make every
salad bright or every cooked dish dark.

## Preservation rules

- Preserve the dish's identity, visible ingredients, portion count, arrangement,
  doneness, and characteristic imperfections.
- Preserve the original plate or bowl, including its colour, shape, and pattern,
  unless the user requests a change.
- Do not invent garnish, cheese, sauces, ingredients, steam, or extra food.
- Keep the original viewing angle where possible. Avoid reconstructing unseen
  food merely to imitate a reference angle.
- Save edited copies separately. Replacing a website asset is a separate action
  from producing an edit for review.

## Adaptive adjustments and export

Exposure, white balance, highlight recovery, shadow lift, saturation, and detail
must adapt to the input. Exact original editing sliders cannot be recovered from
the finished references; this profile defines the desired appearance instead.
Generative edits need visual inspection for changes to food and plate details.

Use a roughly 4:5 portrait master as the initial target. Preserve all food when
framing; extend the background rather than cropping food to force a ratio. Check
the central square crop because the site's gallery uses `object-fit: cover` in a
square container. Recipe-page crops also vary with the viewport.

The project's existing convention is a descriptive kebab-case WebP filename and
quality 85 as a starting point for conversion. Inspect the export for compression
artefacts. Let Astro produce responsive sizes. Record the actual output size and
format rather than assuming a generation prompt enforced them.

## First calibration photo: avocado toast with fried eggs

Source supplied on 2026-10-07: `WhatsApp Image 2026-10-07 at 16.40.43.jpeg`.

Proposed variation: bright / fresh.

- Preserve exactly two pieces of toast, two fried eggs, the existing avocado
  spread, seasoning, and white scalloped plate with its green leaf pattern.
- Preserve the differences between the two eggs, including the more opaque
  appearance of the right yolk.
- Correct the dull green-grey cast while retaining realistic avocado colour and
  detail in the egg whites. Lift the food's brightness without bleaching it.
- Replace the visible glass table, tile lines, seating, and edge-of-frame hand
  with a simple light warm-neutral surface, matching the salad reference's mood.
- Retain the overhead perspective and arrangement. Give the plate breathing room
  in a portrait frame without shrinking the food excessively.
- Do not import the salad reference's bowl, oil bottle, linen, or ingredients.

The first calibration preview was generated on 2026-10-07 using the built-in
image generation tool: `output/imagegen/avocado-egg-toast-bright-fresh-v1.png`.
The exact prompt is saved beside it as
`output/imagegen/avocado-egg-toast-bright-fresh-v1-prompt.md`.
The user approved this sample. It is the bright / fresh calibration reference for
the photo studio, alongside the original salad reference.
