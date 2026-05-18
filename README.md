# JobBuddy
A tool to ethically integrate AI as part of the job hunting process.

## Setup

```bash
npm install
```

## Development

Start a dev server with hot module reloading:

```bash
# Chrome
npm run dev

# Firefox
npm run dev:firefox
```

Then load the extension from the generated `.output/` folder in your browser's extension manager.

### Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` folder

### Firefox

1. Go to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on...**
4. Navigate to `.output/firefox-mv2/` — use **Cmd + Shift + .** to reveal hidden folders in the file picker
5. Select `manifest.json` and click **Open**

> **Note:** Firefox temporary add-ons are removed when Firefox closes. You'll need to reload it each session. For a permanent install, submit to the Mozilla Add-on store or self-sign with `web-ext sign`.

## Production Build

```bash
# Chrome
npm run build

# Firefox
npm run build:firefox
```

Output lands in `.output/chrome-mv3/` and `.output/firefox-mv2/` respectively.

## Package for Distribution

Produces a signed-ready zip in the project root:

```bash
# Chrome
npm run zip

# Firefox
npm run zip:firefox
```
