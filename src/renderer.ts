import { mat4, Mat4, vec3 } from "wgpu-matrix";
import { assert } from "./utils";
import basicVert from './shaders/basic.vert.wgsl';
import colorVert from './shaders/color.frag.wgsl';
import { DEFAULT_DEPTH_STENCIL, DEFAULT_PIPELINE_BUFFERS, DEFAULT_PRIMITIVE_STATE, DEFAULT_VIEW_FRUSTRUM } from "./constants";
import { cubeVertexArray, cubeVertexCount } from "./meshes/cube";

/**
 * Returning false from this method prevents renderer from resizing the view, projectionMatrix, and depthStencil
 */
export type CanvasResizeHandler = (canvas: HTMLCanvasElement)=>boolean | void;
/**
 * This is a simplified set of options convenient for a high level use of the renderer.
 */
export type RendererOptions = {
	canvas?: HTMLCanvasElement,
	perspective?: number
	vertexShader?: string | GPUShaderModule,
	fragmentShader?: string | GPUShaderModule,
	buffers?: Iterable<GPUVertexBufferLayout>,
	primitive?: GPUPrimitiveState,
	depthStencil?: GPUDepthStencilState
	//depthTextureDescriptor?: GPUTextureDescriptor
	onResize?: CanvasResizeHandler
}

export interface RenderDescriptor{
	canvas: HTMLCanvasElement;
	device: GPUDevice;
	context: GPUCanvasContext;
	format: GPUTextureFormat;
	devicePixelRatio: number;
	vertexBuffer: GPUBuffer;
	uniformBuffer: GPUBuffer;
	uniformBindGroup: GPUBindGroup;
	renderPipeline: GPURenderPipeline;
	//need this to be configurable but currently requires internal values to describe 
	//depthTextureDescriptor: GPUTextureDescriptor
	onResize?: CanvasResizeHandler
	//knowing a generic value here allows the camera to resize with the canvas.
	perspective: number
}
export default class Renderer implements RenderDescriptor {
	canvas: HTMLCanvasElement;
	device: GPUDevice;
	context: GPUCanvasContext;
	format: GPUTextureFormat;
	
	renderPassEncoder: GPURenderPassEncoder;
	vertexBuffer: GPUBuffer;
	uniformBuffer: GPUBuffer;
	renderPipeline: GPURenderPipeline;
	depthTexture: GPUTexture;
	depthTextureDescriptor: GPUTextureDescriptor;
	uniformBindGroup: GPUBindGroup;
	devicePixelRatio: number;

	_renderPassDescriptor: GPURenderPassDescriptor | null;
	get renderPassDescriptor(): GPURenderPassDescriptor{
		//renderPassDescriptor can now be invalidated when colorAttachments or depth textures are invalidated. 
		//prevents the need to rebuild a pipeline
		if(this._renderPassDescriptor) return this._renderPassDescriptor;
		return {
			colorAttachments: [{
				view:  this.context.getCurrentTexture().createView(),
				clearValue: {r:0.5, g:0.5, b:0.5, a:1.0},
				loadOp: 'clear',
				storeOp: 'store'
			}],
			depthStencilAttachment: {
				view: (this.depthTexture ?? this.createDepthTexture()).createView(),
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store'
			}
		}
	}
	perspective: number;
	_vMin: number = 1;
	_vFar: number = 100;
	worldMatrix: Mat4;
	resizeObserver: ResizeObserver;
	
	_aspect: number
	_projectionMatrix: Mat4 | null = null;
	animationFrame: number = 0;
	get vMin(): number{
		return this._vMin;
	}
	set vMin(value: number) {
		this._vMin = value;
		//invalidate the projection matrix
		this._projectionMatrix = null;
	}

	get vFar(): number{
		return this._vFar;
	}
	set vFar(value: number) {
		this._vFar = value;
		this._projectionMatrix = null;
	}
	get aspect(): number{
		if(this._aspect != null) return this._aspect;
		return this.aspect = this.canvas.width/this.canvas.height;
	}

	set aspect(val: number){ //invalidates the projection matrix
		this._aspect = val;
		this._projectionMatrix = null;
	}

	get projectionMatrix(): Mat4 {
		if(this._projectionMatrix) return this._projectionMatrix;
		const proj =  mat4.perspective(this.perspective, this.aspect, this._vMin, this._vFar);
		return this._projectionMatrix = proj;
	}
	
	/**
	 * In most cases the renderer should be initialized from the static *init* function. This accepts GPU object to build a pipeline and 
	 * @param descriptor
	 */
	constructor({canvas, device, context, format, devicePixelRatio, onResize, uniformBuffer, vertexBuffer, renderPipeline, uniformBindGroup, perspective}: RenderDescriptor){
		console.log("Initializing");
		//Accepting a lower level implementation here 
		this.perspective = perspective;
		this.canvas = canvas;
		this.device = device;
		this.context = context;
		this.format = format;
		this.uniformBuffer = uniformBuffer;
		this.vertexBuffer = vertexBuffer;
		this.worldMatrix = mat4.identity();
		this.renderPipeline = renderPipeline;
		this.uniformBindGroup = uniformBindGroup;


		this.resizeObserver = new ResizeObserver(()=>{
			if(typeof onResize === 'function' && onResize(this.canvas) == false) return; //true and void do not halt progress
			this.aspect = this.canvas.width/this.canvas.height;
			this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
			this.canvas.height = this.canvas.clientHeight * devicePixelRatio;

			this.updateDepthTexture();
		});
	}

