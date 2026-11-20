# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Homebrew install no longer fails with "untrusted tap" (#1). The cask moved to
  [LaJuMiRa/homebrew-tap](https://github.com/LaJuMiRa/homebrew-tap); install with
  `brew install --cask LaJuMiRa/tap/browsing-wrapped`.
- The background script no longer reacts to its own storage writes. Before, an
  open tab caused a continuous loop of storage and database writes, which cost
  CPU and lost part of the measured time.
- After a browser restart, the last running time segment is credited once
  instead of two or three times.

### Changed
- A page visit is written to the database in one transaction instead of one per
  store and keyword.
- Popup and Wrapped story load their data in parallel.
- Builds now remove old bundles; the unused `extension/tracker.js` was removed.

## [1.0.0] – 2026-06-19

First public release.

### Added
- Local tracking of domains, visits, and real dwell time (IndexedDB).
- Capture of search queries as individual keywords (stop-words removed) from
  common search engines.
- Popup with period switcher (Today/Week/Month), top sites, category breakdown,
  and statistics.
- Full-screen **Wrapped story** (Week/Month/Year) with count-up numbers, browsing
  type, busiest weekday, grouped themes, trend vs. the previous period, confetti,
  and a "save as image" export (local PNG).
- Detail pages "All sites" and "Search terms" in their own scrollable tab.
- Bilingual UI (English / German), switchable in settings.
- Settings: pause, exclusion list, data retention, delete all data.
- Muted design system (design tokens), slate-blue accent, custom app icon.

### Privacy
- No full URLs, no full search queries, no network requests carrying user data.
  Everything stays local.

[1.0.0]: https://github.com/LaJuMiRa/safari-wrapped/releases/tag/v1.0.0
