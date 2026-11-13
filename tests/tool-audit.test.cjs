const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const catalogMarker = "const toolCatalog = [";
const catalogOffset = html.indexOf(catalogMarker);
const scriptTagOffset = html.lastIndexOf("<script", catalogOffset);
const scriptBodyStart = html.indexOf(">", scriptTagOffset) + 1;
const scriptBodyEnd = html.indexOf("</script>", catalogOffset);
const appScript = html.slice(scriptBodyStart, scriptBodyEnd);

test("the complete inline app script parses before the page can initialize", () => {
  assert.ok(catalogOffset > 0, "the tool catalog must be present");
  assert.ok(scriptTagOffset >= 0 && scriptBodyEnd > scriptBodyStart);
  assert.doesNotThrow(() => new Function(appScript));
});

test("all 29 catalog tools have exactly one switch handler", () => {
  const catalogMatch = appScript.match(/const toolCatalog = \[([\s\S]*?)\];/);
  assert.ok(catalogMatch);
  const ids = Array.from(catalogMatch[1].matchAll(/\{ id: '([a-z0-9-]+)'/g), (match) => match[1]);
  const handlers = Array.from(appScript.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g), (match) => match[1]);
  assert.equal(ids.length, 29);
  assert.equal(new Set(ids).size, ids.length, "catalog IDs must be unique");
  assert.equal(new Set(handlers).size, handlers.length, "handler cases must be unique");
  assert.deepEqual(handlers.slice().sort(), ids.slice().sort());
});

test("unknown tool IDs never receive a false success status", () => {
  assert.match(appScript, /لا يوجد معالج فعلي لهذه الأداة بعد؛ لم يتم تنفيذ أي تحويل/);
  assert.doesNotMatch(appScript, /هذه الأداة متاحة داخل المشروع وتقوم بمعالجة محلية داخل المتصفح/);
});

test("file selection and drag-and-drop both trigger the selected tool pipeline", () => {
  assert.match(appScript, /fileInput\.addEventListener\('change'/);
  assert.match(appScript, /fileInput\.files\s*=\s*files/);
  assert.match(appScript, /fileInput\.dispatchEvent\(new Event\('change'/);
  assert.match(appScript, /function setPreviewFromFile\(file, notify = true\)/);
});

test("manual OCR reuses the configured local Tesseract worker", () => {
  assert.match(appScript, /workerPath:\s*'\.\/vendor\/tesseract\/worker\.min\.js'/);
  assert.match(appScript, /corePath:\s*'\.\/vendor\/tesseract-core'/);
  assert.match(appScript, /langPath:\s*'\.\/tessdata'/);
  assert.match(appScript, /const text = await imageToText\(selectedFile\)/);
});

test("barcode scanner and Excel-to-JPG implement real export paths", () => {
  assert.match(appScript, /case 'barcode-scanner'/);
  assert.match(appScript, /new library\.MultiFormatReader\(\)/);
  assert.match(appScript, /case 'excel-to-jpg'/);
  assert.match(appScript, /for \(const sheetName of workbook\.SheetNames\)/);
  assert.match(appScript, /archive\.generateAsync\(\{\s*type:\s*'blob'/);
});

test("Arabic PDF output is paginated and its raster limitation is disclosed", () => {
  assert.match(appScript, /function renderTextCanvases/);
  assert.match(appScript, /ctx\.direction = rtl \? 'rtl' : 'ltr'/);
  assert.match(appScript, /new jsPDF\(\{ orientation: 'portrait', unit: 'pt', format: 'a4'/);
  assert.match(appScript, /النص داخل الصفحات غير قابل للتحديد/);
  assert.match(appScript, /function wrapCanvasParagraph/);
});

test("image-to-PDF conversion calculates a proportional fit instead of stretching", () => {
  assert.match(appScript, /const fit = Math\.min\(pageWidth \/ img\.width, pageHeight \/ img\.height\)/);
  assert.match(appScript, /const x = \(pageWidth - imageWidth\) \/ 2/);
  assert.match(appScript, /const y = \(pageHeight - imageHeight\) \/ 2/);
});

test("text-to-image uses the shared wrapping and multi-page canvas renderer", () => {
  assert.match(appScript, /case 'text-to-image'/);
  assert.match(appScript, /renderTextCanvases\(text, \{ title: 'Text Image'/);
  assert.match(appScript, /text-images\.zip/);
});

test("lossy and limited conversion tools identify their true scope", () => {
  assert.match(appScript, /قاموس عربي محلي محدود، وليس ترجمة عامة/);
  assert.match(appScript, /لم يتم التعرف على خلايا جدول بصري/);
  assert.match(appScript, /الأوراق الأخرى غير مضمنة/);
  assert.match(appScript, /CSS والصور والتنسيق الأصلي غير مضمنة/);
});


test("the active page loads only local scripts and stylesheets", () => {
  const scriptRefs = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi), (match) => match[1]);
  const styleRefs = Array.from(html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css)["']/gi), (match) => match[1]);
  assert.ok(scriptRefs.length > 0);
  assert.ok(styleRefs.length > 0);
  assert.ok(scriptRefs.every((value) => value.startsWith("./")), scriptRefs.join("\n"));
  assert.ok(styleRefs.every((value) => value.startsWith("./")), styleRefs.join("\n"));
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=["']https?:\/\//i);
});

test("legacy trackers and external integrations are not in the active page chain", () => {
  const scriptRefs = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi), (match) => match[1]);
  assert.ok(!scriptRefs.some((value) => /general\.js|home\.js|trustpilot|script\/emd|tracker/i.test(value)));
  assert.doesNotMatch(appScript, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/);
});
