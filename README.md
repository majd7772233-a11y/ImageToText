# ImageToText

A local-first Arabic/English image, OCR, and document utility workspace. The project is being re-engineered from an earlier web application into a standalone desktop-friendly browser app.

## Current state

The first interface redesign pass adds a searchable multi-screen workspace, dedicated tool pages, responsive navigation, and a dark Liquid Glass visual system. The existing conversion handlers remain in place and are still being audited. Legacy service integrations have not yet all been removed, and some conversion tools are placeholders or incomplete. Do not treat every visible tool as production-ready.

## Local development

Requirements: Node.js 24+ and Python 3.14+ (Git is used for version control).

```powershell
npm install
python -m http.server 8000
```

Open `http://localhost:8000` in a browser. The app is static HTML/CSS/JavaScript; the Python server only serves local files. No application backend is required by this development server.

## Local OCR assets

`vendor/tesseract/` and `vendor/tesseract-core/` contain local Tesseract.js browser runtime assets. `tessdata/` contains Arabic and English trained data files. The next integration step is to wire these explicit local paths into OCR worker creation and validate operation with the network disabled.

## Dependencies

The pinned npm dependency graph includes PDF, DOCX, spreadsheet, QR/barcode, OCR, and ZIP libraries. `node_modules/` is intentionally excluded from Git; install from `package-lock.json`. Run `npm test` for the built-in Node test suite.

## Direction

- Remove legacy cloud, CAPTCHA, billing/subscription, tracking, and review integrations.
- Rebuild the interface as a multi-screen Liquid Glass workspace, with one dedicated screen per tool.
- Make all processing local and offline-capable where the format and bundled runtime permit it.
- Replace placeholder handlers with real conversions and automated tests.

## Liquid Glass rendering level

The main browser interface uses CSS backdrop transmission/blur, layered tint, contour highlights, and depth cues (L1). The home hero also contains a self-contained WebGL2 lens scene: the app owns that scene and visibly displaces its own rendered backdrop inside a curved mask (localized L2 visual). It does not sample or refract arbitrary DOM/page content, and it does not implement L3 merging/morphing. When WebGL2 is unavailable, the hero uses a CSS visual fallback. Semantic text and controls remain crisp; reduced-motion, reduced-transparency, and responsive fallbacks are included.

## Privacy

The target architecture is local-first. This UI pass does not complete the removal of legacy network integrations from the earlier application; that remains a separate required audit before claiming fully offline operation. Do not treat the current build as guaranteed offline.
