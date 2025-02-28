import { assert, initializeWebGpu } from "../utils/util";
import { Render2dDescription } from "./types";
import { loadImgAsBitmap } from "./utils";
import WorkQueue from "./workqueue";


export default class Renderer {
	wrkr = WorkQueue.init(new URL("./renderer.worker.ts", import.meta.url));
	constructor(canvas: HTMLCanvasElement){
		//const offCanvas = canvas.transferControlToOffscreen();

	}
	static async init({
		canvas
	}:Render2dDescription) {

		const [adapter, device, format] = await initializeWebGpu();
		const context: GPUCanvasContext = canvas.getContext('webgpu')!;
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

		const uniformBufferSize = 4*4;
		const uniformBuffer = device.createBuffer({
			label: "Sprite uniform",
			size: 4*4,
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
		device.queue.writeBuffer(
			uniformBuffer,
			0,
			new Float32Array([
				0, 0,
				1,1
			])
		);
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
  frameOffset: vec2f,
  frameSize: vec2f,
  zIndex: f32,
  spriteSize: vec2f
  projectionMatrix: mat4x4f
};

@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(
	@location(0) position: vec2f,
	@location(1) texCoord: vec2f
) -> VertexOutput {
  var output: VertexOutput;

  var scaled = vec3f(
    position.x * uniforms.spriteSize.x,
	position.y * uniforms.spriteSize.y,
	uniforms.zIndex
  );


  //TODO support z-index
  output.position = uniforms.projectionMatrix * vec4f(scaled, 1.0);
  output.texCoord = uniforms.frameOffset + texCoord * uniforms.frameSize;
  return output;
}

@group(0) @binding(0) var spriteTex: texture_2d<f32>;
@group(0) @binding(1) var spriteSampler: sampler;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return textureSample(spriteTex, spriteSampler, input.texCoord);
}
`;