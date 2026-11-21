const test = require("node:test");
const assert = require("node:assert/strict");
const PDFLib = require("pdf-lib");
const JSZip = require("jszip");
const utils = require("../script/format-utils.js");
const tools = require("../script/professional-tools.js");

globalThis.PDFLib = PDFLib;
globalThis.JSZip = JSZip;
globalThis.ImageToTextUtils = utils;

function namedBlob(data, name, type) {
  const blob = new Blob([data], { type: type || "application/octet-stream" });
  Object.defineProperty(blob, "name", { value: name });
  return blob;
}

async function createPdf(pageCount = 3) {
  const document = await PDFLib.PDFDocument.create();
  document.setTitle("Test document");
  document.setAuthor("Test Author");
  document.setKeywords(["arabic", "scan"]);
  for (let index = 0; index < pageCount; index += 1) {
    const page = document.addPage([600 + index * 10, 800 - index * 10]);
    page.drawText("Source page " + (index + 1), { x: 40, y: 740, size: 14 });
  }
  return namedBlob(await document.save(), "sample.pdf", "application/pdf");
}

test("PDF page selection parses singles and ranges into zero-based indexes", () => {
  assert.deepEqual(tools.parsePageSelection("1-3,5", 6), [0, 1, 2, 4]);
  assert.deepEqual(tools.parsePageSelection("3,1,3", 3, { allowDuplicates: true }), [2, 0, 2]);
});

test("PDF page selection rejects empty, malformed, duplicate and out-of-range requests", () => {
  assert.throws(() => tools.parsePageSelection("", 3), /pages|أرقام|صفحات|pages/i);
  assert.throws(() => tools.parsePageSelection("3-1", 3), /pages|صفحات|ascending|تصاعدياً/i);
  assert.throws(() => tools.parsePageSelection("1,1", 3), /more than once|أكثر من مرة/i);
  assert.throws(() => tools.parsePageSelection("1,4", 3), /between|بين/i);
});

test("PDF inspection reports document metadata and per-page geometry", async () => {
  const file = await createPdf(3);
  const result = await tools.processPdf(file, "inspect");
  assert.equal(result.kind, "text");
  assert.match(result.text, /sample\.pdf/);
  assert.match(result.text, /3/);
  assert.match(result.text, /600 × 800/);
  assert.match(result.text, /arabic scan/);
  assert.match(result.text, /Test Author/);
});

test("PDF splitting creates one valid PDF per page inside ZIP", async () => {
  const result = await tools.processPdf(await createPdf(3), "split");
  assert.equal(result.kind, "file");
  assert.equal(result.filename, "sample-pages.zip");
  const archive = await JSZip.loadAsync(await result.blob.arrayBuffer());
  assert.deepEqual(Object.keys(archive.files).sort(), ["page-001.pdf", "page-002.pdf", "page-003.pdf"]);
  for (const entry of Object.values(archive.files)) {
    const doc = await PDFLib.PDFDocument.load(await entry.async("uint8array"));
    assert.equal(doc.getPageCount(), 1);
  }
});

test("PDF extraction and reordering preserve the requested page sequence", async () => {
  const file = await createPdf(3);
  const extracted = await tools.processPdf(file, "extract", { pages: "3,1" });
  const extractedPdf = await PDFLib.PDFDocument.load(await extracted.blob.arrayBuffer());
  assert.equal(extractedPdf.getPageCount(), 2);
  assert.equal(extractedPdf.getPage(0).getSize().width, 620);
  assert.equal(extractedPdf.getPage(1).getSize().width, 600);

  const reordered = await tools.processPdf(file, "reorder", { pages: "2,1,2" });
  const reorderedPdf = await PDFLib.PDFDocument.load(await reordered.blob.arrayBuffer());
  assert.equal(reorderedPdf.getPageCount(), 3);
  assert.equal(reorderedPdf.getPage(0).getSize().width, 610);
  assert.equal(reorderedPdf.getPage(2).getSize().width, 610);
});

