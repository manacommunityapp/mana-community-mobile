#!/usr/bin/env node
import os from 'os';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import net from 'net';
import { spawn } from 'child_process';
import { fileURLToPath, URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ── Default Targets ───────────────────────────────────────────
const CLOUD_API_URL = 'https://api.manacommunity.in';
const CLOUD_WS_URL  = 'wss://api.manacommunity.in/ws';
const DEFAULT_LOCAL_PORT = process.env.LOCAL_BACKEND_PORT || '8082';
const DEFAULT_PROXY_PORT = process.env.LOCAL_PROXY_PORT || '8085';

// ── Auto-Detect Physical LAN IPv4 (for physical mobile device connectivity) ──
function getLocalLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        const isWiFiOrEth = /wi-?fi|wlan|ethernet|eth|en/i.test(name);
        const isVirtual   = /vEthernet|virtual|docker|wsl|loopback|pseudo/i.test(name);
        candidates.push({ name, address: net.address, isWiFiOrEth, isVirtual });
      }
    }
  }

  // 1. Prefer physical Wi-Fi or Ethernet adapter
  const physicalAdapter = candidates.find((c) => c.isWiFiOrEth && !c.isVirtual);
  if (physicalAdapter) return physicalAdapter.address;

  // 2. Any non-virtual adapter
  const nonVirtual = candidates.find((c) => !c.isVirtual);
  if (nonVirtual) return nonVirtual.address;

  // 3. Fallback to any detected IPv4
  if (candidates.length > 0) return candidates[0].address;

  return 'localhost';
}

