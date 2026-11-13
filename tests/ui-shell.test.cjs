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
  assert.match(heroRenderer, /data-renderer="fallback"/);
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
