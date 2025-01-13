import { Mat4, mat4, vec3 } from "wgpu-matrix";
import { cubeVertexArray, cubeVertexCount } from "./meshes/cube";
import Pipeline from "./pipeline";
import { Model } from "./types/scene.types";
import { assert } from "./utils/util";

// HUGGGE TODO: Make this not just work for cubes.
class Renderer {
    models: Model[];
    canvas: HTMLCanvasElement;
    device: GPUDevice;
    ctx: GPUCanvasContext;
    presentationFormat: GPUTextureFormat;
    renderPassDescripter: GPURenderPassDescriptor;
    passEncodeer: GPURenderPassEncoder;
    vertexBuffer: GPUBuffer;
    uniformBuffer: GPUBuffer;
    currentPipeline: GPURenderPipeline;
    depthTexture: GPUTexture;
    uniformBindGroup: GPUBindGroup;
    aspect: number;
    projectionMatrix: Mat4;
    modelViewProjectionMatrix: Mat4;

    constructor({ models }) {
        this.models = models;

        this.canvas = document.querySelector<HTMLCanvasElement>('#webgpu-canvas');
        this.aspect = this.canvas.width / this.canvas.height;
        this.projectionMatrix = mat4.perspective((2 * Math.PI) / 5, this.aspect, 1, 100.0);
        this.modelViewProjectionMatrix = mat4.create();
        this.frame.bind(this);
    }

    async init() {
        if (navigator.gpu === undefined) {
            const h = document.querySelector('#title') as HTMLElement;
            h.innerHTML = 'WebGPU is not supported in this browser';
            return;
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter === null) {
            const h = document.querySelector('#title') as HTMLElement;
            h.innerHTML = 'No adapter is availible for WebGPU';
            return;
        }
        const device = await adapter.requestDevice();
        assert(device != null);
        this.device = device;
        const uniformBufferSize = 4 * 16; // 4x4 matrix
        this.uniformBuffer = this.device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const canvas = document.querySelector<HTMLCanvasElement>('#webgpu-canvas');
        assert(canvas != null);
        this.canvas = canvas;

        const context = canvas.getContext('webgpu') as GPUCanvasContext;
        assert(context != null);
        this.ctx = context;

        const devicePixelRatio = window.devicePixelRatio;
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;

        const presenstationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.presentationFormat = presenstationFormat;
        this.ctx.configure({
            device,
            format: presenstationFormat
        });

        this.updateDepthTexture();
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth * devicePixelRatio;
            canvas.height = canvas.clientHeight * devicePixelRatio;
            this.updateDepthTexture();
        });
        observer.observe(canvas);
    }

    render() {
        assert(this.canvas != null);
        this.models.forEach((model) => {
            this.drawModel(model);
            requestAnimationFrame(this.frame.bind(this));
        });
    }

    updateDepthTexture() {
        if (this.depthTexture) {
            this.depthTexture.destroy();
        }

        this.depthTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        if (this.renderPassDescripter) {
            this.renderPassDescripter.depthStencilAttachment.view = this.depthTexture.createView();
        }
    }

    frame = () => {
        const transformationMatrix = this.getTransformationMatrix('3D');
        this.device.queue.writeBuffer(
            this.uniformBuffer,
            0,
            transformationMatrix.buffer,
            transformationMatrix.byteOffset,
            transformationMatrix.byteLength
        );
        this.renderPassDescripter.colorAttachments[0].view = this.ctx
        .getCurrentTexture()
        .createView();

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescripter);
        passEncoder.setPipeline(this.currentPipeline);
        passEncoder.setBindGroup(0, this.uniformBindGroup);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.draw(cubeVertexCount);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        requestAnimationFrame(this.frame);
    }

    private getTransformationMatrix(def: string) {
        if (def === '2D') {
            const orthoMatrix = mat4.ortho(-1, 1, -1, 1, -1, 1);
            const viewMatrix = mat4.identity();
            const now = Date.now() / 1000;
            mat4.multiply(orthoMatrix, viewMatrix, this.modelViewProjectionMatrix);
        } else {
            const viewMatrix = mat4.identity();
            mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
            const now = Date.now() / 1000;
            mat4.rotate(
                viewMatrix,
                vec3.fromValues(Math.sin(now), Math.cos(now), 0),
                1,
                viewMatrix
            );

            mat4.multiply(this.projectionMatrix, viewMatrix, this.modelViewProjectionMatrix);
        }



        return this.modelViewProjectionMatrix;
    }

    private async drawModel(model: Model) {
        console.log(`Rendering model: ${model.name}`);
        const pipeline = new Pipeline({
            type: model.type,
            size: model.size,
        });
        this.currentPipeline = pipeline.generateModelPipeline(this.device, this.presentationFormat);

        // cube texture
        let cubeTexture: GPUTexture;
        {
            const response = await fetch('../assets/textures/png.png');
            const imageBitmap = await createImageBitmap(await response.blob());

            cubeTexture = this.device.createTexture({
                size: [imageBitmap.width, imageBitmap.height, 1],
                format: 'rgba8unorm',
                usage:
                    GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            this.device.queue.copyExternalImageToTexture(
                { source: imageBitmap },
                { texture: cubeTexture },
                [imageBitmap.width, imageBitmap.height]
            );
        }

        const sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });

        const depthTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.uniformBindGroup = this.device.createBindGroup({
            layout: this.currentPipeline.getBindGroupLayout(0),
            entries: [
              {
                binding: 0,
                resource: {
                  buffer: this.uniformBuffer,
                },
              },
              {
                binding: 1,
                resource: sampler,
              },
              {
                binding: 2,
                resource: cubeTexture.createView(),
              },
            ],
          });

        this.renderPassDescripter = {
            colorAttachments: [
                {
                    view: undefined,

                    clearValue: [0.5, 0.5, 0.5, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store',
                }
            ],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        };

        this.vertexBuffer = this.device.createBuffer({
            size: cubeVertexArray.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(cubeVertexArray);
        this.vertexBuffer.unmap();
    }
};

export default Renderer;