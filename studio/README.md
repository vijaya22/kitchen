# Kitchen photo studio

A private, local website for editing cookbook photos using Vijaya's saved style.
This app runs separately from the static Astro cookbook and is not included in
the GitHub Pages build. No photos are published to the cookbook by the studio.

## Run

Use Node.js 22.12+ and install the project's dependencies with `bun install` or
`npm install`. From the project root:

```sh
npm run studio
```

Open `http://127.0.0.1:4322`. The approved before/after example, style guide,
upload preview and example download work without an API key.

For new AI edits, copy `.env.studio.example` to `.env.local` and fill in
`OPENAI_API_KEY` using your own key. `.env.local` is ignored by Git. Never put
the key in a public environment variable or browser script. Restart the studio
after changing the file. The current workspace already has an empty `.env.local`
prepared for this step.

The API project needs billing, image-model access, and any required organization
verification. Each Create action makes one paid API call. Failed requests are
not automatically retried. A disconnected or timed-out request may still incur
provider usage; check the OpenAI account before repeating it.

## Editing behavior

- Uses `gpt-image-2` with high quality and WebP quality 85.
- Sends the original first, the selected salad/fish style reference second, and
  the approved toast calibration third for bright edits.
- Supports 1024×1280 portrait, 1024×1024 square and 1536×1024 landscape requests.
  The UI reports the actual returned dimensions.
- Food and original servingware preservation are explicit prompt rules, not a
  guarantee of pixel-identical preservation. Inspect the comparison before use.
- Uploads: still JPEG, PNG or WebP, at most 12 MB / 40 megapixels, at least
  128 pixels on each side. The server rotates from EXIF, strips metadata and
  normalizes to a maximum 2048-pixel input before sending to OpenAI.
- Original and edited photos are held in memory. Up to eight completed edits
  remain in the current browser session. Download before refreshing or closing.
- No uploads or generated results are written to the server filesystem. The
  bundled sample assets are the only fixed example photos.
- The server keeps the last eight export files in memory for reliable browser
  downloads. These download links expire when newer edits displace them or the
  studio restarts.

The prompt lives in `profile.mjs`; the editorial specification is
`../docs/cookbook-photo-style.md`. Update both when the user changes their style.

## Local privacy boundary

The server binds only to `127.0.0.1`, validates Host and Origin, requires a
same-origin request token for paid edits, bounds uploads and allows one edit at a
time. It does not serve arbitrary filesystem paths. The API key never reaches
the browser. Photos and references are sent to OpenAI when Create is clicked.

This version is for one person on their own computer. Hosting it for remote use
requires authenticated sessions, HTTPS, suitable request timeouts, shared rate
limits and secure server-side secret configuration. Do not expose this local
server through a public tunnel or change its binding to `0.0.0.0` as a substitute
for adding authentication.

## Validation

```sh
npm run test:studio
npm run build
```

Server tests use a controlled mock for the paid upstream API; they do not spend
credits. A successful mocked edit verifies image validation, reference order,
prompt generation, export decoding and HTTP integration, not live account access.

API implementation checked against the [OpenAI image edit reference](https://developers.openai.com/api/reference/resources/images/methods/edit)
and [GPT Image 2 documentation](https://developers.openai.com/api/docs/models/gpt-image-2).