	createDepthTexture(){
		return this.depthTexture = this.device.createTexture({
			size: [this.canvas.width, this.canvas.height],
			format: 'depth32float',
			usage: GPUTextureUsage.RENDER_ATTACHMENT
		});
	}
	updateDepthTexture(){
		if(this.depthTexture) this.depthTexture.destroy();
		//TODO make this configurable
		this.createDepthTexture();

		if (this.renderPassDescriptor) this.renderPassDescriptor.depthStencilAttachment.view = this.depthTexture.createView();
	}

	private getTransformationMatrix() {
		const viewMatrix = mat4.identity();
		mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
		const now = Date.now() / 1000;
		mat4.rotate(
			viewMatrix,
			vec3.fromValues(Math.sin(now), Math.cos(now), 0),
			1,
			viewMatrix
		);

		mat4.multiply(this.projectionMatrix, viewMatrix, this.worldMatrix);

		return this.worldMatrix;
	}

	render(){
		this.animationFrame = requestAnimationFrame(this.frame);
	}

	halt(){
		if(this.animationFrame) cancelAnimationFrame(this.animationFrame);
		this.animationFrame = 0;
	}

	frame = () => {
		const transformationMatrix = this.getTransformationMatrix();
		this.device.queue.writeBuffer(
			this.uniformBuffer,
			0,
			transformationMatrix.buffer,
			transformationMatrix.byteOffset,
			transformationMatrix.byteLength
		);
		this.renderPassDescriptor.colorAttachments[0].view = this.context
		.getCurrentTexture()
		.createView();

		const commandEncoder = this.device.createCommandEncoder();
		const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
		passEncoder.setPipeline(this.renderPipeline); //setting the last models pipeline essentially
		passEncoder.setBindGroup(0, this.uniformBindGroup);
		passEncoder.setVertexBuffer(0, this.vertexBuffer);
		passEncoder.draw(cubeVertexCount);
		passEncoder.end();
		this.device.queue.submit([commandEncoder.finish()]);
		this.animationFrame = requestAnimationFrame(this.frame);
	}

	/**
	 * A convenience initializer that handles capturing the device, adapter and subsequent information to utilize webgpu without granular configuration. 
	 * @param param0 
	 */
	static async init({
		canvas, 
		perspective=DEFAULT_VIEW_FRUSTRUM,
		onResize, 
		vertexShader = basicVert,
		fragmentShader = colorVert,
		primitive = DEFAULT_PRIMITIVE_STATE,
		depthStencil = DEFAULT_DEPTH_STENCIL,
		buffers = DEFAULT_PIPELINE_BUFFERS}: RendererOptions){
		
		assert(!!navigator.gpu, "No WebGPU available");
		const adapter = await navigator.gpu.requestAdapter();
		const device = await adapter.requestDevice();
		const format = navigator.gpu.getPreferredCanvasFormat();

		canvas = canvas ?? document.createElement("canvas");
		const context: GPUCanvasContext = canvas.getContext("webgpu");
		console.log("web-gpu", context, canvas);
		assert(!!context);
		
		context.configure({device, format});
		//moving to the initializer because for now once a pipeline is set it should live the lifetime of the renderer (with few exceptions)
		//todo this should have a singleton with a simplified configuration. 
		const renderPipeline: GPURenderPipeline = device.createRenderPipeline({
			layout: 'auto',
			vertex: {
				module: typeof vertexShader === 'string' ? device.createShaderModule({
					code: vertexShader,
				}):vertexShader,
				buffers,
			},
			fragment: {
				module: typeof fragmentShader === 'string' ? device.createShaderModule({
					code: fragmentShader
				}): fragmentShader,
				targets: [{format}]
			},
			primitive,
			depthStencil
		});

		//From this point on a binding method needs to be deployed so changes to the model effects the frame efficiently.
		//Would it be possible for the vertexBuffer to be handled by c++ and just memcopy in the vertexBuffer. 
		//I see queue writeBuffer but I cant see how that would have anything better then o(n) in javascript. 
		const vertexBuffer = device.createBuffer({
			size: cubeVertexArray.byteLength, //I have nothing yet
			usage: GPUBufferUsage.VERTEX,
			mappedAtCreation: true
		});
		new Float32Array(vertexBuffer.getMappedRange()).set(cubeVertexArray);
		vertexBuffer.unmap();

		const uniformBuffer = device.createBuffer({
			size: 16*4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});

		const uniformBindGroup = device.createBindGroup({
			layout: renderPipeline.getBindGroupLayout(0),
			entries: [
				{
					binding: 0,
					resource: {
						buffer: uniformBuffer
					}
				}
			]
		});
		return new Renderer({canvas, device, context, format, devicePixelRatio, onResize, vertexBuffer, uniformBuffer, renderPipeline, perspective, uniformBindGroup});
	}

	
};

