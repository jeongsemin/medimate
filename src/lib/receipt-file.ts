// Receipt upload checks that don't need the network.

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Identifies the real image type from the file's first bytes. The client-supplied
 * MIME type and file name are never trusted.
 */
export function sniffImage(bytes: Uint8Array): "jpg" | "png" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return "png";
  return null;
}

export function isAcceptableSize(size: number): boolean {
  return size > 0 && size <= MAX_RECEIPT_BYTES;
}
