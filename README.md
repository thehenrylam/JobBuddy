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

Then load the extension from the generated `.output/` folder in your browser's extension manager:
- **Chrome:** go to `chrome://extensions`, enable *Developer mode*, click *Load unpacked*, select `.output/chrome-mv3/`
- **Firefox:** go to `about:debugging`, click *This Firefox*, click *Load Temporary Add-on*, select any file inside `.output/firefox-mv2/`

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
