"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".gz": "application/gzip",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip"
});

function resolveStaticPath(requestUrl, rootDirectory = ROOT) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
  } catch {
    return null;
  }

  if (pathname.includes("\0")) return null;
  const relative = pathname.replace(/^[/\\]+/, "") || "index.html";
  const root = path.resolve(rootDirectory);
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  if (target === root) return path.join(root, "index.html");
  if (target.split(path.sep).some((segment) => segment === ".git")) return null;
  return target;
}

function createAppServer(options = {}) {
  const rootDirectory = path.resolve(options.rootDirectory || ROOT);

  return http.createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, {
        "Allow": "GET, HEAD",
        "Cache-Control": "no-store"
      });
      response.end("Method Not Allowed");
      return;
    }

    const target = resolveStaticPath(request.url || "/", rootDirectory);
    if (!target) {
      response.writeHead(400, { "Cache-Control": "no-store" });
      response.end("Invalid path");
      return;
    }

    try {
      const rootRealPath = await fs.promises.realpath(rootDirectory);
      let realPath = await fs.promises.realpath(target);
      if (realPath !== rootRealPath && !realPath.startsWith(rootRealPath + path.sep)) {
        response.writeHead(403, { "Cache-Control": "no-store" });
        response.end("Forbidden");
        return;
      }

      let stat = await fs.promises.stat(realPath);
      if (stat.isDirectory()) {
        realPath = path.join(realPath, "index.html");
        stat = await fs.promises.stat(realPath);
      }
      if (!stat.isFile()) {
        response.writeHead(404, { "Cache-Control": "no-store" });
        response.end("Not Found");
        return;
      }

      const extension = path.extname(realPath).toLowerCase();
      const contentType = MIME_TYPES[extension] || "application/octet-stream";
      response.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY"
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      const stream = fs.createReadStream(realPath);
      stream.on("error", () => {
        if (!response.headersSent) response.writeHead(500);
        response.end("Unable to read file");
      });
      stream.pipe(response);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        response.writeHead(404, { "Cache-Control": "no-store" });
        response.end("Not Found");
        return;
      }
      console.error("Local static server error:", error);
      response.writeHead(500, { "Cache-Control": "no-store" });
      response.end("Internal Server Error");
    }
  });
}

if (require.main === module) {
  const port = Number.parseInt(process.env.PORT || "8000", 10);
  const host = process.env.HOST || "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  const server = createAppServer();
  server.listen(port, host, () => {
    console.log("ImageToText local server: http://" + host + ":" + port);
    console.log("Press Ctrl+C to stop.");
  });
}

module.exports = { createAppServer, resolveStaticPath, MIME_TYPES };
