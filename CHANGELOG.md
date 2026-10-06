# Changelog

## 1.1.0 — 2026-10-06

- Add local, editable-name counts-only inspection summary JSON with explicit completeness, cleanup restrictions, and verified before/after counts. Omit document values, names, paths, URLs, and errors; unknown counts are null.
- Reject ambiguous duplicate normalized ZIP entry names instead of silently choosing one entry; mark missing required Word document parts as partial and cleanup-blocked.
- Guard cleanup confirmation and summary export across source changes and in-flight cleanup.
- Add automated synthetic ZIP, Office fixture, report privacy, and lifecycle regression tests.


## 1.0.0 - Final release - 2026-09-29

- Promoted Office Privacy Inspector to the first stable release after the v0.9.x release-candidate UX pass.
- After **Create cleaned copy / クリーンアップしてコピーを作成** completes reinspection, the page now scrolls to the **Cleanup and reinspection complete / クリーンアップして再検査しました** result.
- Finalized README / README.ja.md using the Browser Kitty repository format with GitHub Pages, single-HTML usage, supported-file matrix, cleanup behavior, privacy, limitations, build, and dependency sections.
- Finalized release screenshots, app version metadata, standalone HTML, self-extracting HTML, and v1.0.0 regression documentation.
- Kept the v0.9.1 finding navigation, punctuation-only metadata clarity, mobile actions, inspection-only reliability safeguards, and automatic post-cleanup reinspection.

## 0.9.1 - Metadata value clarity / finding scroll UX - 2026-09-29

- Clarified punctuation-only metadata values in the summary preview so a stored value such as `.` is visibly presented as a literal value instead of looking like a missing field.
- Changed **View findings / 確認項目を見る** to scroll to the top of the **Information to review before sharing / 共有前に確認したい情報** panel.
- Added a sticky-header-aware scroll margin so the panel border and heading remain visible after navigation.

## 0.9.0 - Release Candidate / UX / Accessibility - 2026-09-29

- Replaced the header subtitle with the app-specific purpose instead of repeating local-processing copy.
- Removed the redundant upload-screen sentence about server upload while keeping the Fully local processing badge.
- Adopted the supplied Office Privacy Inspector SVG for both the app mark and favicon.
- Fixed the help dialog layout so How to use / Notes remain fully scrollable on small screens.
- Added a summary preview that shows actual detected metadata values and finding categories near the top of the results.
- Added direct result actions for jumping to findings and creating a cleaned copy.
- Moved the main cleanup action above the cleanup options and keeps it sticky on desktop.
- Added a mobile bottom action bar for findings and cleanup without covering content.
- Preserved the v0.8.0 reliability rules, inspection-only safeguards, cleanup behavior, and automatic reinspection.

## 0.8.0 - Hard Cases / Reliability - 2026-09-26

- Detect digital-signature package parts and force signed files into inspection-only mode so cleanup cannot invalidate a signature.
- Accept DOCM / XLSM / PPTM packages for inspection while disabling cleanup for macro-enabled or VBA / ActiveX-related packages.
- Distinguish encrypted OOXML compound files from legacy binary Office files that were merely renamed with an OOXML extension.
- Detect duplicate Relationship IDs and keep ambiguous packages inspection-only.
- Separate optional XML / relationship parse failures from whole-file failures, show a partial-inspection warning, and never treat uninspected content as clear.
- Harden XML parsing against DOCTYPE / ENTITY declarations and unusual namespace prefixes while preserving namespace-based inspection.
- Add cooperative yields during large relationship / slide / sheet scans and cancel stale FileReader work when another file is selected or the page is reset.
- Add reliability regression fixtures for signatures, macros, malformed optional XML, malformed document XML, duplicate relationships, unusual namespaces, encrypted compound files, and disguised legacy Office files.
- Keep the original Office file unchanged and retain the v0.7.0 automatic reinspection flow for packages that are safe to rewrite.

## 0.7.0 - Reinspection / Before & After - 2026-09-26

- Added automatic full reinspection of every generated cleaned DOCX / XLSX / PPTX copy.
- Added Before / After finding counts and a reduced-findings count after cleanup.
- Added a remaining-findings summary grouped by metadata and format-specific inspection category.
- Added verification that selected cleanup targets are absent after successful reinspection.
- Added an explicit partial-result warning when the cleaned copy is created but reinspection cannot be completed.
- Added editable output file names while preserving the original Office extension.
- Added clear save-start feedback with the actual output file name.
- Preserved cleanup results and user selections across Japanese / English language switching.
- Added regression coverage for metadata cleanup, DOCX comments / RSID, PPTX comments / speaker notes, remaining findings, renamed downloads, and mobile completion layout.

