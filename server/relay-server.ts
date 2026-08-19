/**
 * VaultSync WebSocket Blind Relay Server Executable Entry Point
 * Run with: npm run server (tsx server/relay-server.ts)
 */

import { BlindRelayServer } from './blind-relay-server';
import { RedisClusterAdapter } from './redis-adapter';

const PORT = parseInt(process.env['PORT'] || process.env['RELAY_PORT'] || '1234', 10);
const HOST = process.env['HOST'] || '0.0.0.0';
const REDIS_URL = process.env['REDIS_URL'];

console.log('='.repeat(60));
console.log('⚡ VaultSync Zero-Knowledge Blind Relay Server (11/10 Edition)');
console.log('='.repeat(60));

const clusterAdapter = new RedisClusterAdapter(REDIS_URL);
const server = new BlindRelayServer({
  port: PORT,
  host: HOST,
  clusterAdapter
});

// Periodic status report (every 60s)
const statsInterval = setInterval(() => {
  const stats = server.getStats();
  console.log(
    `[Relay Metrics] Connections: ${stats.activeConnections} | Rooms: ${stats.activeRooms} | Frames: ${stats.totalFramesRelayed} | Relayed: ${(stats.totalBytesRelayed / 1024).toFixed(2)} KB | Uptime: ${stats.uptimeSeconds}s`
  );
}, 60_000);

// Graceful Shutdown
async function shutdown(signal: string) {
  console.log(`\n[BlindRelayServer] Received ${signal}. Initiating graceful shutdown...`);
  clearInterval(statsInterval);
  await server.close();
  console.log('[BlindRelayServer] Cleanly stopped. Goodbye!');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
