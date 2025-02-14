/** Unfiorm Interface for all meshes to parse to. */
export interface MeshInterface {
  renderFormat: '2d' | '3d';
  colorOffset: Float32Array;
  vertexSize: Float32Array;
  positionOffset: Float32Array;
  uvOffset: Float32Array;
}
