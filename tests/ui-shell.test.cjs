const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const shell = read("script/app-shell.js");
const styles = read("css/liquid-glass.css");

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
