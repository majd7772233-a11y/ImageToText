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