test("PDF deletion keeps the remaining pages and refuses to delete every page", async () => {
  const file = await createPdf(3);
  const result = await tools.processPdf(file, "delete", { pages: "2" });
  const document = await PDFLib.PDFDocument.load(await result.blob.arrayBuffer());
  assert.equal(document.getPageCount(), 2);
  assert.equal(document.getPage(1).getSize().width, 620);
  await assert.rejects(() => tools.processPdf(file, "delete", { pages: "1-3" }), /at least one|صفحة واحدة|تبقى/i);
});

test("PDF rotation, numbering and invalid angles are handled explicitly", async () => {
  const file = await createPdf(2);
  const rotated = await tools.processPdf(file, "rotate", { pages: "1-2", rotation: 90 });
  const rotatedPdf = await PDFLib.PDFDocument.load(await rotated.blob.arrayBuffer());
  assert.equal(rotatedPdf.getPage(0).getRotation().angle, 90);
  assert.equal(rotatedPdf.getPage(1).getRotation().angle, 90);
  await assert.rejects(() => tools.processPdf(file, "rotate", { pages: "1", rotation: 45 }), /90|180|270/);

  const numbered = await tools.processPdf(file, "number");
  const numberedPdf = await PDFLib.PDFDocument.load(await numbered.blob.arrayBuffer());
  assert.equal(numberedPdf.getPageCount(), 2);
  assert.ok((await numbered.blob.arrayBuffer()).byteLength > 500);
});

test("CSV to JSON preserves quoted commas and rejects duplicate headers", () => {
  const csv = 'Name,Note\r\n"Ali, A.","A value"';
  const result = JSON.parse(tools.csvToJson(csv, utils.parseCsv));
  assert.deepEqual(result, [{ Name: "Ali, A.", Note: "A value" }]);
  assert.throws(() => tools.csvToJson("name,Name\na,b", utils.parseCsv), /duplicate|مكررة/i);
});

test("JSON to CSV unions object keys and neutralizes spreadsheet formulas", () => {
  const csv = tools.jsonToCsv('[{"name":"Ali","note":"=1+1"},{"name":"Sara","extra":"safe"}]', utils.encodeCsv);
  assert.match(csv, /name,note,extra/);
  assert.match(csv, /'=1\+1/);
  assert.match(csv, /Sara/);
});

test("text cleaning normalizes Unicode and removes hidden direction characters", () => {
  assert.equal(tools.cleanText("\uFEFFCafe\u0301\u200B\r\n line  \r\n\r\n\r\nend "), "Café\n line\n\nend");
});

test("duplicate removal keeps the first original line and reports removals", () => {
  const result = tools.removeDuplicateLines("Alpha\nBeta\nAlpha\n beta \nBeta\n");
  assert.equal(result.text, "Alpha\nBeta\n beta \n");
  assert.equal(result.removed, 2);
});

test("line sorting uses locale-aware numeric order", () => {
  assert.equal(tools.sortTextLines("Item 10\nItem 2\nItem 1"), "Item 1\nItem 2\nItem 10");
});

test("text statistics count words, lines, paragraphs and Arabic characters", () => {
  const result = tools.textStatistics("Hello world\nمرحبا بك\n\nPDF 123");
  assert.match(result, /words: 6|الكلمات: 6/);
  assert.match(result, /lines: 4|الأسطر: 4/);
  assert.match(result, /paragraphs: 2|الفقرات التقريبي: 2/);
  assert.match(result, /Arabic characters: 7|الأحرف العربية: 7/);
});

test("find and replace updates every occurrence and rejects an empty search", () => {
  assert.deepEqual(tools.findAndReplace("one two one", "one", "1"), { text: "1 two 1", count: 2 });
  assert.throws(() => tools.findAndReplace("text", "", "x"), /empty|فارغة/i);
});

test("file-based text actions return real UTF-8 export blobs", async () => {
  const file = namedBlob('{"a":1,"b":[2,3]}', "sample.json", "application/json");
  file.text = async () => '{"a":1,"b":[2,3]}';
  const result = await tools.processText(file, "format-json");
  assert.equal(result.filename, "sample-formatted.json");
  assert.deepEqual(JSON.parse(await result.blob.text()), { a: 1, b: [2, 3] });

  const statsFile = namedBlob("one two", "words.txt", "text/plain");
  statsFile.text = async () => "one two";
  const stats = await tools.processText(statsFile, "statistics");
  assert.equal(stats.kind, "text");
  assert.match(stats.text, /2/);
});

