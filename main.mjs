import http from 'node:http';
import net from 'node:net';
import 'dotenv/config';
 
const {
  BYPASS_DOMAINS: bypassDomainsEnv = "",
  IP: notebookIpEnv = "",
  PORT: notebookPortEnv = "8080"
} = process.env;
 
const BYPASS_DOMAINS = bypassDomainsEnv.split(',');
const NOTEBOOK_IP = notebookIpEnv;
const NOTEBOOK_PORT = Number(notebookPortEnv);
const PORT = Number(notebookPortEnv);
 
const server = http.createServer((_req, res) => {
  res.writeHead(400);
  res.end('Solo HTTPS soportado via CONNECT');
});
 
server.on('connect', (req, clientSocket, head) => {
  const host = req.url.split(':')[0];
  const port = parseInt(req.url.split(':')[1]) || 443;
 
  if (BYPASS_DOMAINS.includes(host)) {
    const serverSocket = net.connect(port, host, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });
 
    serverSocket.on('error', (err) => {
      console.error(`[BYPASS] Error conectando a ${host}:`, err.message);
      clientSocket.destroy();
    });
 
    return;
  }
 
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
    console.error(`[PROXY] Error conectando a notebook:`, err.message);
    clientSocket.destroy();
  });
 
  clientSocket.on('error', (err) => {
    console.error(`[CLIENT] Error:`, err.message);
    serverSocket.destroy();
  });
});
 
server.listen(PORT, () => {
  console.log(`Proxy local corriendo en :${PORT}`);
  console.log(`Forwarding a notebook: ${NOTEBOOK_IP}:${NOTEBOOK_PORT}`);
  console.log(`Bypass dominios: ${BYPASS_DOMAINS.join(', ')}`);
});