/**
 * These constants are being placed here to allow for assumption while still offering a highly granular interface
 * @todo - lazy cache shader programs per device once compiled.
 * @file
 */

export const DEFAULT_VIEW_FRUSTRUM: number = (Math.PI * 2) / 5;
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

export type SUPPORTED_FILETYPES = ".obj" | ".fbx" | ".asesprite";
