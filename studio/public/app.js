const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const labels = { bright: 'Bright & fresh', dark: 'Dark & warm' };
const frameLabels = { portrait: 'Portrait', square: 'Square', landscape: 'Wide' };
const state = {
  ready: false, csrf: '', busy: false, loading: false, view: 'after', history: [],
  original: '/assets/original-toast.jpeg', originalSize: { width: 900, height: 1600 },
  upload: null, name: 'Avocado & egg toast',
  result: { image: '/assets/approved-toast.png', downloadURL: '/download/example', width: 1122, height: 1402, filename: 'avocado-egg-toast-bright-fresh-example.png', options: { preset: 'bright', frame: 'portrait', background: 'replace', notes: '' }, example: true },
};
const form = $('#edit-form');
const setup = $('#setup-dialog');
const fileInput = $('#file-input');
let loadVersion = 0;

function announce(message, error = false) {
  const el = $('#status-message'); el.textContent = message; el.classList.toggle('error', error); el.hidden = !message;
}

function options() {
  const values = new FormData(form);
  return { preset: values.get('preset'), frame: values.get('frame'), background: values.has('replaceBackground') ? 'replace' : 'keep', notes: values.get('notes').trim(), name: state.name };
}

function showPage(page) {
  if (!['editor', 'guide', 'history'].includes(page)) return;
  for (const el of $$('.page')) el.hidden = el.id !== `${page}-page`;
  for (const el of $$('.nav-item')) {
    const active = el.dataset.page === page;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  }
  $('#page-name').textContent = { editor: 'Photo editor', guide: 'Your style guide', history: 'Recent edits' }[page];
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderPreview() {
  const result = state.result;
  if (!result && state.view !== 'before') state.view = 'before';
  const originalMode = state.view === 'before';
  const size = originalMode ? state.originalSize : result;
  $('#preview-title').textContent = state.name;
  $('#example-badge').hidden = !result?.example;
  $('#preview-image').src = originalMode ? state.original : result.image;
  $('#preview-image').alt = `${originalMode ? 'Original' : 'Edited'} photo: ${state.name}`;
  $('#original-image').src = state.original;
  $('#image-frame').style.aspectRatio = `${size.width} / ${size.height}`;
  $('#image-frame').classList.toggle('wide', size.width / size.height > 1.2);
  const compare = state.view === 'compare';
  for (const id of ['#comparison-layer', '#compare-line', '#compare-control']) $(id).hidden = !compare;
  $('#image-meta').textContent = `${size.width} × ${size.height} · ${originalMode ? 'Original' : result.example ? 'Portrait' : 'WebP'}`;
  $('#stage-label').textContent = originalMode ? 'Original photo' : `✧ ${labels[result.options.preset]}`;
  $('#download-button').disabled = !result || state.busy;
  $('#download-label').textContent = result?.example ? 'Download example' : 'Download WebP';
  for (const button of $$('[data-view]')) {
    button.disabled = state.busy || (!result && button.dataset.view !== 'before');
    button.classList.toggle('selected', button.dataset.view === state.view);
    button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
  }
}

function renderHistory() {
  $('#history-count').textContent = state.history.length;
  $('#history-empty').hidden = state.history.length > 0;
  const grid = $('#history-grid'); grid.replaceChildren();
  for (const entry of state.history) {
    const card = document.createElement('button'); card.className = 'history-card';
    const image = document.createElement('img'); image.src = entry.result.image; image.alt = `Edited ${entry.name}`;
    const content = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = entry.name;
    const subtitle = document.createElement('small'); subtitle.textContent = `${labels[entry.result.options.preset]} · ${frameLabels[entry.result.options.frame]} · ${entry.time}`;
    content.append(title, subtitle); card.append(image, content);
    card.addEventListener('click', () => {
      if (state.busy || state.loading) return;
      state.original = entry.original; state.originalSize = entry.originalSize; state.upload = entry.original; state.name = entry.name; state.result = entry.result; state.view = 'after';
      const o = entry.result.options;
      form.elements.namedItem('preset').value = o.preset;
      form.elements.namedItem('frame').value = o.frame;
      form.elements.namedItem('replaceBackground').checked = o.background === 'replace';
      $('#edit-notes').value = o.notes;
      announce(''); renderPreview(); showPage('editor');
    });
    grid.append(card);
  }
}

async function checkConnection() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error();
    const data = await response.json(); state.ready = data.ready; state.csrf = data.csrf;
    $('#connection-label').textContent = state.ready ? 'AI editing connected' : 'Enable AI editing';
    $('#connection-button').classList.toggle('ready', state.ready);
    $('#generation-note').textContent = state.ready ? 'Each new edit uses your OpenAI API account.' : 'Explore the example. Connect your key to edit.';
    return true;
  } catch {
    state.ready = false;
    $('#connection-label').textContent = 'Server unavailable';
    $('#connection-button').classList.remove('ready');
    $('#generation-note').textContent = 'Restart the studio to reconnect.';
    return false;
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('This file could not be read. Try choosing it again.')); reader.readAsDataURL(file);
  });
}

