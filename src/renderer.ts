import {Model} from "./types/scene.types.ts";
import PipelineManager from './PipelineManager.ts';

class Renderer {
    private pipelineManager: PipelineManager;
    private textureManager: TextureManager;
    private depthTexture: GPUTexture;
    private device: GPUDevice;
    ctx: any;

    constructor(private canvas: HTMLCanvasElement, private models: Model[]) {
        const context = canvas.getContext('webgpu') as GPUCanvasContext;
        let device: GPUDevice;
        (async () => {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.error("WebGPU is not supported on this browser.");
                return;
            }
            this.device = await adapter.requestDevice();
            device = this.device;
        })();
       
        const format = navigator.gpu.getPreferredCanvasFormat();

        context.configure({ device, format });
        this.pipelineManager = new PipelineManager(device, format);
        this.textureManager = new TextureManager(device);

        this.depthTexture = this.createDepthTexture();
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth * window.devicePixelRatio;
            canvas.height = canvas.clientHeight * window.devicePixelRatio;
            this.depthTexture = this.createDepthTexture();
        });
        observer.observe(canvas);
    }

    /** The currrent depth texture changes based on the amount of verticies inside of a given model, ie: points of contact in light. */
    private createDepthTexture(): GPUTexture {
        return this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    async drawModel(model: Model) {
        const pipeline = this.pipelineManager.getPipeline(model.type, model.pipelineConfig);
        const texture = await this.textureManager.loadTexture(model.textureUrl);

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: model.uniformBuffer } },
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
        passEncoder.setVertexBuffer(0, model.vertexBuffer);
        passEncoder.draw(model.vertexCount);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    render() {
        for (const model of this.models) {
            this.drawModel(model);
        }
        // NOTE: this just syncs with canvas, I still want full support for the canvas api.
        requestAnimationFrame(() => this.render());
    }
}
