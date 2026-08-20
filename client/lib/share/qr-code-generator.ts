/**
 * Pure TypeScript QR Code Generator (Zero external dependencies)
 * Generates standards-compliant QR Code matrix and SVG render string.
 */

// QR Code specification constants & Galois Field tables
const GF256_EXP: number[] = new Array(512).fill(0);
const GF256_LOG: number[] = new Array(256).fill(0);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  GF256_LOG[0] = 0;
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  const logA = GF256_LOG[a] ?? 0;
  const logB = GF256_LOG[b] ?? 0;
  return GF256_EXP[(logA + logB) % 255] ?? 0;
}

function gfPolyMultiply(p1: number[], p2: number[]): number[] {
  const result: number[] = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    const val1 = p1[i] ?? 0;
    for (let j = 0; j < p2.length; j++) {
      const val2 = p2[j] ?? 0;
      const current = result[i + j] ?? 0;
      result[i + j] = current ^ gfMultiply(val1, val2);
    }
  }
  return result;
}

function getGeneratorPoly(degree: number): number[] {
  let poly: number[] = [1];
  for (let i = 0; i < degree; i++) {
    const expVal = GF256_EXP[i] ?? 0;
    poly = gfPolyMultiply(poly, [1, expVal]);
  }
  return poly;
}

function calculateReedSolomon(data: number[], ecCount: number): number[] {
  const gen = getGeneratorPoly(ecCount);
  const result = [...data, ...new Array(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const factor = result[i] ?? 0;
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        const genVal = gen[j] ?? 0;
        const resVal = result[i + j] ?? 0;
        result[i + j] = resVal ^ gfMultiply(genVal, factor);
      }
    }
  }
  return result.slice(data.length);
}

// Version table capacities (Byte mode, Error Correction Level L)
const VERSION_CAPACITIES_L = [
  0, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858
];

const EC_CODEWORDS_PER_BLOCK_L = [
  0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28
];

const NUM_BLOCKS_L = [
  0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8
];

const ALIGNMENT_PATTERN_POSITIONS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90]
];

