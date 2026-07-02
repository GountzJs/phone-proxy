import http from 'node:http';
import net from 'node:net';
import 'dotenv/config';

const {
  PROXY_DOMAINS: proxyDomainsEnv = "",
  IP: notebookIpEnv = "",
  NOTEBOOK_PORT: notebookPortEnv = "8080",
  PORT: portEnv = "9090"
} = process.env;

const PROXY_DOMAINS = proxyDomainsEnv.split(',');
const NOTEBOOK_IP = notebookIpEnv;
const NOTEBOOK_PORT = Number(notebookPortEnv);
const PORT = Number(portEnv);

const server = http.createServer((_req, res) => {
  res.writeHead(400);
  res.end('Solo HTTPS soportado via CONNECT');
});

server.on('connect', (req, clientSocket, head) => {
  const host = req.url.split(':')[0];
  const port = parseInt(req.url.split(':')[1]) || 443;

  if (PROXY_DOMAINS.includes(host)) {
    console.log(`[FORWARD] ${req.url} → ${NOTEBOOK_IP}:${NOTEBOOK_PORT}`);
    const serverSocket = net.connect(NOTEBOOK_PORT, NOTEBOOK_IP, () => {
      serverSocket.write(`CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\n\r\n`);
      serverSocket.once('data', () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });
    });

    serverSocket.on('error', (err) => {
      console.error(`[FORWARD] Error:`, err.message);
      clientSocket.destroy();
    });

    clientSocket.on('error', (err) => {
      console.error(`[CLIENT] Error:`, err.message);
      serverSocket.destroy();
    });

    return;
  }

  console.log(`[BYPASS] ${host}`);
  const serverSocket = net.connect(port, host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error(`[BYPASS] Error:`, err.message);
    clientSocket.destroy();
  });
});

server.listen(PORT, () => {
  console.log(`Proxy local corriendo en :${PORT}`);
  console.log(`Forwarding a notebook: ${NOTEBOOK_IP}:${NOTEBOOK_PORT}`);
  console.log(`Dominios proxeados: ${PROXY_DOMAINS.join(', ')}`);
});