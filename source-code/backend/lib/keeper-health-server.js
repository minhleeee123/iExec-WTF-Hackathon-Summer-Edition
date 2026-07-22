import http from 'node:http';
import { getHealthSnapshot } from './keeper-health.js';

export function startHealthServer({ health, port }) {
  const server = http.createServer((request, response) => {
    response.setHeader('access-control-allow-origin', '*');
    response.setHeader('cache-control', 'no-store');
    if (request.method !== 'GET' || request.url !== '/health') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not found' }));
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(getHealthSnapshot(health)));
  });
  server.listen(port, '0.0.0.0');
  return server;
}
