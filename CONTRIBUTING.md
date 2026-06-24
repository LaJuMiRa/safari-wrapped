# Contributing

Thanks for your interest! Contributions are welcome — bug fixes, new categories
or search engines, translations, or features.

## Setup

```bash
npm install
npm run build
```

- **Popup source:** `src-popup/` (React + Vite, builds to `extension/popup/`)
- **Wrapped story & detail pages:** `src-wrapped/` (builds to `extension/wrapped/`)
- **Tracking core:** `extension/background.js` + `extension/db.js` (vanilla JS, no build)

To test, package the extension into a Safari app and load it as described in the
[README](README.md).

## Guidelines

- **Privacy first.** No feature may let data leave the device — no external
  requests with user data, no telemetry. This is the project's core promise.
- Keep the existing code style. Use the design tokens (`src-popup/tokens.css`)
  instead of hard-coded colors or spacing.
- Always add new UI strings in **both** languages (`src-popup/i18n.js`).
- Run `npm run build` and do a quick check in Safari before opening a PR.

## Pull requests

1. Fork the repository and create a branch (`feature/...` or `fix/...`).
2. Make your change. For non-trivial changes, add a short explanation in the PR
   description (what, why, how to test).
3. For user-visible changes, add an entry to [`CHANGELOG.md`](CHANGELOG.md) under
   an `[Unreleased]` section.

By contributing, you agree that your contributions are licensed under the
project's [GNU GPL v3](LICENSE).
