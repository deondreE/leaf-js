import defaultVertex from './shaders/basic.vert.wgsl';
import defaultFrag from './shaders/texture.frag.wgsl';


export interface PipelineConfig {
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

    /** This creates a new generateModelPipeline  */
    generateModelPipeline(device: GPUDevice, config: PipelineConfig): GPURenderPipeline {
        const bindGroupLayout = device.createBindGroupLayout({
            label: "DefaultBindGroupLayout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {sampleType: 'float'}
                }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            label: "pipelineDefaultLayout",
            bindGroupLayouts: [bindGroupLayout],
        });

        this.pipeline = device.createRenderPipeline({
            label: 'pipeline',
            layout: pipelineLayout,
            vertex: {
                module: device.createShaderModule({ code: defaultVertex }),
                buffers: config.vertexBuffers,
            },
            fragment: {
                module: device.createShaderModule({ code: defaultFrag }),
                targets: config.targets || [{ format: "bgra8unorm" }],
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