## 0.6.0 - Comments / Notes Cleanup - 2026-09-26

- Added DOCX comment cleanup, removing comment parts, references, relationships, content-type overrides, and related modern comment metadata while preserving the commented document text.
- Added PPTX comment cleanup, including comment parts, author/person metadata, relationships, and content-type overrides.
- Added PowerPoint speaker-note cleanup per slide plus an explicit remove-all-notes option.
- Added comment / note previews in the cleanup selection UI; comments and speaker notes remain unchecked by default.
- Added confirmation dialogs for all-comment cleanup and remove-all-speaker-notes cleanup.
- Extended ZIP rebuilding to delete selected OOXML parts while preserving unchanged binary entries byte-for-byte.
- Added internal post-cleanup reinspection to reject output when selected comments or notes remain unexpectedly.
- Added two-slide speaker-note regression coverage and verified selective removal preserves the unselected note.
- Verified cleaned DOCX / PPTX files reopen with Office-compatible libraries, slide counts remain unchanged, and media / embedded binary content is preserved.

## 0.5.0 - Safe Metadata Cleanup - 2026-09-26

- Added selective cleanup for Creator, Last Modified By, Last Printed, Company, Manager, and Total Editing Time.
- Added individually selectable Custom Property removal, defaulting to OFF.
- Added DOCX RSID cleanup, defaulting to ON when editing-session information is detected.
- Added a cleanup-selection UI and explicit `-cleaned` copy generation without overwriting the original file.
- Added a ZIP rebuild path that rewrites only changed XML entries and copies unchanged compressed entries byte-for-byte.
- Added structural verification of rebuilt OOXML packages before exposing the cleaned copy for saving.
- Added cleanup regression coverage for metadata removal, RSID removal, Custom Properties, and binary/media preservation.
- Kept comments, tracked changes, hidden data, external references, speaker notes, embedded objects, and other higher-impact findings detection-only.

## 0.4.0 - PPTX Inspector - 2026-09-26

- Added PowerPoint comment inspection with slide association, authors, dates, and comment text.
- Added speaker notes inspection with slide association, character counts, and text previews.
- Added hidden slide detection with slide number and best-effort title extraction.
- Added off-slide object detection using presentation slide dimensions and object bounds.
- Added external relationship discovery across PowerPoint parts.
- Added embedded object, Custom XML, and suspicious VBA / ActiveX-related part discovery for normal PPTX packages.
- Added a dedicated PowerPoint findings UI with Japanese / English copy.
- Added PPTX regression fixtures for each v0.4.0 inspection category.
- Kept v0.4.0 inspection-only; Office files are not modified.

## 0.3.0 - XLSX Inspector - 2026-09-26

- Added hidden and Very Hidden worksheet detection.
- Added hidden row and hidden column inspection with compact range summaries.
- Added external relationship and external formula detection, including chart formulas.
- Added review of hidden / external workbook defined names.
- Added workbook connection inspection while masking connection-string contents in the UI.
- Added Pivot Cache and Slicer Cache discovery.
- Added embedded object and suspicious VBA / ActiveX-related part discovery for normal XLSX packages.
- Added a dedicated Excel findings UI with Japanese / English copy.
- Added XLSX regression fixtures for each v0.3.0 inspection category.
- Kept v0.3.0 inspection-only; Office files are not modified.

## 0.2.0 - DOCX Inspector - 2026-09-26

- Added Word comment inspection with author, date, and comment text.
- Added tracked-change detection for insertions, deletions, moves, and property/format changes.
- Added hidden-text detection for direct `w:vanish` formatting and hidden character styles.
- Added editing-session information (RSID) detection.
- Added external relationship and attached-template inspection.
- Added embedded object and Custom XML discovery without decoding embedded binary content.
- Added a dedicated Word findings UI with Japanese / English copy and responsive long-value handling.
- Added DOCX regression fixtures for each v0.2.0 inspection category.
- Kept v0.2.0 inspection-only; Office files are not modified.

## 0.1.0 - OOXML Foundation / Core Properties - 2026-09-26

- Started Office Privacy Inspector from the Browser Kitty htmlapps-template v1.3.0 structure.
- Added DOCX / XLSX / PPTX file selection and drag-and-drop inspection.
- Added dependency-free OOXML ZIP directory parsing with browser-native deflate decompression.
- Added Core Properties, Extended Properties, and Custom Properties inspection.
- Added Japanese / English UI, responsive mobile layout, loading / result / empty / error states, help, and reset confirmation.
- Kept runtime network access blocked with `connect-src 'none'` and no external runtime dependency.

