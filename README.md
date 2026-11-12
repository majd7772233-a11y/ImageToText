# ImageToText

A local-first Arabic/English image, OCR, and document utility workspace. The project is being re-engineered from an earlier web application into a standalone desktop-friendly browser app.

## Current state

This is an initial source import, not a finished release. The existing UI and tool handlers are still under review. Legacy service integrations have not yet all been removed, and some conversion tools are placeholders or incomplete. Do not treat every visible tool as production-ready.

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

The pinned npm dependency graph includes PDF, DOCX, spreadsheet, QR/barcode, OCR, and ZIP libraries. `node_modules/` is intentionally excluded from Git; install from `package-lock.json`.

## Direction

- Remove legacy cloud, CAPTCHA, billing/subscription, tracking, and review integrations.
- Rebuild the interface as a multi-screen Liquid Glass workspace, with one dedicated screen per tool.
- Make all processing local and offline-capable where the format and bundled runtime permit it.
- Replace placeholder handlers with real conversions and automated tests.

## Privacy

Do not upload user documents to external services. Keep file processing in the browser and local device unless a future feature is explicitly designed otherwise.
