/**
 * High-Throughput Zero-Knowledge WebSocket Blind Relay Server (11/10 Precision)
 * Multiplexes and broadcasts encrypted binary CRDT chunks across room subscribers without decryption.
 * Complies strictly with VaultSync Wire Protocol (Magic 0x56, 10-byte binary header).
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { BinaryCodec, MessageType, BinaryFrame } from '../shared/protocol/binary-codec';
import { RelayClusterAdapter, InMemoryClusterAdapter } from './redis-adapter';

export interface ClientConnection {
  socket: WebSocket;
  rooms: Set<string>;
  lastHeartbeat: number;
  ip: string;
  connectedAt: number;
}

export interface RelayServerStats {
  activeConnections: number;
  activeRooms: number;
  totalFramesRelayed: number;
  totalBytesRelayed: number;
  uptimeSeconds: number;
  nodeId: string;
}

export interface BlindRelayServerOptions {
  port?: number | undefined;
  host?: string | undefined;
  maxPayload?: number | undefined;
  clusterAdapter?: RelayClusterAdapter | undefined;
}

export class BlindRelayServer {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientConnection>();
  private rooms = new Map<string, Set<WebSocket>>();
  private clusterAdapter: RelayClusterAdapter;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private startedAt = Date.now();
  private totalFramesRelayed = 0;
  private totalBytesRelayed = 0;
  public readonly nodeId = randomUUID();

  constructor(options: BlindRelayServerOptions = {}) {
    const port = options.port ?? 1234;
    const host = options.host ?? '0.0.0.0';
    const maxPayload = options.maxPayload ?? BinaryCodec.MAX_PAYLOAD_SIZE;

    this.clusterAdapter = options.clusterAdapter ?? new InMemoryClusterAdapter();

    this.wss = new WebSocketServer({
      port,
      host,
      maxPayload
    });

    this.setupListeners();
    this.setupHeartbeatInterval();

    console.log(`[BlindRelayServer] 🛡️ Zero-Knowledge Relay running at ws://${host}:${port}`);
  }

  private setupListeners(): void {
    this.wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      const ip = req.socket.remoteAddress || 'unknown';
      const client: ClientConnection = {
        socket,
        rooms: new Set(),
        lastHeartbeat: Date.now(),
        ip,
        connectedAt: Date.now()
      };

      this.clients.set(socket, client);

      socket.on('message', (data: ArrayBuffer | Buffer | Buffer[], isBinary: boolean) => {
        if (!isBinary) {
          // Strictly drop non-binary / plaintext frames to prevent payload inspection or injection
          return;
        }

        try {
          let rawBuffer: ArrayBuffer;
          if (data instanceof Buffer) {
            rawBuffer = new ArrayBuffer(data.byteLength);
            new Uint8Array(rawBuffer).set(data);
          } else if (data instanceof ArrayBuffer) {
            rawBuffer = data;
          } else if (Array.isArray(data)) {
            const buf = Buffer.concat(data);
            rawBuffer = new ArrayBuffer(buf.byteLength);
            new Uint8Array(rawBuffer).set(buf);
          } else {
            return;
          }

          const frame = BinaryCodec.decode(rawBuffer);
          this.handleFrame(socket, client, frame, rawBuffer);
        } catch (err) {
          console.warn(`[BlindRelayServer] Dropped malformed frame from ${ip}:`, (err as Error).message);
        }
      });

      socket.on('close', () => {
        this.cleanupClient(socket, client);
      });

      socket.on('error', (err) => {
        console.error(`[BlindRelayServer] Socket error from ${ip}:`, err);
        this.cleanupClient(socket, client);
      });

      socket.on('pong', () => {
        client.lastHeartbeat = Date.now();
      });
    });

    this.wss.on('error', (err) => {
      console.error('[BlindRelayServer] Server level error:', err);
    });
  }

  private handleFrame(
    senderSocket: WebSocket,
    client: ClientConnection,
    frame: BinaryFrame,
    rawBuffer: ArrayBuffer
  ): void {
    const { messageType, roomId } = frame;
    client.lastHeartbeat = Date.now();

    switch (messageType) {
      case MessageType.ROOM_JOIN: {
        client.rooms.add(roomId);
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
          // Subscribe cluster adapter to room channel
          this.clusterAdapter.subscribe(roomId, (clusterMessage, publisherNodeId) => {
            // Only broadcast if the message originated from a DIFFERENT relay node
            if (publisherNodeId !== this.nodeId) {
              this.broadcastToLocalRoom(roomId, clusterMessage, null);
            }
          });
        }
        this.rooms.get(roomId)!.add(senderSocket);
        break;
      }

      case MessageType.ROOM_LEAVE: {
        client.rooms.delete(roomId);
        const subs = this.rooms.get(roomId);
        if (subs) {
          subs.delete(senderSocket);
          if (subs.size === 0) {
            this.rooms.delete(roomId);
            this.clusterAdapter.unsubscribe(roomId);
          }
        }
        break;
      }

      case MessageType.HEARTBEAT_PING: {
        const pong = BinaryCodec.encode(MessageType.HEARTBEAT_PONG, roomId);
        if (senderSocket.readyState === WebSocket.OPEN) {
          senderSocket.send(pong);
        }
        break;
      }

      case MessageType.HEARTBEAT_PONG: {
        // Heartbeat ACK recorded
        break;
      }

      case MessageType.SYNC_STEP_1:
      case MessageType.SYNC_STEP_2:
      case MessageType.UPDATE:
      case MessageType.AWARENESS: {
        // Blindly broadcast encrypted payload to all OTHER subscribers on this node
        this.broadcastToLocalRoom(roomId, rawBuffer, senderSocket);
        // Distribute to multi-node cluster subscribers with origin nodeId
        this.clusterAdapter.publish(roomId, rawBuffer, this.nodeId);

        this.totalFramesRelayed++;
        this.totalBytesRelayed += rawBuffer.byteLength;
        break;
      }

      default:
        console.warn(`[BlindRelayServer] Received unhandled message type: ${messageType}`);
    }
  }

  /**
   * Broadcasts binary buffer to all local clients in a room except the excluded socket.
   */
  private broadcastToLocalRoom(
    roomId: string,
    rawBuffer: ArrayBuffer,
    excludedSocket: WebSocket | null
  ): void {
    const subs = this.rooms.get(roomId);
    if (!subs || subs.size === 0) return;

    subs.forEach((subSocket) => {
      if (subSocket !== excludedSocket && subSocket.readyState === WebSocket.OPEN) {
        subSocket.send(rawBuffer);
      }
    });
  }

  private cleanupClient(socket: WebSocket, client: ClientConnection): void {
    client.rooms.forEach((roomId) => {
      const subs = this.rooms.get(roomId);
      if (subs) {
        subs.delete(socket);
        if (subs.size === 0) {
          this.rooms.delete(roomId);
          this.clusterAdapter.unsubscribe(roomId);
        }
      }
    });

    this.clients.delete(socket);
  }

  private setupHeartbeatInterval(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, socket) => {
        if (now - client.lastHeartbeat > 60_000) {
          // Terminate unresponsive dead sockets (inactive > 60s)
          socket.terminate();
          this.cleanupClient(socket, client);
        } else if (socket.readyState === WebSocket.OPEN) {
          // Ping active socket
          socket.ping();
        }
      });
    }, 30_000);
  }

  /**
   * Returns runtime metrics for operational monitoring.
   */
  public getStats(): RelayServerStats {
    return {
      activeConnections: this.clients.size,
      activeRooms: this.rooms.size,
      totalFramesRelayed: this.totalFramesRelayed,
      totalBytesRelayed: this.totalBytesRelayed,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      nodeId: this.nodeId
    };
  }

  /**
   * Gracefully terminates all connections and shuts down the server.
   */
  public close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    return new Promise((resolve, reject) => {
      this.clients.forEach((_, socket) => {
        try {
          socket.close(1001, 'Server shutting down');
        } catch {
          // ignore
        }
      });

      this.clients.clear();
      this.rooms.clear();
      this.clusterAdapter.close();

      this.wss.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
