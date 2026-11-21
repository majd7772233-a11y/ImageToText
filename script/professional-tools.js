(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImageToTextProfessionalTools = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parsePageSelection(specification, pageCount, options) {
    const settings = Object.assign({ allowDuplicates: false }, options || {});
    const total = Number(pageCount);
    if (!Number.isInteger(total) || total < 1) throw new Error("ملف PDF لا يحتوي على صفحات قابلة للمعالجة.");
    const value = String(specification == null ? "" : specification).trim();
    if (!value) throw new Error("أدخل أرقام الصفحات أولاً، مثل 1-3,5.");
    const selected = [];
    const seen = new Set();
    for (const rawPart of value.split(",")) {
      const part = rawPart.trim();
      const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!match) throw new Error("صيغة الصفحات غير صحيحة. استخدم 1-3,5 مثلاً.");
      const first = Number(match[1]);
      const last = match[2] ? Number(match[2]) : first;
      if (first < 1 || last < first || last > total) {
        throw new Error("أرقام الصفحات يجب أن تكون بين 1 و" + total + "، مع كتابة النطاق تصاعدياً.");
      }
      for (let page = first; page <= last; page += 1) {
        if (!settings.allowDuplicates && seen.has(page)) throw new Error("تم تحديد الصفحة " + page + " أكثر من مرة.");
        seen.add(page);
        selected.push(page - 1);
      }
    }
    if (!selected.length) throw new Error("لم يتم تحديد أي صفحة.");
    return selected;
  }

  function getPdfLib() {
    if (typeof globalThis !== "undefined" && globalThis.PDFLib) return globalThis.PDFLib;
    throw new Error("مكتبة معالجة PDF غير محمّلة. أعد فتح التطبيق من المجلد الكامل.");
  }

  function getJsZip() {
    if (typeof globalThis !== "undefined" && globalThis.JSZip) return globalThis.JSZip;
    throw new Error("مكتبة ZIP غير محمّلة. أعد فتح التطبيق من المجلد الكامل.");
  }

  function baseName(file, fallback) {
    const name = String(file && file.name ? file.name : fallback || "file");
    return name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 100) || fallback || "file";
  }

  async function pdfBlob(document) {
    return new Blob([await document.save({ useObjectStreams: true })], { type: "application/pdf" });
  }

  async function processPdf(file, action, options) {
    const PDFLib = getPdfLib();
    const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    const pageCount = source.getPageCount();
    const stem = baseName(file, "document");
    const settings = options || {};

    if (action === "inspect") {
      const details = [
        "معلومات ملف PDF",
        "الملف: " + (file.name || "document.pdf"),
        "الحجم: " + (Number(file.size || 0) / 1024).toFixed(1) + " كيلوبايت",
        "عدد الصفحات: " + pageCount,
        "العنوان: " + (source.getTitle() || "غير محدد"),
        "المؤلف: " + (source.getAuthor() || "غير محدد"),
        "الموضوع: " + (source.getSubject() || "غير محدد"),
        "المنشئ: " + (source.getCreator() || "غير محدد"),
        "المنتِج: " + (source.getProducer() || "غير محدد"),
        "الكلمات المفتاحية: " + (source.getKeywords() || "لا توجد")
      ];
      source.getPages().forEach((page, index) => {
        const size = page.getSize();
        details.push("الصفحة " + (index + 1) + ": " + Math.round(size.width) + " × " + Math.round(size.height) + " نقطة؛ الدوران " + (page.getRotation().angle || 0) + "°");
      });
      return { kind: "text", text: details.join("\n"), summary: "تم فحص " + pageCount + " صفحة واستخراج خصائص المستند." };
    }

    if (action === "split") {
      if (pageCount > 300) throw new Error("تقسيم هذا الملف إلى " + pageCount + " ملفاً منفصلاً قد يستهلك ذاكرة كبيرة. قسّمه إلى ملفات أصغر أولاً.");
      const JSZip = getJsZip();
      const archive = new JSZip();
      for (let index = 0; index < pageCount; index += 1) {
        const single = await PDFLib.PDFDocument.create();
        const [page] = await single.copyPages(source, [index]);
        single.addPage(page);
        archive.file("page-" + String(index + 1).padStart(3, "0") + ".pdf", await single.save({ useObjectStreams: true }));
      }
      const blob = await archive.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 3 } });
      return { kind: "file", blob, filename: stem + "-pages.zip", summary: "تم تقسيم " + pageCount + " صفحة إلى ملفات PDF منفصلة داخل ZIP.", status: "اكتمل التقسيم. يحتوي الملف المضغوط على " + pageCount + " ملف PDF." };
    }

    if (action === "extract" || action === "reorder") {
      const indexes = parsePageSelection(settings.pages, pageCount, { allowDuplicates: action === "reorder" });
      const output = await PDFLib.PDFDocument.create();
      const copied = await output.copyPages(source, indexes);
      copied.forEach((page) => output.addPage(page));
      const blob = await pdfBlob(output);
      const suffix = action === "reorder" ? "reordered" : "extracted";
      return { kind: "file", blob, filename: stem + "-" + suffix + ".pdf", summary: "تم إنشاء PDF جديد يتضمن " + indexes.length + " صفحة بالترتيب المحدد.", status: "اكتمل إنشاء الملف الجديد بعدد " + indexes.length + " صفحة." };
    }

    if (action === "delete") {
      const indexes = parsePageSelection(settings.pages, pageCount);
      if (indexes.length >= pageCount) throw new Error("لا يمكن حذف جميع صفحات PDF؛ يجب أن تبقى صفحة واحدة على الأقل.");
      indexes.slice().sort((a, b) => b - a).forEach((index) => source.removePage(index));
      const blob = await pdfBlob(source);
      return { kind: "file", blob, filename: stem + "-pages-removed.pdf", summary: "تم حذف " + indexes.length + " صفحة، وتبقت " + source.getPageCount() + " صفحة.", status: "تم حذف الصفحات المحددة وحفظ الملف." };
    }

    if (action === "rotate") {
      const indexes = parsePageSelection(settings.pages, pageCount);
      const rotation = Number(settings.rotation);
      if (![90, 180, 270].includes(rotation)) throw new Error("زاوية الدوران يجب أن تكون 90 أو 180 أو 270 درجة.");
      indexes.forEach((index) => {
        const page = source.getPage(index);
        page.setRotation(PDFLib.degrees(((page.getRotation().angle || 0) + rotation) % 360));
      });
      const blob = await pdfBlob(source);
      return { kind: "file", blob, filename: stem + "-rotated.pdf", summary: "تم تدوير " + indexes.length + " صفحة بمقدار " + rotation + " درجة.", status: "تم تدوير الصفحات المحددة وحفظ الملف." };
    }

    if (action === "number") {
      const font = await source.embedFont(PDFLib.StandardFonts.Helvetica);
      source.getPages().forEach((page, index) => {
        const size = page.getSize();
        const label = "Page " + (index + 1) + " of " + pageCount;
        const fontSize = Math.max(8, Math.min(10, size.width / 55));
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        page.drawText(label, {
          x: Math.max(12, (size.width - textWidth) / 2),
          y: 16,
          size: fontSize,
          font,
          color: PDFLib.rgb(0.38, 0.43, 0.52),
          opacity: 0.82
        });
      });
      const blob = await pdfBlob(source);
      return { kind: "file", blob, filename: stem + "-numbered.pdf", summary: "تمت إضافة أرقام متسلسلة إلى " + pageCount + " صفحة.", status: "تم ترقيم صفحات PDF. الأرقام مضافة بالأحرف اللاتينية لتوافق الخط القياسي." };
    }

    throw new Error("عملية PDF غير معروفة: " + action);
  }

  function imageDimensions(image) {
    return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
  }

  async function loadImageCanvas(file) {
    if (typeof Image === "undefined" || typeof document === "undefined") throw new Error("معالجة الصور تحتاج إلى تشغيل الأداة داخل متصفح حديث.");
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      if (typeof image.decode === "function") await image.decode();
      else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error("تعذر فتح الصورة. تأكد من سلامة الملف.")); });
      const dimensions = imageDimensions(image);
      if (!dimensions.width || !dimensions.height) throw new Error("تعذر تحديد أبعاد الصورة.");
      const maxPixels = 16000000;
      const maxDimension = 8000;
      const scale = Math.min(1, Math.sqrt(maxPixels / (dimensions.width * dimensions.height)), maxDimension / dimensions.width, maxDimension / dimensions.height);
      const width = Math.max(1, Math.floor(dimensions.width * scale));
      const height = Math.max(1, Math.floor(dimensions.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("تعذر إنشاء مساحة معالجة الصورة.");
      context.drawImage(image, 0, 0, width, height);
      return { canvas, width, height, sourceWidth: dimensions.width, sourceHeight: dimensions.height, wasScaled: scale < 1 };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function canvasBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("تعذر تصدير الصورة بالصيغة المطلوبة."));
        if (blob.type && blob.type !== mime) return reject(new Error("هذا المتصفح لا يدعم إخراج الصيغة المطلوبة: " + mime));
        resolve(blob);
      }, mime, quality);
    });
  }

  function imageExtension(mime) {
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/webp") return "webp";
    return "png";
  }

  function makeExportCanvas(source, mime) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذر إنشاء مساحة تصدير الصورة.");
    if (mime === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(source.canvas, 0, 0, source.width, source.height);
    return { canvas, context };
  }

  function formatColor(value) {
    return "#" + value.toString(16).padStart(6, "0").toUpperCase();
  }

  async function processImage(file, action, options) {
    const settings = options || {};
    const source = await loadImageCanvas(file);
    const stem = baseName(file, "image");

    if (action === "inspect") {
      const ratio = source.sourceWidth / source.sourceHeight;
      return {
        kind: "text",
        text: [
          "معلومات الصورة",
          "الملف: " + (file.name || "image"),
          "الصيغة: " + (file.type || "غير معروفة"),
          "الأبعاد الأصلية: " + source.sourceWidth + " × " + source.sourceHeight + " بكسل",
          "نسبة العرض إلى الارتفاع: " + ratio.toFixed(3),
          "الحجم: " + (Number(file.size || 0) / 1024).toFixed(1) + " كيلوبايت",
          "تاريخ التعديل: " + (file.lastModified ? new Date(file.lastModified).toLocaleString() : "غير متاح"),
          source.wasScaled ? "ملاحظة: تم تصغير نسخة المعالجة الداخلية لحماية الذاكرة." : "لم تكن هناك حاجة إلى تصغير الصورة للمعالجة."
        ].join("\n"),
        summary: "تم فحص أبعاد الصورة ومعلومات ملفها."
      };
    }

    if (action === "palette") {
      const sample = document.createElement("canvas");
      sample.width = 80;
      sample.height = 80;
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      if (!sampleContext) throw new Error("تعذر تحليل ألوان الصورة.");
      sampleContext.drawImage(source.canvas, 0, 0, 80, 80);
      const pixels = sampleContext.getImageData(0, 0, 80, 80).data;
      const counts = new Map();
      let total = 0;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset + 3] < 48) continue;
        const red = pixels[offset] >> 3;
        const green = pixels[offset + 1] >> 3;
        const blue = pixels[offset + 2] >> 3;
        const key = (red << 10) | (green << 5) | blue;
        counts.set(key, (counts.get(key) || 0) + 1);
        total += 1;
      }
      const colors = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const rows = colors.map(([key, count], index) => {
        const red = ((key >> 10) & 31) << 3;
        const green = ((key >> 5) & 31) << 3;
        const blue = (key & 31) << 3;
        const color = formatColor((red << 16) | (green << 8) | blue);
        return String(index + 1).padStart(2, "0") + ". " + color + " — " + (count / Math.max(1, total) * 100).toFixed(1) + "%";
      });
      sample.width = 1;
      sample.height = 1;
      return { kind: "text", text: "لوحة الألوان التقريبية للصورة\n" + rows.join("\n") + "\n\nتم أخذ عينة مصغرة من الصورة؛ النسب تقريبية وليست تحليلاً لكل بكسل أصلي.", summary: "تم استخراج أبرز " + colors.length + " ألوان من الصورة." };
    }

    let canvas;
    let mime = "image/png";
    let quality = 0.92;

    if (action === "resize") {
      const maxWidth = Number(settings.width);
      const maxHeight = Number(settings.height);
      if (!Number.isInteger(maxWidth) || !Number.isInteger(maxHeight) || maxWidth < 1 || maxHeight < 1 || maxWidth > 12000 || maxHeight > 12000) {
        throw new Error("أدخل عرضاً وارتفاعاً صحيحين بين 1 و12000 بكسل.");
      }
      const scale = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("تعذر إنشاء الصورة الجديدة.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source.canvas, 0, 0, width, height);
      mime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
      return {
        kind: "file", blob: await canvasBlob(canvas, mime, 0.92),
        filename: stem + "-" + width + "x" + height + "." + imageExtension(mime),
        summary: "الأبعاد الجديدة: " + width + " × " + height + " بكسل مع الحفاظ على النسبة الأصلية.",
        status: "تم تغيير حجم الصورة دون تمديدها أو تشويه نسبها."
      };
    }

    if (action === "compress") {
      const percent = Number(settings.quality);
      if (!Number.isFinite(percent) || percent < 30 || percent > 95) throw new Error("جودة الضغط يجب أن تكون بين 30 و95 بالمئة.");
      mime = "image/jpeg";
      quality = percent / 100;
      const output = makeExportCanvas(source, mime);
      return {
        kind: "file", blob: await canvasBlob(output.canvas, mime, quality), filename: stem + "-compressed.jpg",
        summary: "تم ضغط الصورة بصيغة JPEG بجودة " + percent + "%.",
        status: "اكتمل الضغط. تم تحويل الخلفيات الشفافة إلى الأبيض لأن JPEG لا يدعم الشفافية."
      };
    }

    if (action === "format") {
      const format = String(settings.format || "webp").toLowerCase();
      const mimeByFormat = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
      mime = mimeByFormat[format];
      if (!mime) throw new Error("الصيغ المدعومة هي PNG وJPG وWebP.");
      const output = makeExportCanvas(source, mime);
      quality = mime === "image/png" ? undefined : 0.9;
      return {
        kind: "file", blob: await canvasBlob(output.canvas, mime, quality), filename: stem + "." + imageExtension(mime),
        summary: "تم تحويل الصورة إلى " + format.toUpperCase() + " مع الحفاظ على أبعادها.",
        status: mime === "image/jpeg" ? "اكتمل التحويل. تم استبدال الشفافية بخلفية بيضاء عند الحاجة." : "اكتمل تحويل صيغة الصورة."
      };
    }

    if (action === "watermark") {
      const text = String(settings.text || "").trim();
      if (!text) throw new Error("اكتب نص العلامة المائية أولاً.");
      const output = makeExportCanvas(source, "image/png");
      const context = output.context;
      const fontSize = Math.max(6, Math.min(58, Math.round(Math.min(source.width, source.height) * 0.18)));
      const margin = Math.max(1, Math.round(Math.min(source.width, source.height) * 0.025));
      const padding = Math.max(1, Math.round(fontSize * 0.35));
      context.font = "700 " + fontSize + "px Tahoma, Arial, sans-serif";
      const direction = /[\u0590-\u08FF]/.test(text) ? "rtl" : "ltr";
      context.direction = direction;
      context.textAlign = "right";
      const measured = context.measureText(text).width;
      const maxBoxWidth = Math.max(1, source.width - margin * 2);
      const boxWidth = Math.max(1, Math.min(maxBoxWidth, measured + padding * 2));
      const boxHeight = Math.max(1, Math.min(source.height, fontSize + padding * 1.35));
      const x = Math.max(0, source.width - margin - boxWidth);
      const y = Math.max(0, source.height - margin - boxHeight);
      context.fillStyle = "rgba(5, 12, 25, 0.62)";
      context.beginPath();
      const radius = Math.max(0, Math.min(12, padding, boxWidth / 2, boxHeight / 2));
      if (typeof context.roundRect === "function") context.roundRect(x, y, boxWidth, boxHeight, radius);
      else context.rect(x, y, boxWidth, boxHeight);
      context.fill();
      context.shadowColor = "rgba(0, 0, 0, 0.45)";
      context.shadowBlur = 2;
      context.fillStyle = "#ffffff";
      context.textBaseline = "middle";
      context.fillText(text, Math.max(0, source.width - margin - padding), y + boxHeight / 2, Math.max(1, boxWidth - padding * 2));
      context.shadowBlur = 0;
      return {
        kind: "file", blob: await canvasBlob(output.canvas, "image/png"), filename: stem + "-watermarked.png",
        summary: "تم وضع علامة مائية نصية على الصورة.", status: "تمت إضافة العلامة المائية وتصدير PNG."
      };
    }

    throw new Error("عملية الصور غير معروفة: " + action);
  }

  function csvToJson(source, parser) {
    if (typeof parser !== "function") throw new Error("محلل CSV المحلي غير محمّل.");
    const rows = parser(String(source || "").replace(/^\uFEFF/, ""));
    if (!rows.length || rows.length < 2) throw new Error("ملف CSV يحتاج إلى صف عناوين وصف بيانات واحد على الأقل.");
    const headers = rows[0].map((value, index) => String(value || "").trim() || "column_" + (index + 1));
    const normalized = headers.map((header) => header.toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length) throw new Error("توجد أسماء أعمدة مكررة في CSV. غيّر العناوين أولاً.");
    const records = rows.slice(1).filter((row) => row.some((cell) => String(cell || "").trim() !== "")).map((row) => {
      const record = {};
      headers.forEach((header, index) => { record[header] = row[index] == null ? "" : String(row[index]); });
      return record;
    });
    return JSON.stringify(records, null, 2) + "\n";
  }

  function jsonToCsv(source, encoder) {
    if (typeof encoder !== "function") throw new Error("مُرمّز CSV المحلي غير محمّل.");
    const parsed = JSON.parse(String(source || ""));
    const records = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : null);
    if (!records || !records.length || records.some((record) => !record || typeof record !== "object" || Array.isArray(record))) {
      throw new Error("يجب أن يكون JSON كائناً واحداً أو مصفوفة من الكائنات.");
    }
    const headers = [];
    records.forEach((record) => Object.keys(record).forEach((key) => { if (!headers.includes(key)) headers.push(key); }));
    if (!headers.length) throw new Error("لا توجد خصائص يمكن تحويلها إلى أعمدة CSV.");
    const rows = [headers];
    records.forEach((record) => {
      rows.push(headers.map((header) => {
        const value = record[header];
        if (value == null) return "";
        const cell = typeof value === "object" ? JSON.stringify(value) : String(value);
        return /^[\s]*[=+@]/.test(cell) || /^[\s]*-[^\d.]/.test(cell) ? "'" + cell : cell;
      }));
    });
    return "\uFEFF" + encoder(rows);
  }

  function cleanText(source) {
    return String(source == null ? "" : source)
      .replace(/^\uFEFF/, "")
      .normalize("NFC")
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[\t ]+$/g, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function removeDuplicateLines(source) {
    const seen = new Set();
    const output = [];
    let removed = 0;
    const normalized = String(source == null ? "" : source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const hasTrailingNewline = normalized.endsWith("\n");
    const lines = normalized.split("\n");
    if (hasTrailingNewline) lines.pop();
    lines.forEach((line) => {
      const key = line.normalize("NFC").trim();
      if (key && seen.has(key)) { removed += 1; return; }
      if (key) seen.add(key);
      output.push(line);
    });
    return { text: output.join("\n") + (hasTrailingNewline ? "\n" : ""), removed };
  }

  function sortTextLines(source) {
    const collator = new Intl.Collator(["ar", "en"], { numeric: true, sensitivity: "base" });
    return String(source == null ? "" : source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n")
      .map((line, index) => ({ line, index }))
      .sort((a, b) => {
        if (!a.line.trim() && !b.line.trim()) return a.index - b.index;
        if (!a.line.trim()) return 1;
        if (!b.line.trim()) return -1;
        return collator.compare(a.line, b.line) || a.index - b.index;
      })
      .map((item) => item.line).join("\n");
  }

  function textStatistics(source) {
    const text = String(source == null ? "" : source).replace(/^\uFEFF/, "");
    const words = text.match(/[\p{L}\p{N}]+/gu) || [];
    const lines = text ? text.replace(/\r\n?/g, "\n").split("\n").length : 0;
    const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).filter(Boolean).length : 0;
    const arabicCharacters = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const nonWhitespace = text.replace(/\s/g, "").length;
    const readingMinutes = Math.max(1, Math.ceil(words.length / 200));
    return [
      "إحصاءات النص",
      "عدد الأحرف مع المسافات: " + text.length,
      "عدد الأحرف دون المسافات: " + nonWhitespace,
      "عدد الكلمات: " + words.length,
      "عدد الأسطر: " + lines,
      "عدد الفقرات التقريبي: " + paragraphs,
      "الأحرف العربية: " + arabicCharacters,
      "زمن القراءة التقريبي: " + readingMinutes + " دقيقة (على أساس 200 كلمة/دقيقة)"
    ].join("\n");
  }

  function findAndReplace(source, search, replacement) {
    const needle = String(search == null ? "" : search);
    if (!needle) throw new Error("عبارة البحث لا يمكن أن تكون فارغة.");
    const original = String(source == null ? "" : source);
    const pieces = original.split(needle);
    const count = pieces.length - 1;
    if (!count) return { text: original, count: 0 };
    return { text: pieces.join(String(replacement == null ? "" : replacement)), count };
  }

  function textBlobResult(file, text, suffix, mime) {
    return {
      kind: "file",
      blob: new Blob([text], { type: mime || "text/plain;charset=utf-8" }),
      filename: baseName(file, "text") + suffix,
      text,
      summary: "تمت معالجة الملف بنجاح.",
      status: "اكتملت معالجة النص وحُفظ الملف الناتج."
    };
  }

  async function processText(file, action, options) {
    const settings = options || {};
    const source = await file.text();
    const utils = typeof globalThis !== "undefined" ? globalThis.ImageToTextUtils : null;
    let text;
    switch (action) {
      case "format-json":
        text = JSON.stringify(JSON.parse(source.replace(/^\uFEFF/, "")), null, 2) + "\n";
        return textBlobResult(file, text, "-formatted.json", "application/json;charset=utf-8");
      case "minify-json":
        text = JSON.stringify(JSON.parse(source.replace(/^\uFEFF/, "")));
        return textBlobResult(file, text, "-minified.json", "application/json;charset=utf-8");
      case "csv-to-json":
        text = csvToJson(source, utils && utils.parseCsv);
        return textBlobResult(file, text, "-converted.json", "application/json;charset=utf-8");
      case "json-to-csv":
        text = jsonToCsv(source, utils && utils.encodeCsv);
        return textBlobResult(file, text, "-converted.csv", "text/csv;charset=utf-8");
      case "clean-text":
        text = cleanText(source) + "\n";
        return textBlobResult(file, text, "-cleaned.txt");
      case "remove-duplicates": {
        const result = removeDuplicateLines(source);
        text = result.text;
        const output = textBlobResult(file, text, "-unique-lines.txt");
        output.summary = "تم حذف " + result.removed + " سطراً مكرراً مع الإبقاء على أول ظهور لكل سطر.";
        output.status = output.summary;
        return output;
      }
      case "sort-lines": {
        const sorted = sortTextLines(source);
        text = sorted + (String(source).endsWith("\n") && !sorted.endsWith("\n") ? "\n" : "");
        return textBlobResult(file, text, "-sorted.txt");
      }
      case "statistics":
        return { kind: "text", text: textStatistics(source), summary: "تم حساب إحصاءات النص." };
      case "find-replace": {
        const result = findAndReplace(source, settings.search, settings.replacement);
        text = result.text;
        const output = textBlobResult(file, text, "-replaced.txt");
        output.summary = "تم استبدال " + result.count + " ظهوراً لعبارة البحث.";
        output.status = output.summary;
        return output;
      }
      default:
        throw new Error("عملية النصوص غير معروفة: " + action);
    }
  }

  return Object.freeze({
    parsePageSelection,
    csvToJson,
    jsonToCsv,
    cleanText,
    removeDuplicateLines,
    sortTextLines,
    textStatistics,
    findAndReplace,
    processPdf,
    processImage,
    processText
  });
});