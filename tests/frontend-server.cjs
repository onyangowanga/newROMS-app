const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!/^(index\.html|styles\.css|tailwind\.css|manifest\.webmanifest|sw\.js|js\/[^/]+\.js|icons\/[^/]+)$/.test(relative)) { response.writeHead(404); return response.end(); }
  const filename = path.join(root, relative);
  if (!fs.existsSync(filename)) { response.writeHead(404); return response.end(); }
  response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(filename).pipe(response);
}).listen(4177, '127.0.0.1', () => console.log('ROMS frontend: http://127.0.0.1:4177'));