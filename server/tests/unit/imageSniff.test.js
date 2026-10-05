import { describe, it, expect } from 'vitest';

import { detectImageType } from '../../src/lib/imageSniff.js';

const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);

describe('detectImageType', () => {
  it('recognises PNG, JPEG and WebP by their signatures', () => {
    expect(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
  });

  it('recognises SVG after a prolog, doctype and comment', () => {
    const svg = '<?xml version="1.0"?><!DOCTYPE svg><!-- logo --><svg viewBox="0 0 1 1"></svg>';
    expect(detectImageType(Buffer.from(svg))).toBe('svg');
  });

  it('rejects anything else, whatever it is named', () => {
    expect(detectImageType(Buffer.from('<html><body>not an image</body></html>'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a..........'))).toBeNull();
    expect(detectImageType(Buffer.alloc(4))).toBeNull();
  });
});
