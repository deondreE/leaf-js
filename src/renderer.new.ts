import { mat4 } from 'gl-matrix';
import OBJParser from './parsers/obj';
import STLParser from './parsers/stl';

import AssetBuilder from './assetloading/build';
import { Model } from './types/scene.types';
import { v4 as uuid } from 'uuid';
import Camera from './camera';

/** Currently Supports static file definitions. */
class Renderer3D {
  canvas?: HTMLCanvasElement;
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  format: GPUTextureFormat | null = null;
  renderTexture: GPUTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(fileName: string) {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.error('No WebGPU adapter found.');
      return;
    }

    this.device = await adapter.requestDevice();
    this.context = this.canvas!.getContext('webgpu');
    this.format = navigator.gpu.getPreferredCanvasFormat();

    if (!this.device || !this.context || !this.format) {
      console.error('Failed to initialize WebGPU.');
      return;
    }

    this.context.configure({
      device: this.device,
      format: this.format,
    });

    // Create a texture to render to
    this.renderTexture = this.device.createTexture({
      size: [this.canvas!.width, this.canvas!.height],
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC, // Add COPY_SRC
    });

    // TODO: Make this a camera class.
    // Matrix Definitions can be global context.
    const modelMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const mvpMatrix = mat4.create();

    const camera = new Camera(
      Math.PI / 4,
      // @ts-ignore
      this.canvas.width / this.canvas.height,
      0.1,
      100,
      1,
      'perspective',
    );
    camera.setup();

    mat4.lookAt(viewMatrix, [0, 0, 5], [0, 0, 0], [0, 1, 0]); // Camera at (0,0,5), looking at origin
    mat4.perspective(
      projectionMatrix,
      Math.PI / 4,
      this.canvas!.width / this.canvas!.height,
      0.1,
      100.0,
    ); // FOV = 45 degreess
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

    console.log(this.returnFileExt(fileName));
    switch (this.returnFileExt(fileName)) {
      case 'obj': {
        const objParser = new OBJParser(this.device);

        // Actually get the data given
        const data = await fetch(fileName).then((data) => data.text());
        await objParser.loadOBJ(data);

        const shaderModule = objParser.getShader();
        const uniformBuffer = this.device.createBuffer({
          size: 64,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // @ts-ignore
        this.device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix.buffer);
        await objParser.createPipeline(shaderModule, this.format, uniformBuffer);

        this.render(() => {
          const commandEncoder = this.device!.createCommandEncoder();
          const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
              {
                view: this.context!.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          });

          objParser.render(passEncoder);
          passEncoder.end();
          this.device!.queue.submit([commandEncoder.finish()]);
        });
        // Generic Model def for saving specifically.
        let model: Model = {
          name: fileName,
          id: uuid(),
          static: true,
          vertexBuffer: objParser.getVertexBuffer(),
          indexBuffer: objParser.getIndexBuffer(),
          shader: objParser.getShaderString(),
        };

        const assetBuilder = new AssetBuilder();
        assetBuilder.buildModelScene(model);

        break;
      }

      case 'fbx':
        console.warn('Not implemented yet!');
        break;
      case 'stl':
        console.log('test');
        const stlParser = new STLParser(this.device);

        const data = await fetch(fileName).then((data) => data.text());
        await stlParser.loadSTL(data);

        const shaderModule = stlParser.getShader();
        const uniformBuffer = this.device.createBuffer({
          size: 64,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // @ts-ignore
        this.device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix.buffer);

        await stlParser.createPipeline(shaderModule, this.format, uniformBuffer);

        this.render(() => {
          const commandEncoder = this.device!.createCommandEncoder();
          const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
              {
                view: this.context!.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          });

          stlParser.render(passEncoder);
          passEncoder.end();
          this.device!.queue.submit([commandEncoder.finish()]);
        });

        break;
      default:
        break;
    }
  }

  private createModelViewMatrix() {}

  private createModelScaleMatrix(scaleX: number, scaleY: number, scaleZ: number) {
    return new Float32Array([scaleX, 0, 0, 0, 0, scaleY, 0, 0, 0, 0, scaleZ, 0, 0, 0, 0, 1]);
  }

  returnFileExt(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
  }

  private cameraControls(): void {}

  private render(renderMethod: () => void) {
    if (typeof renderMethod !== 'function') {
      console.error('renderMethod must be a function');
      return;
    }

    renderMethod();
  }
}

export default Renderer3D;
