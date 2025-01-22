import {Model} from "./types/scene.types.ts";

class Renderer {
    private pipelineManager: PipelineManager;
    private textureManager: TextureManager;
    private depthTexture: GPUTexture;
    private device: GPUDevice;

    constructor(private canvas: HTMLCanvasElement, private models: Model[]) {
        const context = canvas.getContext('webgpu') as GPUCanvasContext;
        device = navigator.gpu.requestAdapter().requestDevice();
        const format = navigator.gpu.getPreferredCanvasFormat();

        context.configure({ device, format });
        this.pipelineManager = new PipelineManager(device, format);
        this.textureManager = new TextureManager(device);

        this.depthTexture = this.createDepthTexture();
        this.setupResizeObserver(canvas);
    }

    private createDepthTexture(): GPUTexture {
        return this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    private setupResizeObserver(canvas: HTMLCanvasElement) {
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth * window.devicePixelRatio;
            canvas.height = canvas.clientHeight * window.devicePixelRatio;
            this.depthTexture = this.createDepthTexture();
        });
        observer.observe(canvas);
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
        requestAnimationFrame(() => this.render());
    }
}
