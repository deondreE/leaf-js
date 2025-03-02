import { mat3, Mat3 } from "wgpu-matrix";
import { assert, initializeWebGpu } from "../utils/util";
import { Render2dDescription } from "./types";
import { loadImgAsBitmap } from "./utils";
import WorkQueue from "./workqueue";

const projection = (width: number, height: number) => mat3.create(
	2/width, 0, 0,
	0, 2/height, 0,
	-1, 1, 1
); //uses gl-matrixes math but in webgpus-homogenous matrix. 

export default class Renderer {
	wrkr = WorkQueue.init(new URL("./renderer.worker.ts", import.meta.url));
	constructor(canvas: HTMLCanvasElement){
		//const offCanvas = canvas.transferControlToOffscreen();

	}
	static async init({
		canvas
	}:Render2dDescription) {
		const clientRect = canvas.getBoundingClientRect(); 
		canvas.width = clientRect.width * devicePixelRatio;
		canvas.height = clientRect.height * devicePixelRatio;
		const [adapter, device, format] = await initializeWebGpu();
		const context: GPUCanvasContext = canvas.getContext('webgpu')!;
		
		const perspective = projection(canvas.width, canvas.height);
		assert(!!context);
		context.configure({device, format});

		//default context data
		const quadData = new Float32Array([
			// x    y  u v
			-0.5,-0.5, 0,1,
			 0.5,-0.5, 1,1,
			 0.5, 0.5, 1,0,
			-0.5,-0.5, 0,1,
			 0.5, 0.5, 1,0,
			-0.5, 0.5, 0,0,
		]);

		const spriteQuad = device.createBuffer({
			label: "Sprite Quad",
			size: quadData.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
			mappedAtCreation: true
		});
		new Float32Array(spriteQuad.getMappedRange()).set(quadData);
		spriteQuad.unmap();

		const vertexLayout: GPUVertexBufferLayout = {
			arrayStride: 4 * 4,
			attributes: [
				{
					// position
					shaderLocation: 0,
					offset: 0,
					format: "float32x2"
				},
				{
					shaderLocation: 1,
					offset: 2 * 4,
					format: "float32x2"
				}
			]
		};
		const uniformBuffer = device.createBuffer({
			label: "Sprite uniform",
			size: 48,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});

		const [bitmap, size] = await loadImgAsBitmap("knight.png");
		const texture = device.createTexture({
			size,
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
		});

		device.queue.writeTexture(
			{texture},
			bitmap.data.buffer,
			{bytesPerRow: 4 * size[0]},
			[size[0], size[1]]
		);

		const sampler = device.createSampler({
			magFilter: "nearest",
			minFilter: "nearest"
		});

		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.FRAGMENT,
					texture:{}
				},
				{
					binding: 1,
					visibility: GPUShaderStage.FRAGMENT,
					sampler: {}
				},
				{
					binding: 2,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {}
				}
			]
		});

		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout]
		});

		const bindGroup = device.createBindGroup({
			layout: bindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: texture.createView()
				},
				{
					binding: 1,
					resource: sampler
				},
				{
					binding: 2,
					resource: {buffer: uniformBuffer}
				}
			]
		});

		const shaderModule = device.createShaderModule({
			label: "Sprite shader",
			code: spriteShader
		});

		const pipeline = device.createRenderPipeline({
			label: "Sprite pipeline",
			layout: pipelineLayout,
			vertex: {
				module: shaderModule,
				entryPoint: "vertexMain",
				buffers: [vertexLayout]
			},
			fragment: {
				module: shaderModule,
				entryPoint: "fragmentMain",
				targets: [{
					format,
					blend: {
						//TODO - research this property color blending may be m
						color: {
							srcFactor: "src-alpha",
							dstFactor: "one-minus-src-alpha",
							operation: "add"
						},
						alpha: {
							srcFactor: "one",
							dstFactor: "one-minus-src-alpha",
							operation: "add"
						}
					}
				}]
			},
			primitive: {
				topology: "triangle-list"
			}
		});

		const commandEncoder = device.createCommandEncoder();
		const renderPass = commandEncoder.beginRenderPass({
			colorAttachments: [{
				view: context.getCurrentTexture().createView(),
				loadOp: "clear",
				clearValue: [0.1, 0.1, 0.1, 1.0],
				storeOp: "store"
			}]
		});
		//const uni = new Float32Array([0, 0, 1,1,1, 256, 256]);
		const uniformData = new Float32Array(12);
		//uniformData.set([0, 0, 1,1,1, 256, 256]);
		//console.log(perspective.byteLength, uniformData.byteOffset/4);
		uniformData.set(perspective, 0); //dropping the translation that gl-matrix applies and using identity to attempt to apply transforms manually to find bad actor.

		device.queue.writeBuffer(uniformBuffer,0,uniformData);
		
		console.log(`
[${perspective[0]} ${perspective[1]} ${perspective[2]}]
[${perspective[3]} ${perspective[4]} ${perspective[5]}]
[${perspective[6]} ${perspective[7]} ${perspective[8]}]`);

		renderPass.setPipeline(pipeline);
		renderPass.setBindGroup(0, bindGroup);
		renderPass.setVertexBuffer(0, spriteQuad);
		renderPass.draw(6); //the number of inputs
		renderPass.end();

		device.queue.submit([commandEncoder.finish()]);

		//not ready to animate just yet. 
		


	}
}

const spriteShader = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f
};

struct Uniforms {
  projectionMatrix: mat3x3f
};

@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(
	@location(0) position: vec2f,
	@location(1) texCoord: vec2f
) -> VertexOutput {
  var output: VertexOutput;

  var scaled = uniforms.projectionMatrix * vec3f(position * vec2f(256, 256), 1.0).xyz;


  //TODO support z-index
  output.position = vec4f(scaled, 1.0);
  output.texCoord = texCoord;
  return output;
}

@group(0) @binding(0) var spriteTex: texture_2d<f32>;
@group(0) @binding(1) var spriteSampler: sampler;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return vec4f(1.0, 0.0, 0.0, 1.0);
}
`;