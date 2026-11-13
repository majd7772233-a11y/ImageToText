(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImageToTextUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function fitImageToPage(imageWidth, imageHeight, pageWidth, pageHeight) {
    const values = [imageWidth, imageHeight, pageWidth, pageHeight].map(Number);
    if (!values.every((value) => Number.isFinite(value) && value > 0)) throw new RangeError("Image and page dimensions must be finite positive numbers.");
    const [sourceWidth, sourceHeight, targetWidth, targetHeight] = values;
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const width = sourceWidth * scale, height = sourceHeight * scale;
    return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height, scale };
  }

  function getSafeCanvasDimensions(width, height, options) {
    const sourceWidth = Number(width), sourceHeight = Number(height);
    const config = Object.assign({ maxPixels: 16000000, maxDimension: 8000 }, options || {});
    const maxPixels = Number(config.maxPixels), maxDimension = Number(config.maxDimension);
    if (![sourceWidth, sourceHeight, maxPixels, maxDimension].every((value) => Number.isFinite(value) && value > 0)) throw new RangeError("Canvas dimensions and limits must be finite positive numbers.");
    const scale = Math.min(1, Math.sqrt(maxPixels / (sourceWidth * sourceHeight)), maxDimension / Math.max(sourceWidth, sourceHeight));
    let safeWidth = Math.max(1, Math.floor(sourceWidth * scale));
    let safeHeight = Math.max(1, Math.floor(sourceHeight * scale));
    while (safeWidth * safeHeight > maxPixels) { if (safeWidth >= safeHeight) safeWidth -= 1; else safeHeight -= 1; }
    return { width: safeWidth, height: safeHeight, scale, wasScaled: scale < 1 };
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function parseCsv(input, delimiter) {
    const separator = delimiter || ",";
    if (separator.length !== 1) throw new TypeError("CSV delimiter must be one character.");
    const source = String(input == null ? "" : input).replace(/^\uFEFF/, "");
    if (!source.trim()) return [];

    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    let afterQuote = false;

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
          afterQuote = true;
        } else {
          field += character;
        }
        continue;
      }

      if (afterQuote && character !== separator && character !== "\r" && character !== "\n" && character !== " " && character !== "\t") {
        throw new Error("Unexpected character after a quoted CSV field.");
      }
      if (character === '"' && field.length === 0) {
        quoted = true;
        afterQuote = false;
      } else if (character === separator) {
        row.push(field);
        field = "";
        afterQuote = false;
      } else if (character === "\n" || character === "\r") {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        row.push(field);
        field = "";
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
        row = [];
        afterQuote = false;
      } else if (!afterQuote || (character !== " " && character !== "\t")) {
        field += character;
      }
    }

    if (quoted) throw new Error("CSV contains an unclosed quoted field.");
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    return rows;
  }

  function encodeCsv(rows) {
    return (rows || []).map((row) => (row || []).map((value) => {
      const cell = String(value == null ? "" : value);
      return /[",\r\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell;
    }).join(",")).join("\r\n");
  }

  function translateWithDictionary(value, dictionary) {
    const source = String(value == null ? "" : value);
    const map = dictionary || {};
    const tokens = source.match(/[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu) || [];
    const unsupported = new Set();
    let translatedWords = 0;
    let totalWords = 0;

    const text = tokens.map((token) => {
      if (!/^[\p{L}\p{M}\p{N}]+$/u.test(token)) return token;
      totalWords += 1;
      const replacement = map[token.toLocaleLowerCase()];
      if (replacement) {
        translatedWords += 1;
        return replacement;
      }
      unsupported.add(token);
      return token;
    }).join("");

    return {
      text,
      translatedWords,
      totalWords,
      unsupportedWords: Array.from(unsupported)
    };
  }

  function groupPdfTextItems(items, options) {
    const config = Object.assign({ yTolerance: 2.5, columnGap: 18 }, options || {});
    const rows = [];

    (items || []).forEach((item, index) => {
      const text = String(item && item.str || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      const transform = item.transform || [];
      const x = Number(transform[4] || 0);
      const y = Number(transform[5] || 0);
      const width = Number(item.width || 0);
      let row = rows.find((candidate) => Math.abs(candidate.y - y) <= config.yTolerance);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ text, x, y, width, index });
    });

    rows.sort((first, second) => second.y - first.y);

    return rows.map((row) => {
      const rowText = row.items.map((item) => item.text).join(" ");
      const rtl = /[\u0590-\u08FF]/.test(rowText);
      const ordered = row.items.slice().sort((first, second) =>
        (rtl ? second.x - first.x : first.x - second.x) || first.index - second.index
      );
      const cells = [];
      let previous = null;

      ordered.forEach((item) => {
        const gap = previous
          ? (rtl ? previous.x - (item.x + item.width) : item.x - (previous.x + previous.width))
          : 0;
        if (!cells.length || gap > config.columnGap) cells.push(item.text);
        else cells[cells.length - 1] += " " + item.text;
        previous = item;
      });
      return cells;
    }).filter((row) => row.some((cell) => cell.trim() !== ""));
  }

  return { escapeHtml, parseCsv, encodeCsv, translateWithDictionary, groupPdfTextItems, fitImageToPage, getSafeCanvasDimensions };
});
