import { mat3, Mat3, mat4, Mat4 } from 'wgpu-matrix';
import { assert } from './utils/util';

export type RndrType = '2d' | '3d';
export type RenderResizeHandler<T extends RndrType> = (rndr: Rndr<T>) => void;
interface RndrConstOptions<T extends RndrType> {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  onResize: RenderResizeHandler<T>;
}
export default class Rndr<T extends RndrType> {
  type: T;
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  ctx: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
  renderPassDescriptor: GPURenderPassDescriptor;
  passEncoder: GPURenderPassEncoder;
  vertexBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  pipeline: GPURenderPipeline;
  depthTexture: GPUTexture;
  uniformBindGroup: GPUBindGroup;
  projectionMatrix: T extends '2d' ? Mat3 : Mat4;
  worldMatrix: T extends '2d' ? Mat3 : Mat4;
  resizeObserver: ResizeObserver;

  private constructor({ onResize }: RndrConstOptions<T>) {
    this.resizeObserver = new ResizeObserver(() => {
      onResize(this);
    });
  }

  static async initCommon(selector: string) {
    assert(!!navigator.gpu, 'No WebGPU available');
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    assert(!!canvas);
    const devicePixelRatio = window.devicePixelRatio;
    const format = navigator.gpu.getPreferredCanvasFormat();
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    assert(!!context);
    context.configure({ device, format });
    return { device, presentationFormat, canvas, devicePixelRatio, format };
  }

  static async init2d(selector: string): Promise<Rndr<'2d'>> {
    //todo models
    const { canvas, devicePixelRatio, ...rest } = await this.initCommon(selector);

    //a 2d perspective matrix isnt really a perspect
    const onResize = (rndr: Rndr<'2d'>) => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      rndr.projectionMatrix = mat3.create(
        2 / canvas.width,
        0,
        -1,
        0,
        -2 / canvas.height,
        1,
        0,
        0,
        1,
      );
      rndr.worldMatrix = mat3.identity();
    };
    const width = canvas.clientWidth * devicePixelRatio;
    const height = canvas.clientHeight * devicePixelRatio;
    const projectionMatrix = mat3.create();
    return new Rndr();
  }

  static init3d(selector: string) {}
}