// ── Node Bridge Reverse Proxy (Bypasses Windows Firewall Blocking Java) ──
function startNodeBridgeProxy(proxyPort, targetPort) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const options = {
        hostname: 'localhost',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `localhost:${targetPort}`,
        },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on('error', (err) => {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Backend Unreachable',
            message: `Could not connect to local Spring Boot on port ${targetPort}. Is mana-community-service running?`,
            details: err.message,
          }));
        }
      });

      req.pipe(proxyReq, { end: true });
    });

    // Handle WebSocket upgrade
    server.on('upgrade', (req, socket, head) => {
      const proxySocket = net.connect(targetPort, 'localhost', () => {
        proxySocket.write(
          `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
          Object.keys(req.headers)
            .map((k) => `${k}: ${req.headers[k]}`)
            .join('\r\n') +
          '\r\n\r\n'
        );
        if (head && head.length > 0) {
          proxySocket.write(head);
        }
        proxySocket.pipe(socket);
        socket.pipe(proxySocket);
      });
      proxySocket.on('error', () => socket.destroy());
      socket.on('error', () => proxySocket.destroy());
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port already in use, probably a previously launched proxy
      } else {
        console.error('  [Bridge] Proxy error:', err.message);
      }
      resolve(server);
    });

    server.listen(proxyPort, '0.0.0.0', () => {
      resolve(server);
    });
  });
}

// ── Check if Backend is Reachable ─────────────────────────────
function checkHealth(baseUrl, timeoutMs = 3000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(baseUrl);
      const transport = u.protocol === 'https:' ? https : http;
      const req = transport.get(
        {
          hostname: u.hostname,
          port: u.port || 80,
          path: '/actuator/health',
          timeout: timeoutMs,
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

// ── Read / Update .env.local ───────────────────────────────────
function updateEnvLocal(apiUrl, wsUrl) {
  const envPath = path.resolve(projectRoot, '.env.local');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  const lines = content.split(/\r?\n/).filter((line) => {
    return !line.startsWith('EXPO_PUBLIC_API_URL=') && !line.startsWith('EXPO_PUBLIC_WS_URL=');
  });

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  lines.push(`EXPO_PUBLIC_API_URL=${apiUrl}`);
  lines.push(`EXPO_PUBLIC_WS_URL=${wsUrl}`);
  lines.push('');

  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
}

// ── Parse Arguments ───────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const backendKeywords = ['local', 'cloud', 'aws', 'remote', 'prod', 'dev'];

let targetBackend = null;
const expoArgs = [];

for (const arg of rawArgs) {
  const lower = arg.toLowerCase();
  if (backendKeywords.includes(lower)) {
    targetBackend = lower === 'dev' ? 'local' : lower;
  } else if (lower.startsWith('--backend=')) {
    targetBackend = lower.split('=')[1].toLowerCase();
  } else if (lower === '--local') {
    targetBackend = 'local';
  } else if (lower === '--cloud' || lower === '--aws' || lower === '--prod') {
    targetBackend = 'cloud';
  } else if (/^https?:\/\//i.test(arg)) {
    targetBackend = arg;
  } else {
    expoArgs.push(arg);
  }
}

// ── Determine URLs based on target ────────────────────────────
async function main() {
  const lanIp = getLocalLanIp();
  let selectedBackend = targetBackend;

  // If no backend argument was provided:
  if (!selectedBackend) {
    // Check if .env.local already specifies an API URL
    const envPath = path.resolve(projectRoot, '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^EXPO_PUBLIC_API_URL=(.+)$/m);
      if (match && match[1]) {
        selectedBackend = match[1].trim();
      }
    }
  }

  // Default fallback if still unspecified
  if (!selectedBackend) {
    selectedBackend = 'cloud';
  }

  let apiUrl = '';
  let wsUrl = '';
  let modeName = '';
  let proxyServer = null;

  const isLocalTarget = selectedBackend === 'local' || selectedBackend.includes('localhost') || selectedBackend.includes(lanIp);

  if (isLocalTarget) {
    // Start transparent Node bridge on port DEFAULT_PROXY_PORT (8085)
    // Windows Firewall allows Node.js, even if Java is blocked!
    proxyServer = await startNodeBridgeProxy(Number(DEFAULT_PROXY_PORT), Number(DEFAULT_LOCAL_PORT));

    modeName = `LOCAL (Spring Boot port ${DEFAULT_LOCAL_PORT} via Node Firewall-Bridge port ${DEFAULT_PROXY_PORT})`;
    apiUrl = `http://${lanIp}:${DEFAULT_PROXY_PORT}`;
    wsUrl  = `ws://${lanIp}:${DEFAULT_PROXY_PORT}/ws`;
  } else if (['cloud', 'aws', 'remote', 'prod'].includes(selectedBackend)) {
    modeName = 'CLOUD (AWS Lightsail)';
    apiUrl = CLOUD_API_URL;
    wsUrl  = CLOUD_WS_URL;
  } else if (/^https?:\/\//i.test(selectedBackend)) {
    modeName = `CUSTOM (${selectedBackend})`;
    apiUrl = selectedBackend.replace(/\/api\/?$/, '');
    wsUrl  = apiUrl.replace(/^http/i, 'ws') + '/ws';
  } else {
    // Fallback to local
    proxyServer = await startNodeBridgeProxy(Number(DEFAULT_PROXY_PORT), Number(DEFAULT_LOCAL_PORT));
    modeName = `LOCAL (Spring Boot port ${DEFAULT_LOCAL_PORT} via Node Firewall-Bridge port ${DEFAULT_PROXY_PORT})`;
    apiUrl = `http://${lanIp}:${DEFAULT_PROXY_PORT}`;
    wsUrl  = `ws://${lanIp}:${DEFAULT_PROXY_PORT}/ws`;
  }

  // Update .env.local so Metro and Expo Go read the exact chosen backend
  updateEnvLocal(apiUrl, wsUrl);

  // Set environment in current process
  process.env.EXPO_PUBLIC_API_URL = apiUrl;
  process.env.EXPO_PUBLIC_WS_URL  = wsUrl;

  // Print Banner
  console.log('\n============================================================');
  console.log('  🚀 MANA COMMUNITY MOBILE - STARTING EXPO SERVER');
  console.log('============================================================');
  console.log(`  Backend Mode  : ${modeName}`);
  console.log(`  API Base URL  : ${apiUrl}/api`);
  console.log(`  WebSocket URL : ${wsUrl}`);
  if (selectedBackend === 'local') {
    console.log(`  Your PC LAN IP: ${lanIp}`);
    console.log('  Note          : Ensure your phone is on the same Wi-Fi!');
  }
  console.log('------------------------------------------------------------');

  // Check health non-blockingly or with quick ping
  const isHealthy = await checkHealth(apiUrl, 1500);
  if (isHealthy) {
    console.log('  Backend Status: \x1b[32m✔ ONLINE & RESPONDING\x1b[0m');
  } else {
    console.log('  Backend Status: \x1b[33m⚠ NOT RESPONDING (Ensure server is started)\x1b[0m');
  }
  console.log('============================================================\n');

  // Launch Expo
  // Default to --go (Expo Go) unless --dev-client is explicitly passed,
  // since expo-dev-client is in package.json and would otherwise force Dev Build mode.
  const isDevClient = expoArgs.includes('--dev-client') || expoArgs.includes('-d');
  const hasGoFlag = expoArgs.includes('--go') || expoArgs.includes('-g');
  if (!isDevClient && !hasGoFlag) {
    expoArgs.unshift('--go');
  }

  const isWindows = process.platform === 'win32';
  const finalExpoArgs = ['expo', 'start', ...expoArgs];
  const fullCmd = isWindows ? `npx ${finalExpoArgs.join(' ')}` : 'npx';

  console.log(`Running: ${isWindows ? fullCmd : `npx ${finalExpoArgs.join(' ')}`}\n`);

  const child = isWindows
    ? spawn(fullCmd, {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          EXPO_PUBLIC_API_URL: apiUrl,
          EXPO_PUBLIC_WS_URL: wsUrl,
        },
      })
    : spawn('npx', finalExpoArgs, {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          EXPO_PUBLIC_API_URL: apiUrl,
          EXPO_PUBLIC_WS_URL: wsUrl,
        },
      });

  child.on('close', (code) => {
    if (proxyServer) {
      try { proxyServer.close(); } catch {}
    }
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
