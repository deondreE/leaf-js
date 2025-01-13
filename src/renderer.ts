import { mat4, vec3 } from "wgpu-matrix";
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
    presentationFormat: any;
    uniformBuffer: any;
    renderPassDescripter: any;
    passEncodeer: any;
    vertexBuffer: any;
    currentPipeline: any;
    uniformBindGroup: any;

    constructor({ models }) {
        this.models = models;
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

        const canvas = document.querySelector<HTMLCanvasElement>('#webgpu-canvas');
        assert(canvas != null);
        this.canvas = canvas;
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        });
        observer.observe(canvas);
        const context = canvas.getContext('webgpu') as GPUCanvasContext;
        assert(context != null);
        this.ctx = context;

        const devicePixelRatio = window.devicePixelRatio;
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;

        const presenstationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.presentationFormat = presenstationFormat;
        context.configure({
            device,
            format: presenstationFormat,
            alphaMode: 'opaque',
        });
    }

    render() {
        assert(this.canvas != null);
        this.models.forEach((model) => {
            this.drawModel(model);
            requestAnimationFrame(this.frame);
        });
    }

    private getTransformationMatrix() {
        const aspect = this.canvas.width / this.canvas.height;
        const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
        const modelViewProjectionMatrix = mat4.create();

        const viewMatrix = mat4.identity();
        mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
        const now = Date.now() / 1000;
        mat4.rotate(
            viewMatrix,
            vec3.fromValues(Math.sin(now), Math.cos(now), 0),
            1,
            viewMatrix
        );

        mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

        return modelViewProjectionMatrix;
    }

    private drawModel(model: Model) {
        console.log(`Rendering model: ${model.name}`);
        const pipeline = new Pipeline({
            type: model.type,
            size: model.size,
        });
        this.currentPipeline = pipeline.generateModelPipeline(this.device, this.presentationFormat);

        const depthTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        const uniformBufferSize = 4 * 16; // 4x4 matrix;
        this.uniformBuffer = this.device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.uniformBindGroup = this.device.createBindGroup({
            layout: this.currentPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer,
                    }
                }
            ]
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
            mappedAtCreation: true
        });


    }

    frame() {
        const transformationMatrix = this.getTransformationMatrix();
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
};

export default Renderer;