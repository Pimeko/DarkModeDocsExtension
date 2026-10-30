// Isolated-world content script. chrome.storage is the source of truth for the
// toggle; this mirrors it into the page's localStorage (read synchronously by
// page-hook.js on the next load) and into the data-gdm-dark attribute that
// both the stylesheet and page-hook.js react to.
(() => {
  const CACHE_KEY = 'gdm-dark-enabled';
  const ATTR = 'data-gdm-dark';
  const root = document.documentElement;
  const mode = /\/document\/(?:u\/\d+\/)?d\//.test(location.pathname) ? 'editor' : 'list';

  // Enabled unless explicitly turned off.
  const readCache = () => {
    try {
      return localStorage.getItem(CACHE_KEY) !== '0';
    } catch {
      return true;
    }
  };

  const writeCache = (on) => {
    try {
      localStorage.setItem(CACHE_KEY, on ? '1' : '0');
    } catch {}
  };

  const applyAttr = (on) => {
    if (on) root.setAttribute(ATTR, mode);
    else root.removeAttribute(ATTR);
  };

  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    if (enabled === readCache()) return;
    writeCache(enabled);
    // Tiles already painted with the old colors can't be repainted from here.
    if (mode === 'editor' && document.querySelector('.kix-canvas-tile-content')) {
      location.reload();
    } else {
      applyAttr(enabled);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !('enabled' in changes)) return;
    const on = Boolean(changes.enabled.newValue);
    writeCache(on);
    // The document canvas only picks up new colors on a fresh paint.
    if (mode === 'editor') location.reload();
    else applyAttr(on);
  });
})();
