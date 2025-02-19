import { mat4 } from 'gl-matrix';
import OBJParser from './parsers/obj';
import STLParser from './parsers/stl';

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
    this.context = this.canvas.getContext('webgpu');
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
      size: [this.canvas.width, this.canvas.height],
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC, // Add COPY_SRC
    });

    // Matrix Definitions can be global context.
    const modelMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const mvpMatrix = mat4.create();

    mat4.lookAt(viewMatrix, [0, 0, 5], [0, 0, 0], [0, 1, 0]); // Camera at (0,0,5), looking at origin
    mat4.perspective(
      projectionMatrix,
      Math.PI / 4,
      this.canvas.width / this.canvas.height,
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
          const commandEncoder = this.device.createCommandEncoder();
          const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
              {
                view: this.context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          });

          objParser.render(passEncoder);
          passEncoder.end();
          this.device.queue.submit([commandEncoder.finish()]);
        });

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
          const commandEncoder = this.device.createCommandEncoder();
          const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
              {
                view: this.context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          });

          stlParser.render(passEncoder);
          passEncoder.end();
          this.device.queue.submit([commandEncoder.finish()]);
        });

        break;
      default:
        break;
    }
  }

  returnFileExt(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
  }

  private render(renderMethod: () => void) {
    if (typeof renderMethod !== 'function') {
      console.error('renderMethod must be a function');
      return;
    }

    renderMethod();
  }
}

export default Renderer3D;
