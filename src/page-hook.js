// Runs in the page's main world at document_start, before Google Docs' own scripts.
//
// Google Docs paints the document body on <canvas> tiles. Inverting those tiles
// (what most dark mode extensions do) also inverts every image in the document.
// Instead, we remap the colors Docs paints with (fillStyle / strokeStyle /
// shadowColor) and leave drawImage() alone, so images keep their real colors.
(() => {
  const CACHE_KEY = 'gdm-dark-enabled';
  const ATTR = 'data-gdm-dark';
  const root = document.documentElement;
  const mode = /\/document\/(?:u\/\d+\/)?d\//.test(location.pathname) ? 'editor' : 'list';

  // What pure white and pure black end up as. Everything in between is
  // interpolated on an inverted-luminance scale, so hues are preserved.
  const PAGE = [32, 33, 36]; // #202124
  const INK = [232, 234, 237]; // #e8eaed

  // Synchronous first guess from the page's localStorage (kept in sync by
  // bridge.js), so the very first paint is already dark. bridge.js corrects
  // the attribute if chrome.storage says otherwise. Enabled unless explicitly
  // turned off, so a fresh install starts dark.
  let cached = true;
  try {
    cached = localStorage.getItem(CACHE_KEY) !== '0';
  } catch {}
  if (cached) root.setAttribute(ATTR, mode);

  let enabled = false;
  const sync = () => {
    enabled = root.getAttribute(ATTR) === 'editor';
  };
  sync();
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: [ATTR] });

  const nativeFill = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
  const scratch = document.createElement('canvas').getContext('2d');
  const cache = new Map();

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const hex = (v) => Math.round(v).toString(16).padStart(2, '0');

  // Same math as `filter: invert(1) hue-rotate(180deg)`, then squeezed into
  // the PAGE..INK range: lightness flips, hue stays (red text stays red-ish,
  // a yellow highlight becomes a dark yellow, etc.).
  function remap(value) {
    let out = cache.get(value);
    if (out !== undefined) return out;

    // Let the browser normalize any CSS color into "#rrggbb" or "rgba(r, g, b, a)".
    nativeFill.set.call(scratch, '#000000');
    nativeFill.set.call(scratch, value);
    const normalized = nativeFill.get.call(scratch);

    let r, g, b, a = 1;
    let m;
    if ((m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(normalized))) {
      [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
    } else if ((m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(normalized))) {
      [r, g, b] = [m[1], m[2], m[3]].map((n) => Number(n) / 255);
      if (m[4] !== undefined) a = Number(m[4]);
    } else {
      cache.set(value, value);
      return value;
    }

    const lum2 = 2 * (0.213 * r + 0.715 * g + 0.072 * b);
    const rgb = [r, g, b].map((c, i) => {
      const inverted = clamp01(1 - lum2 + c);
      return PAGE[i] + inverted * (INK[i] - PAGE[i]);
    });

    out = a === 1
      ? `#${rgb.map(hex).join('')}`
      : `rgba(${rgb.map(Math.round).join(', ')}, ${a})`;
    cache.set(value, out);
    return out;
  }

  function patch(proto) {
    if (!proto) return;
    for (const prop of ['fillStyle', 'strokeStyle', 'shadowColor']) {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (!desc || !desc.set) continue;
      Object.defineProperty(proto, prop, {
        ...desc,
        set(value) {
          // Gradients and patterns are passed through untouched.
          desc.set.call(this, enabled && typeof value === 'string' ? remap(value) : value);
        },
      });
    }
  }

  patch(CanvasRenderingContext2D.prototype);
  patch(globalThis.OffscreenCanvasRenderingContext2D?.prototype);
})();
