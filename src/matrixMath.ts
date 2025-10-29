import { mat4 } from "wgpu-matrix";

function extractRotation(dst: mat4, src: mat4) {
  // Copy only rotation/scaling part
  mat4.copy(dst, src);
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;

  // Remove any scale distortion (normalize axes)
  const xLen = Math.hypot(dst[0], dst[1], dst[2]);
  const yLen = Math.hypot(dst[4], dst[5], dst[6]);
  const zLen = Math.hypot(dst[8], dst[9], dst[10]);
  if (xLen > 0) {
    dst[0] /= xLen;
    dst[1] /= xLen;
    dst[2] /= xLen;
  }
  if (yLen > 0) {
    dst[4] /= yLen;
    dst[5] /= yLen;
    dst[6] /= yLen;
  }
  if (zLen > 0) {
    dst[8] /= zLen;
    dst[9] /= zLen;
    dst[10] /= zLen;
  }
  return dst;
}

export { extractRotation };