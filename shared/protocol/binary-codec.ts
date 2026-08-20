/**
 * Binary Codec for VaultSync Wire Protocol (11/10 Precision)
 * Encodes and decodes compact binary frames for high-throughput zero-knowledge WebSocket transport.
 * Header format: [Magic(1B), Version(1B), Type(1B), Reserved(1B), RoomLen(2B), PayloadLen(4B)] = 10 Bytes
 */

export enum MessageType {
  SYNC_STEP_1 = 0x01,
  SYNC_STEP_2 = 0x02,
  UPDATE = 0x03,
  AWARENESS = 0x04,
  ROOM_JOIN = 0x05,
  ROOM_LEAVE = 0x06,
  HEARTBEAT_PING = 0x09,
  HEARTBEAT_PONG = 0x0a
}

export interface BinaryFrame {
  protocolMagic: number; // 0x56 ('V')
  version: number;       // 0x01
  messageType: MessageType;
  roomId: string;        // Room identifier
  payload: Uint8Array;   // Encrypted chunk or raw awareness
}

export class BinaryCodec {
  public static readonly MAGIC = 0x56;   // 'V'
  public static readonly VERSION = 0x01; // Protocol version 1
  public static readonly HEADER_SIZE = 10;
  public static readonly MAX_ROOM_ID_LENGTH = 128; // Strict room length cap to prevent memory exhaustion
  public static readonly MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB safety cap
  public static readonly VALID_ROOM_ID_REGEX = /^[a-zA-Z0-9_.:\-]+$/;

  /**
   * Encodes a frame into a compact binary ArrayBuffer.
   */
  public static encode(
    messageType: MessageType,
    roomId: string,
    payload: Uint8Array = new Uint8Array(0)
  ): ArrayBuffer {
    const roomBytes = new TextEncoder().encode(roomId);
    const roomLen = roomBytes.length;
    const payloadLen = payload.length;

    if (roomLen > BinaryCodec.MAX_ROOM_ID_LENGTH) {
      throw new Error(`Room ID is too long: ${roomLen} bytes (max ${BinaryCodec.MAX_ROOM_ID_LENGTH})`);
    }

    if (roomId && !BinaryCodec.VALID_ROOM_ID_REGEX.test(roomId)) {
      throw new Error(`Invalid Room ID characters: "${roomId}". Must contain only alphanumeric, dash, underscore, colon, dot.`);
    }

    if (payloadLen > BinaryCodec.MAX_PAYLOAD_SIZE) {
      throw new Error(`Payload exceeds maximum allowed size of 10MB: ${payloadLen} bytes`);
    }

    const totalLength = BinaryCodec.HEADER_SIZE + roomLen + payloadLen;
    const buffer = new ArrayBuffer(totalLength);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // Write 10-byte header
    view.setUint8(0, BinaryCodec.MAGIC);
    view.setUint8(1, BinaryCodec.VERSION);
    view.setUint8(2, messageType);
    view.setUint8(3, 0x00); // Reserved byte
    view.setUint16(4, roomLen, false);    // Big-endian (2 bytes)
    view.setUint32(6, payloadLen, false); // Big-endian (4 bytes)

    // Write room string bytes (offset 10)
    uint8.set(roomBytes, BinaryCodec.HEADER_SIZE);

    // Write payload bytes (offset 10 + roomLen)
    if (payloadLen > 0) {
      uint8.set(payload, BinaryCodec.HEADER_SIZE + roomLen);
    }

    return buffer;
  }

  /**
   * Decodes a binary ArrayBuffer or Buffer into a structured BinaryFrame.
   */
  public static decode(buffer: ArrayBuffer | Uint8Array): BinaryFrame {
    const arrayBuffer = buffer instanceof Uint8Array 
      ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      : buffer;

    if (arrayBuffer.byteLength < BinaryCodec.HEADER_SIZE) {
      throw new Error(`Frame is too short: ${arrayBuffer.byteLength} bytes (minimum ${BinaryCodec.HEADER_SIZE} bytes required).`);
    }

    const view = new DataView(arrayBuffer);
    const uint8 = new Uint8Array(arrayBuffer);

    const magic = view.getUint8(0);
    const version = view.getUint8(1);
    const messageType = view.getUint8(2) as MessageType;
    const roomLen = view.getUint16(4, false);
    const payloadLen = view.getUint32(6, false);

    if (magic !== BinaryCodec.MAGIC) {
      throw new Error(`Invalid protocol magic byte: 0x${magic.toString(16).toUpperCase()} (expected 0x56)`);
    }

    if (version !== BinaryCodec.VERSION) {
      throw new Error(`Unsupported protocol version: ${version} (expected ${BinaryCodec.VERSION})`);
    }

    if (roomLen > BinaryCodec.MAX_ROOM_ID_LENGTH) {
      throw new Error(`Room ID in frame exceeds maximum allowed length of ${BinaryCodec.MAX_ROOM_ID_LENGTH} bytes (${roomLen} bytes declared).`);
    }

    const expectedTotal = BinaryCodec.HEADER_SIZE + roomLen + payloadLen;
    if (expectedTotal > view.byteLength) {
      throw new Error(`Frame truncated: declared total size ${expectedTotal} bytes exceeds received buffer size ${view.byteLength} bytes.`);
    }

    const roomBytes = uint8.subarray(BinaryCodec.HEADER_SIZE, BinaryCodec.HEADER_SIZE + roomLen);
    const roomId = new TextDecoder().decode(roomBytes);

    if (roomId && !BinaryCodec.VALID_ROOM_ID_REGEX.test(roomId)) {
      throw new Error(`Invalid Room ID format in received frame: "${roomId}"`);
    }

    const payloadOffset = BinaryCodec.HEADER_SIZE + roomLen;
    const payload = uint8.subarray(payloadOffset, payloadOffset + payloadLen);

    return {
      protocolMagic: magic,
      version,
      messageType,
      roomId,
      payload
    };
  }
}
