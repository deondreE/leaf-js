import basicVert from './shaders/basic.vert.wgsl';
import colorVert from './shaders/color.frag.wgsl';

import {
    cubeVertexArray,
    cubeVertexSize,
    cubeUVOffset,
    cubePositionOffset,
    cubeVertexCount,
  } from './meshes/cube';

/** A render pipeline is defined here {}, required per object inside a given scene. */
class Pipeline {
    pipeline: GPURenderPipeline;
    type: "square" | "circle" | "custom";
    size: { w: number, h: number };

    constructor({ type, size }: { type: "square" | "circle" | "custom"; size: { w: number, h: number } }) {
        this.type = type;
        this.size = size;
    }

    generateModelPipeline(device: GPUDevice, presenstationFormat: any): GPURenderPipeline {
        this.pipeline = device.createRenderPipeline({
           layout: 'auto', 
           vertex: {
            module: device.createShaderModule({ 
                code: basicVert,
            }),
            buffers: [
                {
                    arrayStride: cubeVertexSize,
                    attributes: [
                        {
                            // pos
                            shaderLocation: 0,
                            offset: cubePositionOffset,
                            format: 'float32x4',
                        },
                        {
                            // uv
                            shaderLocation: 1,
                            offset: cubeUVOffset,
                            format: 'float32x2'
                        },
                    ],
                },
            ], 
           },
           fragment: {
            module: device.createShaderModule({
                code: colorVert,
            }),
            targets: [
                {
                    format: presenstationFormat,
                },
            ],
           },
           primitive: {
            topology: 'triangle-list',
            cullMode: 'back',
           },
           depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus'
           },
        });

        return this.pipeline;
    }
}

export default Pipeline;