function imageDimensions(url) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error('This photo could not be opened. Try a JPEG, PNG, or WebP.')); image.src = url;
  });
}

async function loadPhoto(file) {
  if (!file || state.busy) return;
  showPage('editor');
  const version = ++loadVersion;
  state.loading = true; $('#generate-button').disabled = true;
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Please choose a JPEG, PNG, or WebP. Export HEIC photos as JPEG first.');
    if (file.size > 12 * 1024 * 1024) throw new Error('This photo is over 12 MB. Please choose a smaller copy.');
    const data = await readFile(file);
    const size = await imageDimensions(data);
    if (size.width * size.height > 40_000_000) throw new Error('Please choose a photo under 40 megapixels.');
    if (Math.min(size.width, size.height) < 128) throw new Error('Please choose a photo at least 128 pixels wide and tall.');
    if (version !== loadVersion) return;
    state.original = data; state.upload = data; state.originalSize = size; state.name = file.name.replace(/\.[^.]+$/, '').slice(0, 150); state.result = null; state.view = 'before';
    renderPreview(); announce('Photo ready. Choose your look and create your cookbook photo.');
  } catch (error) {
    if (version === loadVersion) announce(error.message, true);
  } finally {
    if (version === loadVersion) { state.loading = false; $('#generate-button').disabled = false; }
    fileInput.value = '';
  }
}

function setBusy(busy) {
  state.busy = busy;
  for (const control of [...form.elements, ...$$('.new-photo'), $('#dropzone')]) control.disabled = busy;
  $('#busy-overlay').hidden = !busy;
  $('#image-stage').setAttribute('aria-busy', String(busy));
  $('#generate-label').textContent = busy ? 'Editing your photo…' : 'Create cookbook photo';
  renderPreview();
}

async function createEdit(event) {
  event.preventDefault();
  if (state.busy || state.loading) return;
  if (!state.ready) { $('#setup-status').textContent = ''; setup.showModal(); return; }
  const editOptions = options();
  announce(''); setBusy(true);
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed += 1;
    $('#busy-message').textContent = elapsed < 30 ? 'Applying your house style…' : elapsed < 85 ? 'Working on the light, colour and texture…' : 'Still working. Keeping your original safe…';
  }, 1000);
  try {
    if (!state.upload) {
      const response = await fetch(state.original);
      if (!response.ok) throw new Error('The original example could not be loaded. Try uploading a photo.');
      state.upload = await readFile(await response.blob());
    }
    const response = await fetch('/api/edit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Token': state.csrf },
      body: JSON.stringify({ image: state.upload, ...editOptions }),
      signal: AbortSignal.timeout(210_000),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.code === 'setup_required' || result.code === 'invalid_key') await checkConnection();
      throw new Error(result.error || 'The edit could not be completed. Please try again.');
    }
    await imageDimensions(result.image);
    state.result = result; state.view = 'after';
    state.history.unshift({ result, original: state.upload, originalSize: state.originalSize, name: state.name, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    state.history = state.history.slice(0, 8);
    renderHistory();
    announce('Your photo is ready. Compare it with the original, then download the version you love.');
  } catch (error) {
    announce(error.name === 'TimeoutError' ? 'The edit took too long. The provider may still process it; check usage before trying again.' : error.message || 'The connection was interrupted. Your original is still here.', true);
  } finally {
    clearInterval(timer); $('#busy-message').textContent = 'Applying your house style…'; setBusy(false);
  }
}