## 1.3.0 - Build preflight, canonical app icon, and mobile help hardening - 2026-09-06

- Added `scripts/check-powershell-syntax.ps1` and run it before local / CI builds to catch parser errors before repository checks.
- The preflight also rejects BOM-less PowerShell source containing non-ASCII bytes, preventing Windows PowerShell 5.1 mojibake from turning localized strings into syntax failures.
- Added `assets/favicon.svg` as the canonical icon source. The readable build now embeds the exact same SVG payload for both the browser favicon and upper-left application brand icon, and verification rejects drift between them.
- Reworked the help dialog into a viewport-bounded flex layout with a dedicated scroll body and safe-area-aware bottom padding so long Japanese / English help remains reachable on smartphones.
- Documented `Set-StrictMode` collection normalization (`@(...)` before `.Count`) and expanded release / offline checks for the new guardrails.
- Kept canonical favicon/header-icon verification mandatory for real standalone builds while allowing explicitly marked synthetic verifier fixtures to omit product chrome.

## 1.2.2 - WebRTC DataChannel-ready connection gate - 2026-09-01

- Application `onConnected` now waits for both PeerConnection `connected` and the designated readiness DataChannel `open`.
- Added `readyChannelLabel` / `requireReadyChannelOpen` for custom DataChannel layouts.
- Added repository regression checks for the readiness contract.
- Updated bilingual WebRTC/component/template guidance.

## 1.2.1 - Dependency update check collection fix - 2026-08-31

- Fixed dependency collection normalization in `check-dependency-updates.ps1`, `sync-dependency-lock.ps1`, and `update-dependency.ps1`; an empty `dependencies.json` now remains a zero-length array under `Set-StrictMode` instead of becoming `$null`.
- Added repository regression coverage for both zero dependencies and a single disabled dependency without making npm network requests.

## 1.2.0 - Dependency lifecycle and Issue-based update monitoring - 2026-08-29

- Added committed `dependencies.lock.json` tarball SHA-256 locking and build-time mismatch rejection.
- Added `patch` / `minor` / `major` / `manual` dependency update policies without allowing scheduled jobs to change source automatically.
- Added local PowerShell commands to check updates, synchronize lock entries, and apply a reviewed update with asset validation, standalone build verification, and config/lock rollback on failure.
- Added a weekly GitHub Actions workflow that creates or refreshes one dependency maintenance Issue, closes it when no tracked updates remain, and never creates an automatic dependency pull request.
- Added bilingual dependency lifecycle documentation and updated security, architecture, contributor, README, and LLM guidance.

## 1.1.0 - Reusable fully serverless WebRTC QR pairing - 2026-08-29

- Added `components/webrtc-qr-pairing.html`, a reusable host/joining-device pairing UI and controller based on the connection flow hardened in Wireless Sensor v1.0.0.
- Added manual QR/copy signaling with `iceServers: []`, complete ICE gathering before QR generation, candidate diagnostics, stale-attempt cleanup, and delayed joining-side Answer creation.
- Added low-resolution camera handling, native `BarcodeDetector` with embedded `jsQR` fallback, chunked QR transfer, and pre-connect Answer regeneration.
- Added `examples/dependencies.webrtc-qr.json` with pinned `qrcode-generator` and `jsqr` assets for the standalone build pipeline.
- Added bilingual WebRTC pairing documentation, custom DataChannel hooks, protocol-prefix customization, privacy wording, limitations, and real-device release tests.
- Updated template guidance so future apps reuse the canonical WebRTC pairing component instead of rebuilding manual signaling from scratch.

## 1.0 - Smartphone bottom-tab page switching - 2026-08-24

- Extended `components/mobile-bottom-bar.html` with a canonical mobile page-tab mode using `data-mobile-page-target`.
- Added `.app-mobile-page` / `.is-mobile-active` behavior: smartphones show only the selected page while desktop keeps every section in normal document flow.
- Added `showPage()` / `currentPage()` APIs so app workflows can switch tabs programmatically.
- Kept the existing section-scroll (`data-mobile-target`) and workflow-action (`data-mobile-action`) modes for backward compatibility.
- Updated LLM/product guidance to prefer bottom-tab page switching for long smartphone tools that naturally divide into 3-5 groups.

## 1.0 - Browser-Kitty UX and asset pipeline hardening - 2026-08-20

