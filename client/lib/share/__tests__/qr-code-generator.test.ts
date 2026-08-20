import { describe, it, expect } from 'vitest';
import { SimpleQRCode } from '../qr-code-generator';

describe('SimpleQRCode Generator', () => {
  it('generates a valid QR code matrix for basic URLs', () => {
    const url = 'http://localhost:5173/?room=doc-quicknotes&key=test12345';
    const matrix = SimpleQRCode.generateMatrix(url);
    expect(matrix).toBeDefined();
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix[0]?.length).toBe(matrix.length);
  });

  it('generates a clean SVG string with rounded corners and rects', () => {
    const url = 'http://192.168.1.100:5173/?folder=folder-1&key=abc';
    const svg = SimpleQRCode.toSVG(url, 240);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 240 240"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('</svg>');
  });
});
