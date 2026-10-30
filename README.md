# Docs Dark Mode

A Chrome extension that puts Google Docs in dark mode **without inverting images**.

## Why

Google Docs paints the document on `<canvas>`. Generic dark mode extensions invert that
canvas, so every picture in the document gets inverted too. This extension hooks the
canvas 2D context instead (`src/page-hook.js`): the colors Docs paints text, backgrounds,
tables and highlights with are remapped (lightness flipped, hue kept), while
`drawImage()` is never touched. Images keep their real colors.

The surrounding UI (toolbars, menus, comments, dialogs) is darkened with CSS
(`src/dark.css`), with avatars, logos and color swatches flipped back.

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** → pick this folder
4. Pin the extension and use the toggle in its popup

Toggling reloads open documents, because the canvas only picks up new colors on a fresh paint.

## Files

| File | Role |
| --- | --- |
| `src/page-hook.js` | Main-world script, remaps canvas colors |
| `src/bridge.js` | Syncs the toggle (`chrome.storage`) to the page |
| `src/dark.css` | Dark styles for the UI around the document |
| `popup/` | Toggle popup |
