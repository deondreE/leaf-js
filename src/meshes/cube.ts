export const cubeVertexSize = 4 * 10; // Byte size of one cube vertex.
export const cubePositionOffset = 0;
export const cubeColorOffset = 4 * 4; // Byte offset of cube vertex color attribute.
export const cubeUVOffset = 4 * 8;
export const cubeVertexCount = 36;

// prettier-ignore
export function createCubeVertexArray(size: number = 0.7): Float32Array {
  // prettier-ignore
  return new Float32Array([
   -size, -size, -size, 0.0, 0.0,
   size, -size, -size, 1.0, 0.0,
   size, size, -size, 1.0, 1.0,
   -size, size, -size, 0.0, 1.0,
   -size, -size, size, 0.0, 0.0,
   size, -size, size, 1.0, 0.0,
   size, size, size, 1.0, 1.0,
   -size, size, size, 0.0, 1.0,
   -size, -size, -size, 0.0, 0.0,
   -size, size, -size, 1.0, 0.0,
   -size, size, size, 1.0, 1.0,
   -size, -size, size, 0.0, 1.0,
   size, -size, -size, 0.0, 0.0,
   size, size, -size, 1.0, 0.0,
   size, size, size, 1.0, 1.0,
   size, -size, size, 0.0, 1.0,
   -size, -size, -size, 0.0, 0.0,
   size, -size, -size, 1.0, 0.0,
   size, -size, size, 1.0, 1.0,
   -size, -size, size, 0.0, 1.0,
   -size, size, -size, 0.0, 0.0,
   size, size, -size, 1.0, 0.0,
   size, size, size, 1.0, 1.0,
   -size, size, size, 0.0, 1.0,
  ]);
 }

export function createCubeIndexData(): Uint16Array {
  // prettier-ignore
  return new Uint16Array([
   0, 1, 2, 0, 2, 3,
   4, 5, 6, 4, 6, 7,
   8, 9, 10, 8, 10, 11,
   12, 13, 14, 12, 14, 15,
   16, 17, 18, 16, 18, 19,
   20, 21, 22, 20, 22, 23,
  ]);
}
