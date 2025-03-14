import { mat4, quat } from 'gl-matrix';
import OBJParser from './parsers/obj';
import STLParser from './parsers/stl';

import AssetBuilder from './assetloading/build';
import { Model } from './types/scene.types';
import { v4 as uuid } from 'uuid';
import Camera from './camera';
import { createCubeIndexData, createCubeVertexArray } from './meshes/cube';

/** Renderer for the 3d context
 * Required canvas and canvas alone.
 */
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

    this.renderTexture = this.device.createTexture({
      size: [this.canvas!.width, this.canvas!.height],
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC, // Add COPY_SRC
    });

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

    // FIXME: Move this to a camera class, that can be controlled by the user.
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

    // console.log(this.returnFileExt(fileName));
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

  /** Rips the file extension of a model. */
  returnFileExt(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
  }

  /** Renders a primitive cube, for the user to effect with a dynamic scene.
   * @returns pipeline, shader, vertexBuffer, indexBuffer all in memory.
   */
  async primitiveCube(
    scale?: number,
    rotation?: { x: number; y: number; z: number },
    color?: { r: number; g: number; b: number; a: number },
    animation?: {
      effect: {
        type: string;
        start: { x: number; y: number; z: number };
        to: { x: number; y: number; z: number };
      };
      timeScale?: string | 'infinite';
    },
  ) {
    console.log(color);
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.error('No WebGPU adapter found.');
      return;
    }

    this.device = await adapter.requestDevice();
    this.context = this.canvas!.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();

    this.context?.configure({
      device: this.device,
      format: format,
    });

    const vertexData = createCubeVertexArray(scale ? scale : 0.5);
    const indexData = createCubeIndexData();

    const vertexBuffer = this.device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(vertexBuffer, 0, vertexData);

    const indexBuffer = this.device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(indexBuffer, 0, indexData);

    const rotationMatrix = mat4.create();
    const rotationQuat = quat.create();

    if (rotation) {
      quat.fromEuler(rotationQuat, rotation.x, rotation.y, rotation.z);
      mat4.fromQuat(rotationMatrix, rotationQuat);
    }

    const uniformBufferSize = 96;
    const uniformBuffer = this.device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    const uniformBindGroup = this.device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
      ],
    });

    const uniformData = new Float32Array(17); // 16 for matrix + 1 for scale + 4 for color
    uniformData.set(rotationMatrix, 0);
    // @ts-ignore
    uniformData[16] = scale;
    this.device!.queue.writeBuffer(
      uniformBuffer,
      0,
      uniformData.buffer,
      uniformData.byteOffset,
      uniformData.byteLength,
    );
    console.log(uniformBuffer);
    const shaderModule = this.device.createShaderModule({
      code: `
        struct VertexInput {
            @location(0) position: vec3<f32>,
            @location(1) uv: vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) Position: vec4<f32>,
            @location(1) uv: vec2<f32>,
        };

        struct Uniforms {
            rotationMatrix: mat4x4<f32>,
            scale: f32,
        };

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            let scaledPosition = input.position * uniforms.scale;
            let rotatedPosition = uniforms.rotationMatrix * vec4<f32>(scaledPosition, 1.0);
            output.Position = rotatedPosition;
            output.uv = input.uv;
            return output;
        }

        @fragment
        fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
          return vec4<f32>(${(color?.r, color?.g, color?.b, color?.a)});
        }
    `,
    });

    const pipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [uniformBindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 5 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 3 * 4, format: 'float32x2' },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context!.getCurrentTexture().createView();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: [0.1, 0.1, 0.1, 1],
        },
      ],
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setIndexBuffer(indexBuffer, 'uint16');
    passEncoder.drawIndexed(indexData.length);

    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private runAnimationCalc(
    type: string,
    uniformBuffer: GPUBuffer,
    uniformData: Float32Array,
    rotation: { x: number; y: number; z: number },
  ): void {
    switch (type) {
      case 'rotation':
        const rotationQuat = quat.create();
        const rotationMatrix = mat4.create();
        y;
        quat.fromEuler(rotationQuat, rotation.x, rotation.y, rotation.z);
        mat4.fromQuat(rotationMatrix, rotationQuat);

        uniformData.set(rotationMatrix, 0);

        this.device!.queue.writeBuffer(
          uniformBuffer,
          0,
          uniformData.buffer,
          uniformData.byteOffset,
          uniformData.byteLength,
        );
        break;
      default:
        console.warn(`${type}, Not implemented yet!`);
        break;
    }
  }

  /** Required for animation due to needed some kind of function call.
   * @returns void
   */
  private render(renderMethod: () => void) {
    if (typeof renderMethod !== 'function') {
      console.error('renderMethod must be a function');
      return;
    }

    renderMethod();
  }
}

export default Renderer3D;
