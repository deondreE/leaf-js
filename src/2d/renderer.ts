import { mat3, Mat3 } from "wgpu-matrix";
import { assert, initializeWebGpu } from "../utils/util";
import { Render2dDescription, Renderable } from "./types";
import { LEAF_2D_BIND_GROUP_LAYOUT_DESCRIPTOR, LEAF_2D_VERTEX_LAYOUT } from "./constants";
import ImageFrames from "./ImageFrames";

export default class Renderer {
	canvas: HTMLCanvasElement;
	context: GPUCanvasContext;
	device: GPUDevice;
	format: GPUTextureFormat;

	observer: ResizeObserver;

	projection: Mat3 = mat3.create(1,0,0,0,1,0,0,0,1);

	//Idk if I really need this reference here.
	bindGroupLayout: GPUBindGroupLayout;


	fps: number = 1e3/32;
	lastUpdate: number = 0;
	animationFrame: number = 0;

	//reusable parts of the pass that the sprites dont need to worry about. 
	pipeline: GPURenderPipeline;
	uniformBuffer: GPUBuffer;
	quadBuffer: GPUBuffer;
	quadIndexBuffer: GPUBuffer;
	sampler: GPUSampler;

	renderables: Renderable[] = [];

	constructor(canvas: HTMLCanvasElement, device: GPUDevice, format: GPUTextureFormat){
		this.canvas = canvas;
		this.context = this.canvas.getContext("webgpu")!;
		assert(!!this.context, "No WebGPU context available");
		this.context.configure({device, format});

		this.device = device;
		this.format = format;

		this.observer = new ResizeObserver(this.handleResize.bind(this));
		this.observer.observe(canvas, {box: "device-pixel-content-box"}); //should report premultiplied pixel size if I am not mistaken.

		this.bindGroupLayout = this.device.createBindGroupLayout(LEAF_2D_BIND_GROUP_LAYOUT_DESCRIPTOR);

		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [this.bindGroupLayout]
		});

		const shaderModule = device.createShaderModule({
			label: "Shader Module",
			code: SHADER
		})

		this.pipeline = device.createRenderPipeline({
			label: "Leaf 2d basic pipeline",
			layout: pipelineLayout,
			vertex: {
				module: shaderModule,
				entryPoint: "vertexMain",
				buffers: [LEAF_2D_VERTEX_LAYOUT]
			},
			fragment: {
				module: shaderModule,
				entryPoint: "fragmentMain",
				targets: [{
					format,
					blend: {
						//TODO - research this property color blending may be even simpler now. 
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

		this.quadBuffer = device.createBuffer({
			label: "Vertex Buffer",
			size: 64, //only 4 points
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
			mappedAtCreation: true
		});

		//its all quads so the vertex buffer is simple. 
		new Float32Array(this.quadBuffer.getMappedRange()).set(new Float32Array([
			// x    y u v
			-0.5,-0.5,0,1, // 0
			 0.5,-0.5,1,1, // 1
			-0.5, 0.5,0,0, // 2
			 0.5, 0.5,1,0  // 3
		]));

		this.quadBuffer.unmap();

		//The indices for the quad... reduces size by half. 
		this.quadIndexBuffer = device.createBuffer({
			label: "Index Buffer",
			size: 12, //only 6 Uint16,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
			mappedAtCreation: true
		});

		//its all quads so the vertex buffer is simple. 
		new Uint16Array(this.quadIndexBuffer.getMappedRange()).set(new Uint16Array([
			1,0,2,
			1,2,3
		]));

		this.quadIndexBuffer.unmap();

		this.sampler = this.device.createSampler({
			magFilter: "nearest",
			minFilter: "nearest"
		});

		this.uniformBuffer = device.createBuffer({
			label: "UniformBuffer",
			size: 48, //min size of uniform buffer for now
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.render = this.render.bind(this);
		
		const imgFrame = new ImageFrames("optimizedknight.png", 32);


		imgFrame.register(this).then(()=>{
			this.renderables.push(imgFrame);
			this.animationFrame = requestAnimationFrame(this.render);
		});
		

	}

	createBindGroup(texture: GPUTexture, instanceBuffer: GPUBuffer){
		return this.device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: texture.createView()
				},
				{
					binding: 1,
					resource: this.sampler
				},
				{
					binding: 2,
					resource: {buffer: this.uniformBuffer}
				},
				{
					binding: 3,
					resource: {buffer: instanceBuffer}
				}
			]
		})
	}

	handleResize(){
		
		const {width, height} = this.canvas.getBoundingClientRect();
		this.canvas.width = width * devicePixelRatio;
		this.canvas.height = height * devicePixelRatio;
		//this is just gl-matrixes project inside a webgpu-mat3 because gl-mat3 is not homogenous.
		this.projection = mat3.create( 
			2/width, 0, 0,
			0, 2/height, 0,
			-1, 1, 1
		);
	}

	render(time: number){
		this.animationFrame = requestAnimationFrame(this.render);
		const delta = time-this.lastUpdate;
		if(delta < this.fps) return;
		const commandEncoder = this.device.createCommandEncoder();

		const renderPassDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [{
				view: this.context.getCurrentTexture().createView(),
				loadOp: "clear",
				storeOp: "store",
				clearValue: [0,0,0,1.0]
			}]
		}

		const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
		//TODO: - Iterate over each sprite and render its instances if any.
	}

	makeTexture(img: ImageData){
		const texture = this.device.createTexture({
			size: {width: img.width, height: img.height},
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
		});
		this.device.queue.writeTexture(
			{texture},
			img.data.buffer,
			{bytesPerRow: 4 * img.width},
			[img.width, img.height]
		);
	}

	static async init({
		canvas
	}:Render2dDescription) {
		const clientRect = canvas.getBoundingClientRect(); 
		const [device, format] = await initializeWebGpu(); //TODO: - do I really need the adapter anymore. 
		return new Renderer(canvas, device, format);
		/*

		const [bitmap, size] = await loadImgAsBitmap("knight.png");

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
		

*/
	}
}

const SHADER = `
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
  return textureSample(spriteTex, spriteSampler, input.texCoord);
}
`;