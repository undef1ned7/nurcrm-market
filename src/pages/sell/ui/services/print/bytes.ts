export const ESC = (...b: number[]) => new Uint8Array(b);

export const chunkBytes = (u8: Uint8Array, size = 12 * 1024) => {
  const out: Uint8Array[] = [];
  for (let i = 0; i < u8.length; i += size) out.push(u8.subarray(i, i + size));
  return out;
};
