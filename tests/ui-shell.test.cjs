const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const shell = read("script/app-shell.js");
const styles = read("css/liquid-glass.css");
const premiumStyles = read("css/liquid-glass-premium.css");
const heroRenderer = read("script/liquid-hero.js");
const utils = require("../script/format-utils.js");

test("the home screen and dedicated tool screen are present", () => {
  assert.match(html, /id="homeScreen"/);
  assert.match(html, /id="toolScreen"/);
  assert.match(html, /id="backToHome"/);
  assert.match(html, /id="activeToolName"/);
});

test("all catalog tools still have a dedicated catalog entry", () => {
  const entries = html.match(/\{ id: '[a-z0-9-]+', name:/g) || [];
  assert.equal(entries.length, 29);
});

test("navigation and workspace scripts are linked", () => {
  assert.match(html, /css\/liquid-glass\.css/);
  assert.match(html, /script\/app-shell\.js/);
  assert.match(shell, /window\.openToolScreen = openToolScreen/);
  assert.match(shell, /data-tool-nav/);
});

test("glass fallback and accessibility motion rules exist", () => {
  assert.match(styles, /backdrop-filter:\s*blur/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /prefers-contrast:\s*more/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@supports not/);
});


test("the tool library overrides the legacy opaque light section background", () => {
  assert.match(styles, /\.tool-section\.library-section\s*\{/);
  assert.match(styles, /background:[\s\S]{0,500}!important;/);
  assert.match(styles, /backdrop-filter:\s*blur\(27px\)/);
});

test("tool cards expose glass hover, pressed, selected and readable text states", () => {
  assert.match(styles, /\.library-section \.tool-card:hover/);
  assert.match(styles, /\.library-section \.tool-card:active/);
  assert.match(styles, /\.library-section \.tool-card\[aria-pressed="true"\]/);
  assert.match(styles, /\.library-section \.tool-card strong\s*\{[\s\S]*?color:\s*#f4f7ff/);
  assert.match(styles, /\.library-section \.tool-card small\s*\{[\s\S]*?color:\s*#c0cee4/);
});

test("card pointer lighting is decorative and selection state is synchronized", () => {
  assert.match(shell, /card\.addEventListener\("pointermove"/);
  assert.match(shell, /card\.setAttribute\("aria-pressed", "false"\)/);
  assert.match(shell, /card\.setAttribute\("aria-pressed", String\(selected\)\)/);
});


test("the premium hero has a shape-aware WebGL2 lens and a CSS fallback", () => {
  assert.match(html, /id="heroVisual"/);
  assert.match(html, /id="heroGlassCanvas"/);
  assert.match(html, /script\/liquid-hero\.js/);
  assert.match(heroRenderer, /getContext\("webgl2"/);
  assert.match(heroRenderer, /smoothMin/);
  assert.match(heroRenderer, /backdrop\(clamp\(uv\+off/);
  assert.match(heroRenderer, /dataset\.renderer="fallback"/);
  assert.match(heroRenderer, /1000\/30/);
});

test("hero rendering pauses off-screen and honors reduced motion", () => {
  assert.match(heroRenderer, /IntersectionObserver/);
  assert.match(heroRenderer, /document\.hidden/);
  assert.match(heroRenderer, /prefers-reduced-motion/);
  assert.match(premiumStyles, /prefers-reduced-motion:reduce/);
});

test("library exposes live result counts and accessible category state", () => {
  assert.match(html, /id="visibleToolCount"/);
  assert.match(html, /data-category-count="images"/);
  assert.match(html, /id="exploreToolsBtn"/);
  assert.match(shell, /visibleToolCount\.textContent/);
  assert.match(shell, /button\.setAttribute\("aria-pressed", String\(active\)\)/);
});

test("premium visual layer retains responsive and transparency fallbacks", () => {
  assert.match(premiumStyles, /max-width:680px/);
  assert.match(premiumStyles, /prefers-reduced-transparency/);
  assert.match(premiumStyles, /@supports not/);
  assert.match(premiumStyles, /backdrop-filter:blur\(21px\)/);
});


test("CSV parser supports BOM, quoted delimiters, doubled quotes and multiline cells", () => {
  const source = '\uFEFFName,Note\r\n"Alice, A.","She said ""hello""\nand left"';
  assert.deepEqual(utils.parseCsv(source), [["Name", "Note"], ["Alice, A.", 'She said "hello"\nand left']]);
  assert.equal(utils.encodeCsv([["A", "B"], ["one,two", 'say "yes"']]), 'A,B\r\n"one,two","say ""yes"""');
});

test("CSV parser rejects malformed quoted fields instead of silently splitting them", () => {
  assert.throws(() => utils.parseCsv('name,note\n"unfinished'), /unclosed quoted field/i);
  assert.throws(() => utils.parseCsv('a\n"x"oops'), /after a quoted CSV field/i);
});

test("HTML escaping prevents extracted document text from becoming markup", () => {
  assert.equal(
    utils.escapeHtml('<img src=x onerror="run()"> & text'),
    '&lt;img src=x onerror=&quot;run()&quot;&gt; &amp; text'
  );
});

test("offline dictionary translation exposes unsupported words", () => {
  const result = utils.translateWithDictionary("Hello, unknown world!", { hello: "مرحبا", world: "العالم" });
  assert.equal(result.text, "مرحبا, unknown العالم!");
  assert.equal(result.translatedWords, 2);
  assert.equal(result.totalWords, 3);
  assert.deepEqual(result.unsupportedWords, ["unknown"]);
});

test("PDF text grouping uses coordinates to create rows and approximate columns", () => {
  const items = [
    { str: "Name", transform: [1, 0, 0, 1, 10, 100], width: 24 },
    { str: "Score", transform: [1, 0, 0, 1, 100, 100], width: 28 },
    { str: "Ali", transform: [1, 0, 0, 1, 10, 80], width: 12 },
    { str: "95", transform: [1, 0, 0, 1, 100, 80], width: 10 }
  ];
  assert.deepEqual(utils.groupPdfTextItems(items), [["Name", "Score"], ["Ali", "95"]]);
});


test("PDF row direction is detected independently for mixed Arabic and English rows", () => {
  const items = [
    { str: "يمين", transform: [1, 0, 0, 1, 100, 100], width: 30 },
    { str: "يسار", transform: [1, 0, 0, 1, 20, 100], width: 30 },
    { str: "Name", transform: [1, 0, 0, 1, 20, 80], width: 35 },
    { str: "Score", transform: [1, 0, 0, 1, 100, 80], width: 35 }
  ];
  assert.deepEqual(utils.groupPdfTextItems(items), [["يمين", "يسار"], ["Name", "Score"]]);
});

test("image placement preserves aspect ratio and centers both orientations", () => {
  assert.deepEqual(utils.fitImageToPage(400, 200, 100, 100), { x: 0, y: 25, width: 100, height: 50, scale: 0.25 });
  assert.deepEqual(utils.fitImageToPage(200, 400, 100, 100), { x: 25, y: 0, width: 50, height: 100, scale: 0.25 });
  assert.throws(() => utils.fitImageToPage(0, 200, 100, 100), /positive numbers/i);
});

test("large image canvas allocations stay within a pixel and dimension budget", () => {
  const dimensions = utils.getSafeCanvasDimensions(12000, 8000);
  assert.ok(dimensions.wasScaled);
  assert.ok(dimensions.width * dimensions.height <= 16000000);
  assert.ok(dimensions.width <= 8000 && dimensions.height <= 8000);
  assert.ok(Math.abs(dimensions.width / dimensions.height - 1.5) < 0.001);
  assert.equal(utils.getSafeCanvasDimensions(1, 1).width, 1);
  assert.throws(() => utils.getSafeCanvasDimensions(0, 8000), /positive numbers/i);
});
