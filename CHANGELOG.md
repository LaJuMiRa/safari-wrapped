# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/).

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

[1.0.0]: https://github.com/LaJuMiRa/safari-rapped/releases/tag/v1.0.0
