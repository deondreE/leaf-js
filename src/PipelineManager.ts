import Pipeline from "./pipeline.ts";

class PipelineManager {
    private pipelines: Map<string, GPURenderPipeline> = new Map();

    constructor(private device: GPUDevice, private format: GPUTextureFormat) {}

    getPipeline(type: string, config: any): GPURenderPipeline {
        if (!this.pipelines.has(type)) {
            const pipeline = new Pipeline(config).generateModelPipeline(this.device, this.format);
            this.pipelines.set(type, pipeline);
        }
        return this.pipelines.get(type)!;
    }
}