- Removed the second Base64 layer around the complete embedded asset bundle; asset payloads are now Base64-encoded exactly once.
- Added per-asset `none` / `gzip` / `auto` compression, async decompression APIs, and per-asset original/stored byte metadata.
- Added `build-size-report.json` plus configurable warning-only readable/self-extract size budgets.
- Added reusable Toast + Undo, compact popover menu, preset + custom numeric setting, and async source-generation/state components.
- Updated starter export UX with a user-editable output filename, fixed extension handling, invalid-character sanitization, and fallback naming.
- Added template rules for source-change invalidation, stale async result rejection, explicit heavy-processing phases, mobile preview/control proximity, portrait media geometry/orientation, and compact advanced settings.
- Added finished-app README guidance and repository checks for the new components and asset-bundle contract.


## 1.0 - Reusable mobile bottom navigation / action bar - 2026-08-19

- Added `components/mobile-bottom-bar.html` as the canonical fixed smartphone navigation / workflow action pattern.
- Added safe-area-aware 3-5 item layout, icon + label controls, native disabled states, section scrolling, active-section tracking, and application action hooks.
- Documented when to use a bottom bar versus an in-flow primary button, including the pattern of enabling Save / Share only after a valid result exists.
- Updated LLM guidance, product UX guidance, bilingual README files, and repository checks so future apps discover and reuse the component instead of rebuilding it ad hoc.

## 1.0 - Portable PowerShell build verification - 2026-08-17

- Removed the builder's dependency on `Get-FileHash` and now calculate file SHA-256 hashes through the .NET cryptography API.
- Replaced `::new()` constructor syntax in self-extract build/verification scripts with older-compatible construction syntax.
- Changed standalone placeholder verification to reject only the real build placeholders instead of every `__UPPERCASE__` runtime identifier.
- Added repository regression guards so future template changes cannot reintroduce `Get-FileHash`, `::new()`, or the generic placeholder false positive.

## 1.0 - Self-extract loader robustness - 2026-08-17

- Made `scripts/build-self-extract.ps1` ASCII-only so Windows PowerShell 5.1 cannot corrupt Japanese loader text when the script is stored as BOM-less UTF-8.
- Encoded non-ASCII loader copy and application titles into ASCII-safe HTML character references / JavaScript Unicode escapes.
- Inherited the embedded favicon from the normal standalone HTML into `dist/index.self-extract.html`.
- Added regression checks for ASCII-only loader output, embedded favicon presence and exact favicon inheritance, and the existing byte-for-byte gzip payload restoration.
- Added a repository guard that rejects non-ASCII text in the self-extract builder source.

## 1.0 - Reusable mobile confirmation component - 2026-08-15

- Added `components/confirm-dialog.html`, a dependency-free Promise-based confirmation dialog.
- Added centered desktop and safe-area-aware smartphone bottom-sheet presentations.
- Added destructive-action styling, backdrop/Esc cancellation, keyboard focus handling, and focus restoration.
- Integrated the confirmation component into the starter Clear action as the recommended pattern.
- Added bilingual reusable-component documentation and updated LLM guidance to prefer it over `window.confirm()`.

## 1.0 - Self-extracting build - 2026-08-05

- Added `dist/index.self-extract.html`, generated by gzip-compressing the normal standalone HTML.
- Added native browser restoration with `DecompressionStream`, no runtime dependency, and no network access.
- Added byte-for-byte payload verification, size/hash manifest, CI artifact upload, and documentation.
- Kept `dist/index.html` as the default GitHub Pages entry point.

## 1.0 - Pages setup fix - 2026-08-05

- Prevented the first GitHub Actions run from failing when GitHub Pages has not been enabled yet.
- Added a Pages preflight check and a clear workflow summary with the one-time setup steps.
- Kept the generated standalone HTML available as a normal Actions artifact even when deployment is skipped.

## 1.0 - 2026-08-05

- Promoted the template to version 1.0.
- Removed the filled backgrounds and borders from the header language and help controls.
- Kept the compact bilingual help dialog and the PDF Organizer-inspired light interface.
- Added LLM guidance requiring help content to stay synchronized with application behavior.

All notable changes to this template are documented here.

## 0.3.0 - 2026-08-05

- Added a compact upper-right help button modeled after PDF Organizer.
- Added a bilingual native dialog for usage, privacy, limitations, and offline notes.

## [0.1.0] - 2026-08-04

### Added

- Generic single-HTML builder with exact npm package and asset embedding.
- SHA-256 dependency manifest.
- Runtime no-network Content Security Policy.
- Responsive bilingual starter interface with local persistence and export.
- GitHub Actions for build validation and GitHub Pages deployment.
- LLM implementation contract, product specification, architecture, and workflow guides.