for (const button of $$('[data-page]')) button.addEventListener('click', () => showPage(button.dataset.page));
for (const button of $$('.new-photo')) button.addEventListener('click', () => { if (!state.busy) fileInput.click(); });
for (const button of $$('[data-view]')) button.addEventListener('click', () => { state.view = button.dataset.view; renderPreview(); });
for (const button of $$('.use-style')) button.addEventListener('click', () => {
  if (state.busy) return;
  form.elements.namedItem('preset').value = button.dataset.preset; showPage('editor');
  announce(`${labels[button.dataset.preset]} selected for your next edit.`);
});
$('#dropzone').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => loadPhoto(fileInput.files[0]));
for (const name of ['dragenter', 'dragover']) $('#dropzone').addEventListener(name, (event) => { event.preventDefault(); if (!state.busy) $('#dropzone').classList.add('dragging'); });
for (const name of ['dragleave', 'drop']) $('#dropzone').addEventListener(name, (event) => { event.preventDefault(); $('#dropzone').classList.remove('dragging'); });
$('#dropzone').addEventListener('drop', (event) => loadPhoto(event.dataTransfer.files[0]));
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());
$('#compare-slider').addEventListener('input', (event) => {
  const value = Number(event.target.value); $('#comparison-layer').style.clipPath = `inset(0 ${100 - value}% 0 0)`; $('#compare-line').style.left = `${value}%`;
});
$('#download-button').addEventListener('click', () => {
  if (!state.result) return;
  // Blob URLs avoid browser limits on large data-URL downloads.
  const source = state.result.downloadURL || state.result.image;
  let blobURL;
  if (source.startsWith('data:')) {
    const [header, encoded] = source.split(',');
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    blobURL = URL.createObjectURL(new Blob([bytes], { type: header.slice(5, header.indexOf(';')) }));
  }
  const link = document.createElement('a'); link.href = blobURL || source; link.download = state.result.filename; document.body.append(link); link.click(); link.remove();
  if (blobURL) setTimeout(() => URL.revokeObjectURL(blobURL), 60_000);
});
form.addEventListener('submit', createEdit);
form.addEventListener('change', () => {
  if (state.result && !state.busy) announce('Settings updated for your next edit. The preview still shows the previous version.');
});
$('#connection-button').addEventListener('click', () => {
  if (!state.ready) { $('#setup-status').textContent = ''; setup.showModal(); }
  else announce('AI editing is connected. Your API key stays on the local server.');
});
$('.dialog-close').addEventListener('click', () => setup.close());
setup.addEventListener('click', (event) => { if (event.target === setup) { const r = setup.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setup.close(); } });
$('#recheck-button').addEventListener('click', async () => {
  $('#recheck-button').disabled = true;
  const connected = await checkConnection();
  $('#recheck-button').disabled = false;
  if (connected && state.ready) { setup.close(); announce('Connected. Your studio is ready to edit.'); }
  else $('#setup-status').textContent = connected ? 'No API key found yet. Save .env.local and restart the studio.' : 'The studio is offline. Start it again, then refresh this page.';
});
window.addEventListener('beforeunload', (event) => { if (state.busy) { event.preventDefault(); event.returnValue = ''; } });
renderPreview(); renderHistory(); checkConnection();
