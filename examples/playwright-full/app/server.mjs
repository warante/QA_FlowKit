import http from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4174);
const orders = [{ id: 'ORD-301', item: 'QA handbook', status: 'ready' }];

const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Orders</title></head>
  <body>
    <main>
      <h1>Orders</h1>
      <article aria-label="Order ORD-301">
        <strong>QA handbook</strong>
        <span data-testid="order-status">ready</span>
      </article>
    </main>
  </body>
</html>`;

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (request.url === '/api/orders') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ orders }));
    return;
  }
  if (request.url === '/orders' || request.url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(page);
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not-found' }));
});

server.listen(port, host);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
