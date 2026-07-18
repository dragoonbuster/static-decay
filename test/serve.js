'use strict';
/* Tiny dev server: `node test/serve.js [port]` then open http://localhost:8080
   Serves the repo root so index.html runs over http:// like production
   (Firebase calls work; file:// quirks avoided). Dev-only, does not ship. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const port = +(process.argv[2] || 8080);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};
http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const f = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath));
  if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log('SIGNAL DECAY dev server: http://localhost:' + port));
