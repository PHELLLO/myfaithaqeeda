/**
 * A dependency-free local server for myfaithعقيده.
 * It serves the site and stores course content, learner progress, and points
 * in a SQLite database using Node's built-in sqlite module.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { networkInterfaces } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(import.meta.dirname);
const database = new DatabaseSync(resolve(root, 'learning_platform.db'));
const maxPayloadBytes = 2_000_000;

database.exec(`
  CREATE TABLE IF NOT EXISTS platform_state (
    state_key TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const readState = database.prepare(
  "SELECT state_json FROM platform_state WHERE state_key = 'current'"
);
const writeState = database.prepare(`
  INSERT INTO platform_state (state_key, state_json, updated_at)
  VALUES ('current', ?, CURRENT_TIMESTAMP)
  ON CONFLICT(state_key) DO UPDATE SET
    state_json = excluded.state_json,
    updated_at = CURRENT_TIMESTAMP
`);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

function validState(value) {
  return value && typeof value === 'object' && Array.isArray(value.courses) &&
    value.records && typeof value.records === 'object';
}

async function serveFile(response, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(root, `.${requested}`);
  if (!filePath.startsWith(`${root}\\`) && filePath !== root) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/api/state' && request.method === 'GET') {
    const row = readState.get();
    sendJson(response, 200, row ? JSON.parse(row.state_json) : null);
    return;
  }

  if (url.pathname === '/api/state' && request.method === 'POST') {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxPayloadBytes) request.destroy();
      else chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!validState(value)) return sendJson(response, 400, { error: 'Invalid platform state.' });
        writeState.run(JSON.stringify(value));
        return sendJson(response, 200, { saved: true });
      } catch {
        return sendJson(response, 400, { error: 'Expected valid JSON.' });
      }
    });
    return;
  }

  if (url.pathname === '/api/state') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  await serveFile(response, decodeURIComponent(url.pathname));
});

function localNetworkUrls() {
  return Object.values(networkInterfaces()).flat()
    .filter(network => network && network.family === 'IPv4' && !network.internal)
    .map(network => `http://${network.address}:8000`);
}

server.listen(8000, '0.0.0.0', () => {
  console.log('myfaithعقيده is ready at http://localhost:8000');
  localNetworkUrls().forEach(url => console.log(`Open on your phone (same Wi-Fi): ${url}`));
});
