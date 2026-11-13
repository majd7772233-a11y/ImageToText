const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createAppServer, resolveStaticPath, MIME_TYPES } = require("../scripts/serve.cjs");

test("the local server resolves only files inside the project root", () => {
  const root = path.resolve(__dirname, "..");
  const normal = resolveStaticPath("/index.html", root);
  assert.equal(normal, path.join(root, "index.html"));
  const traversal = resolveStaticPath("/%2e%2e/%2e%2e/Windows/win.ini", root);
  assert.ok(traversal === null || (traversal.startsWith(root + path.sep) && traversal !== root));
});

test("the local server advertises MIME types for browser runtimes and local assets", () => {
  assert.equal(MIME_TYPES[".wasm"], "application/wasm");
  assert.match(MIME_TYPES[".js"], /javascript/);
  assert.equal(MIME_TYPES[".woff2"], "font/woff2");
  assert.equal(MIME_TYPES[".gz"], "application/gzip");
});

test("the development server serves the app and local script assets over HTTP", async (t) => {
  const server = createAppServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const base = "http://127.0.0.1:" + address.port;
  const home = await fetch(base + "/");
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type") || "", /text\/html/);
  assert.match(await home.text(), /ImageToText/);

  const script = await fetch(base + "/script/format-utils.js");
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type") || "", /javascript/);
  assert.match(await script.text(), /parseCsv/);

  const missing = await fetch(base + "/not-a-real-file.js");
  assert.equal(missing.status, 404);
});
