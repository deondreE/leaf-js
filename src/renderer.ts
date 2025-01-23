import {Model} from "./types/scene.types.ts";
import PipelineManager from './PipelineManager.ts';
import { assert } from "./utils/util.ts";
import TextureManager from "./TextureManager.ts";

class Renderer {
    private pipelineManager: PipelineManager;
    private textureManager: TextureManager;
    private depthTexture: GPUTexture;
    private device: GPUDevice;
    ctx: any;

    constructor(private canvas: HTMLCanvasElement, private models: Model[], private modelType: string) {}

    async init() {
        const context = this.canvas.getContext('webgpu') as GPUCanvasContext;
        if (!context) {
            throw new Error("WebGPU context is not supported.");
        }
        this.ctx = context;

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("Unable to get GPU adapter. WebGPU might not be supported.");
        }

        this.device = await adapter.requestDevice();
        const format = navigator.gpu.getPreferredCanvasFormat();

        this.ctx.configure({
            device: this.device,
            format,
        });

        this.pipelineManager = new PipelineManager(this.device, format);
        this.textureManager = new TextureManager(this.device);

        this.depthTexture = this.createDepthTexture();

        const observer = new ResizeObserver(() => {
            this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
            this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
            this.depthTexture = this.createDepthTexture();
        });
        observer.observe(this.canvas);
    }

    /** The currrent depth texture changes based on the amount of verticies inside of a given model, ie: points of contact in light. */
    private createDepthTexture(): GPUTexture {
        return this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    genUniformBufferData(): Float32Array {
        const data = new Float32Array(16); 
        data[0] = 1;
        return data;
    }

    genVertexBufferData(): Float32Array {
        return new Float32Array([
            // Positions           | Normals
            -1, -1,  1,   0,  0,  1, // Front face
             1, -1,  1,   0,  0,  1, 
             1,  1,  1,   0,  0,  1, 
            -1,  1,  1,   0,  0,  1, 

            -1, -1, -1,   0,  0, -1, // Back face
             1, -1, -1,   0,  0, -1, 
             1,  1, -1,   0,  0, -1, 
            -1,  1, -1,   0,  0, -1,

            -1,  1,  1,   0,  1,  0, // Top face
             1,  1,  1,   0,  1,  0,
             1,  1, -1,   0,  1,  0,
            -1,  1, -1,   0,  1,  0,

            -1, -1,  1,   0, -1,  0, // Bottom face
             1, -1,  1,   0, -1,  0,
             1, -1, -1,   0, -1,  0,
            -1, -1, -1,   0, -1,  0,

             1, -1,  1,   1,  0,  0, // Right face
             1,  1,  1,   1,  0,  0,
             1,  1, -1,   1,  0,  0,
             1, -1, -1,   1,  0,  0,

            -1, -1,  1,  -1,  0,  0, // Left face
            -1,  1,  1,  -1,  0,  0,
            -1,  1, -1,  -1,  0,  0,
            -1, -1, -1,  -1,  0,  0,
        ]);
    }

    private createVertexBuffer(data: Float32Array): GPUBuffer {
        return this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
    }

    createUniformBuffer(data: Float32Array): GPUBuffer {
        return this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
    }

    async drawModel(model: Model) {
        if (!this.device || !this.pipelineManager || !this.textureManager || !this.ctx) {
            throw new Error("Renderer is not fully initialized. Call initialize() first.");
        }
        const pipeline = this.pipelineManager.getPipeline(model.type, model.pipelineConfig);
        const texture = await this.textureManager.loadTexture(model.textureUrl);

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.createUniformBuffer(this.genUniformBufferData())  } },
                { binding: 1, resource: this.device.createSampler() },
                { binding: 2, resource: texture.createView() },
            ],
        });

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.ctx.getCurrentTexture().createView(),
                    clearValue: [0.5, 0.5, 0.5, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
        });

        // NOTE: 2d models still have vertex buffers.
        // NOTE: These will be defined inside your render pipeline.
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        // TODO: Fix this.
        passEncoder.setVertexBuffer(0, this.createVertexBuffer(this.genVertexBufferData()));
        passEncoder.draw(model.vertexCount);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    render() {
        if (!this.pipelineManager) {
            console.warn("Renderer is not initialized yet. Delaying render call.");
            return;
        }
        for (const model of this.models) {
            this.drawModel(model);
        }
        requestAnimationFrame(() => this.render());
    }
}

export default Renderer;