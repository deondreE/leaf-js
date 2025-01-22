interface PipelineConfig {
    vertexShader: string;
    fragmentShader: string;
    vertexBuffers: GPUVertexBufferLayout[];
    primitive?: GPUPrimitiveState;
    depthStencil?: GPUDepthStencilState;
    targets: GPUColorTargetState[];
};

/** A render pipeline is defined here {}, required per object inside a given scene. */
class Pipeline {
    pipeline: GPURenderPipeline;
    type: string;
    size: { w: number, h: number };

    constructor({ type, size }: { type: string; size: { w: number, h: number } }) {
        this.type = type;
        this.size = size;
    }

    generateModelPipeline(device: GPUDevice, config: GPUTextureFormat): GPURenderPipeline {
        this.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: device.createShaderModule({ code: config.vertexShader }),
                buffers: config.vertexBuffers,
            },
            fragment: {
                module: device.createShaderModule({ code: config.fragmentShader }),
                targets: config.targets,
            },
            primitive: config.primitive || {
                topology: 'triangle-list',
                cullMode: 'back',
            },
            depthStencil: config.depthStencil || {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            },
        });

        return this.pipeline;
    }
}

export default Pipeline;