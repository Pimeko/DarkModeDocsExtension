const toggle = document.getElementById('toggle');

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  toggle.checked = enabled;
  requestAnimationFrame(() => document.body.classList.remove('loading'));
});

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});
