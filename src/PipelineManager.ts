import Pipeline from "./pipeline.ts";

/** The PipelineManager updates a map based on pipelines that need to be rendered
 *  Soon this will add a queue to each of the given pipeline.
 *  
 */
class PipelineManager {
    private pipelines: Map<string, GPURenderPipeline> = new Map();

    constructor(private device: GPUDevice, private format: any) {}

    getPipeline(type: string, config: any): GPURenderPipeline {
        if (!this.pipelines.has(type)) {
            const pipeline = new Pipeline(config).generateModelPipeline(this.device, this.format);
            this.pipelines.set(type, pipeline);
        }
        return this.pipelines.get(type)!;
    }
}
export default PipelineManager;