export class SimpleQRCode {
  public static generateMatrix(text: string): boolean[][] {
    const utf8Bytes = new TextEncoder().encode(text);
    let version = 1;
    while (version < VERSION_CAPACITIES_L.length && utf8Bytes.length > (VERSION_CAPACITIES_L[version] ?? 0)) {
      version++;
    }
    if (version >= VERSION_CAPACITIES_L.length) {
      version = VERSION_CAPACITIES_L.length - 1;
    }

    const size = 17 + 4 * version;
    const matrix: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));
    const isReserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

    // 1. Finder Patterns (Top-Left, Top-Right, Bottom-Left)
    function placeFinder(row: number, col: number) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const nr = row + r;
          const nc = col + c;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            const isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            const rowArr = matrix[nr];
            const resArr = isReserved[nr];
            if (rowArr && resArr) {
              rowArr[nc] = isBlack;
              resArr[nc] = true;
            }
          }
        }
      }
    }

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // 2. Alignment Patterns
    const alignPos = ALIGNMENT_PATTERN_POSITIONS[version] || [];
    for (const r of alignPos) {
      for (const c of alignPos) {
        const resRow = isReserved[r];
        if (resRow && resRow[c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            const rowArr = matrix[r + dr];
            const resArr = isReserved[r + dr];
            if (rowArr && resArr) {
              rowArr[c + dc] = isBlack;
              resArr[c + dc] = true;
            }
          }
        }
      }
    }

    // 3. Timing Patterns
    for (let i = 8; i < size - 8; i++) {
      const row6 = matrix[6];
      const res6 = isReserved[6];
      if (res6 && !res6[i] && row6) {
        row6[i] = i % 2 === 0;
        res6[i] = true;
      }
      const rowI = matrix[i];
      const resI = isReserved[i];
      if (resI && !resI[6] && rowI) {
        rowI[6] = i % 2 === 0;
        resI[6] = true;
      }
    }

    // 4. Dark Module
    const darkRow = 4 * version + 9;
    if (matrix[darkRow] && isReserved[darkRow]) {
      matrix[darkRow]![8] = true;
      isReserved[darkRow]![8] = true;
    }

    // 5. Reserve Format Info Area
    for (let i = 0; i < 9; i++) {
      if (isReserved[8] && !isReserved[8]![i]) isReserved[8]![i] = true;
      if (isReserved[i] && !isReserved[i]![8]) isReserved[i]![8] = true;
      if (size - 1 - i < size) {
        if (isReserved[8] && !isReserved[8]![size - 1 - i]) isReserved[8]![size - 1 - i] = true;
        if (isReserved[size - 1 - i] && !isReserved[size - 1 - i]![8]) isReserved[size - 1 - i]![8] = true;
      }
    }

    // 6. Encode Data (Byte mode: 0100)
    const bitBuffer: number[] = [];
    function pushBits(val: number, length: number) {
      for (let i = length - 1; i >= 0; i--) {
        bitBuffer.push((val >>> i) & 1);
      }
    }

    pushBits(0b0100, 4);
    const countBits = version < 10 ? 8 : 16;
    pushBits(utf8Bytes.length, countBits);
    for (const b of utf8Bytes) {
      pushBits(b, 8);
    }

    const totalDataCapacityBits = (VERSION_CAPACITIES_L[version] ?? 17) * 8;
    while (bitBuffer.length < totalDataCapacityBits && bitBuffer.length % 8 !== 0) {
      bitBuffer.push(0);
    }
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bitBuffer.length < totalDataCapacityBits) {
      const pByte = padBytes[padIdx++ % 2] ?? 0xec;
      pushBits(pByte, 8);
    }

    const dataBytes: number[] = [];
    for (let i = 0; i < bitBuffer.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        b = (b << 1) | (bitBuffer[i + j] || 0);
      }
      dataBytes.push(b);
    }

    // 7. Error Correction Coding (Reed-Solomon)
    const numBlocks = NUM_BLOCKS_L[version] || 1;
    const ecCount = EC_CODEWORDS_PER_BLOCK_L[version] || 7;
    const blockSize = Math.floor(dataBytes.length / numBlocks);
    
    const blocks: number[][] = [];
    const ecBlocks: number[][] = [];
    for (let b = 0; b < numBlocks; b++) {
      const blockData = dataBytes.slice(b * blockSize, (b + 1) * blockSize);
      blocks.push(blockData);
      ecBlocks.push(calculateReedSolomon(blockData, ecCount));
    }

    const finalCodewords: number[] = [];
    for (let i = 0; i < blockSize; i++) {
      for (let b = 0; b < numBlocks; b++) {
        const blk = blocks[b];
        if (blk && blk[i] !== undefined) {
          finalCodewords.push(blk[i]!);
        }
      }
    }
    for (let i = 0; i < ecCount; i++) {
      for (let b = 0; b < numBlocks; b++) {
        const ecBlk = ecBlocks[b];
        if (ecBlk && ecBlk[i] !== undefined) {
          finalCodewords.push(ecBlk[i]!);
        }
      }
    }

    // 8. Place Data into Matrix
    const finalBits: number[] = [];
    for (const cw of finalCodewords) {
      for (let i = 7; i >= 0; i--) {
        finalBits.push((cw >>> i) & 1);
      }
    }

    let bitIdx = 0;
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      const rows = upward
        ? Array.from({ length: size }, (_, i) => size - 1 - i)
        : Array.from({ length: size }, (_, i) => i);

      for (const row of rows) {
        for (const c of [col, col - 1]) {
          const resRow = isReserved[row];
          const matRow = matrix[row];
          if (resRow && !resRow[c] && matRow) {
            const bit = bitIdx < finalBits.length ? (finalBits[bitIdx++] ?? 0) : 0;
            const mask = (row + c) % 2 === 0;
            matRow[c] = (bit === 1) !== mask;
          }
        }
      }
      upward = !upward;
    }

    // 9. Format Information
    const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
    const row8 = matrix[8];
    if (row8) {
      for (let i = 0; i < 6; i++) row8[i] = formatBits[i] === 1;
      row8[7] = formatBits[6] === 1;
      row8[8] = formatBits[7] === 1;
      for (let i = 8; i < 15; i++) {
        if (size - 15 + i >= 0 && size - 15 + i < size) {
          row8[size - 15 + i] = formatBits[i] === 1;
        }
      }
    }
    if (matrix[7]) matrix[7]![8] = formatBits[8] === 1;
    for (let i = 9; i < 15; i++) {
      if (matrix[14 - i]) matrix[14 - i]![8] = formatBits[i] === 1;
    }
    for (let i = 0; i < 8; i++) {
      if (matrix[size - 1 - i]) matrix[size - 1 - i]![8] = formatBits[i] === 1;
    }

    return matrix.map(row => row.map(cell => cell ?? false));
  }

  public static toSVG(text: string, sizePx = 220, fgColor = '#000000', bgColor = '#ffffff'): string {
    const matrix = this.generateMatrix(text);
    const count = matrix.length;
    const margin = 2;
    const totalSize = count + margin * 2;
    const cellSize = (sizePx / totalSize).toFixed(2);

    let rects = '';
    for (let r = 0; r < count; r++) {
      const row = matrix[r];
      if (!row) continue;
      for (let c = 0; c < count; c++) {
        if (row[c]) {
          const x = (c + margin) * parseFloat(cellSize);
          const y = (r + margin) * parseFloat(cellSize);
          rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellSize}" height="${cellSize}" fill="${fgColor}" rx="1" />`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" class="rounded-xl shadow-xs"><rect width="100%" height="100%" fill="${bgColor}" rx="12" />${rects}</svg>`;
  }
}
