export const quadVertexSize = 4 * 10; // Byte size of one quad vertex.
export const quadPositionOffset = 0;
export const quadColorOffset = 4 * 4; // Byte offset of quad vertex color attribute.
export const quadUVOffset = 4 * 8;
export const quadVertexCount = 6; // 2 triangles forming a quad

// TODO: Add Size changes, Make sure Uv / Normals are functioning as intended.

// prettier-ignore
export const quadVertexArray = new Float32Array([
  // float4 position, float4 color, float2 uv
  -1, -1, 0, 1,  1, 0, 0, 1,  0, 1,  // Bottom-left
   1, -1, 0, 1,  0, 1, 0, 1,  1, 1,  // Bottom-right
  -1,  1, 0, 1,  0, 0, 1, 1,  0, 0,  // Top-left

  -1,  1, 0, 1,  0, 0, 1, 1,  0, 0,  // Top-left
   1, -1, 0, 1,  0, 1, 0, 1,  1, 1,  // Bottom-right
   1,  1, 0, 1,  1, 1, 1, 1,  1, 0,  // Top-right
]);
