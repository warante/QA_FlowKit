import http from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4175);
const balance = { accountId: 'demo', amount: 125.5, currency: 'EUR' };

const server = http.createServer((request, response) => {
  if (request.url === '/api/accounts/demo/balance') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(balance));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not-found' }));
});

server.listen(port, host);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
