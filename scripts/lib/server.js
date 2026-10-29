/** Minimal static file server for the project root, so the film loads over http like a website. */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
});

/**
 * @param {number} [port] 0 picks a free port.
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
export function startServer(port = 0) {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/');
    const file = normalize(join(ROOT, pathname));
    if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    const type = /** @type {Record<string, string>} */ (MIME_TYPES)[extname(file)];
    response.writeHead(200, { 'Content-Type': type ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve({
        url: `http://127.0.0.1:${actualPort}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done(undefined));
          }),
      });
    });
  });
}
