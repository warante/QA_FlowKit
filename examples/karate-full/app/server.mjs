import http from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);

const profile = { id: 201, name: 'Ada Lovelace', role: 'QA Engineer' };
const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Profile</title></head>
  <body>
    <main>
      <h1>User profile</h1>
      <p data-testid="profile-name">${profile.name}</p>
      <p>${profile.role}</p>
    </main>
  </body>
</html>`;

const server = http.createServer((request, response) => {
  if (request.url === '/api/profile') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(profile));
    return;
  }
  if (request.url === '/profile' || request.url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(page);
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not-found' }));
});

server.listen(port, host, () => {
  console.log(`READY http://${host}:${server.address().port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
