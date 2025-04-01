import { mat4, quat } from 'gl-matrix';
import primitiveCubeShader from './shaders/primitive.cube.js';
import OBJParser from './parsers/obj';
import STLParser from './parsers/stl';

import AssetBuilder from './assetloading/build';
import { Model } from './types/scene.types';
import { v4 as uuid } from 'uuid';
import { createCubeIndexData, createCubeVertexArray } from './meshes/cube';
import { vec4 } from 'wgpu-matrix';
import type { PrimitiveTypes } from './types/renderer.type.js';

/** Renderer for the 3d context
 * Required to defined the process of importing rendering context into the canvas.
 */
class Renderer3D {
  canvas?: HTMLCanvasElement;
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  format: GPUTextureFormat | null = null;
  renderTexture: GPUTexture | null = null;
  mouseX: number | null = null;
  mouseY: number | null = null;

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

        /* let model: Model = {
          name: fileName,
          id: uuid(),
          static: true,
          vertexBuffer: objParser.getVertexBuffer(),
          indexBuffer: objParser.getIndexBuffer(),
          shader: objParser.getShaderString(),
        };
        */
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

  returnFileExt(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
  }

  /** Renders a primitive cube in the "GLOBAL" context that is used inside the canvas.
   * @returns pipeline, shader, vertexBuffer, indexBuffer all in memory.
   */
  async primitiveCube(models: PrimitiveTypes) {
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

    const uniformBufferSize = 96 * models.length;
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

    const textureBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {sampleType: 'float', viewDimension: '2d' }
        }
      ]
    })

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

    // ==========
    // Buffers
    // ==========
    const vertexData = createCubeVertexArray(0.5);
    const indexData = createCubeIndexData();

    const vertexBuffer = this.device!.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.device!.queue.writeBuffer(vertexBuffer, 0, vertexData);

    const indexBuffer = this.device!.createBuffer({
      size: indexData.byteLength * models.length,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    async function createTextureFromImage(device: GPUDevice, url: string): Promise<GPUTexture> {
      const response = await fetch(url);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      const texture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });

      device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: texture, origin: [0, 0, 0] },
        [imageBitmap.width, imageBitmap.height, 1],
      );

      return texture;
    }

    const textures: GPUTexture[] = [];
    for (const model of models) {
      if (model.texture) {
        const texture = await createTextureFromImage(this.device, model.texture);
        textures.push(texture);
      } else {
        const defaultTexture = this.device.createTexture({
          size: [1, 1, 1],
          format: 'rgba8unorm',
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });

        const pixelData = new Uint8Array([255, 255, 255, 255]);
        this.device.queue.writeTexture(
          {
            texture: defaultTexture,
          },
          pixelData,
          { bytesPerRow: 4 },
          [1, 1, 1],
        );
        textures.push(defaultTexture);
      }
    }

    const sampler = this.device.createSampler({ 
      magFilter: 'linear',
      minFilter: 'linear',
    });

    const textureBindGroups: GPUBindGroup[] = [];
    for (const texture of textures) {
      const textureBindGroup = this.device.createBindGroup({
        layout: textureBindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: sampler,
          },
          {
            binding: 1,
            resource: texture.createView(),
          },
        ],
      });
      textureBindGroups.push(textureBindGroup);
    }

    this.device!.queue.writeBuffer(indexBuffer, 0, indexData);

    const uniformData = new Float32Array(18 * models.length); // 16 for matrix + 1 for scale + 4 for color

    // ========
    // Animation
    // ========
    const updateUniformBUffer = (time: number) => {
      models.forEach((model, index) => {
        // ==========
        // Rotation -> Translation
        // ==========
        const rotationMatrix = mat4.create();
        const rotationQuat = quat.create();

        if (model.rotation) {
          quat.fromEuler(
            rotationQuat,
            model.rotation?.x + time * 0.001, // Apply rotation over time
            model.rotation?.y + time * 0.002,
            model.rotation?.z + time * 0.0015,
          );
          mat4.fromQuat(rotationMatrix, rotationQuat);
        }

        const translationMatrix = mat4.create();
        mat4.fromTranslation(translationMatrix, [
          model.position?.x || 0,
          model.position?.y || 0,
          model.position?.z || 0,
        ]);

        const modelMatrix = mat4.create();
        mat4.multiply(modelMatrix, translationMatrix, rotationMatrix);

        uniformData.set(modelMatrix, index * 18);
        uniformData[index * 18 + 16] = model.scale! || 0.5;
        uniformData[index * 18 + 17] = 0;
      });

      this.device?.queue.writeBuffer(
        uniformBuffer,
        0,
        uniformData.buffer,
        uniformData.byteOffset,
        uniformData.byteLength,
      );
    };

    const shaderModule = this.device.createShaderModule({
      code: primitiveCubeShader,
    });

    const pipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [uniformBindGroupLayout, textureBindGroupLayout],
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

    // ===========
    // Animation Frame Start
    // ===========
    const frame = (time: number) => {
      updateUniformBUffer(time);

      const commandEncoder = this.device!.createCommandEncoder();
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
      passEncoder.setBindGroup(1, textureBindGroups[0]);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setIndexBuffer(indexBuffer, 'uint16');
      passEncoder.drawIndexed(indexData.length);

      passEncoder.end();
      this.device!.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  /** Render is the source of "Truth" for the call stack, so that the profiler has something to look for on update. */
  private render(renderMethod: () => void) {
    if (typeof renderMethod !== 'function') {
      console.error('renderMethod must be a function');
      return;
    }

    renderMethod();
  }
}

export default Renderer3D;
