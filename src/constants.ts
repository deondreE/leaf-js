/** @internal These are all of the signal flags
 * Used directly for particle state values, this is in progress. **/
export const DERIVED = 1 << 1;
export const RENDER_EFFECT = 1 << 3;
export const CLEAN = 1 << 10;
export const DIRTY = 1 << 11;
export const MAYBE_DIRTY = 1 << 12;

export const DEFAULT_VIEW_FRUSTRUM: number = (Math.PI * 2) / 4;
export const DEFAULT_PIPELINE_BUFFERS: GPUVertexBufferLayout[] = [
  {
    arrayStride: 0x28,
    attributes: [
      {
        shaderLocation: 0,
        offset: 0,
        format: 'float32x4',
      },
      {
        shaderLocation: 1,
        offset: 0x20,
        format: 'float32x2',
      },
    ],
  },
];

export const DEFAULT_PRIMITIVE_STATE: GPUPrimitiveState = {
  topology: 'triangle-list',
  cullMode: 'back',
};

export const DEFAULT_DEPTH_STENCIL: GPUDepthStencilState = {
  depthWriteEnabled: true,
  depthCompare: 'less',
  format: 'depth32float',
};

export const SUPPORTED_FILETYPES = new Set(['.obj', '.stl', '.aseprite', '.ase']);
