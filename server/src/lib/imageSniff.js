/**
 * Identifies an uploaded image by its bytes, not by the name or MIME type the
 * browser claimed — both are chosen by whoever sends the file.
 *
 * Returns the file extension to store it under, or null when the bytes are
 * not one of the formats a logo may be.
 */
export const detectImageType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  // SVG: text whose first element is <svg>, after an optional XML prolog,
  // doctype and comments.
  const head = buffer.subarray(0, 1024).toString('utf8').replace(/^﻿/, '');
  const stripped = head
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trimStart();
  if (/^<svg[\s>]/i.test(stripped)) return 'svg';

  return null;
};
