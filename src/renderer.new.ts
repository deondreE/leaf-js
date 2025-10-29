import { mat4 } from 'gl-matrix';
import OBJParser from './parsers/obj';
import STLParser from './parsers/stl';

import { Model } from './types/scene.types';
import { v4 as uuid } from 'uuid';
import Camera from './camera';
import {
  createMaterialUniformBufferData,
  MATERIAL_UNIFORM_BUFFER_SIZE,
  MtlMaterial,
} from './parsers/mtl';
import { WebGPUFBXParser } from './parsers/fbx';
import Gizmo from './gizmo';

function extractRotation(dst: mat4, src: mat4) {
  // Copy only rotation/scaling part
  mat4.copy(dst, src);
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;

  // Remove any scale distortion (normalize axes)
  const xLen = Math.hypot(dst[0], dst[1], dst[2]);
  const yLen = Math.hypot(dst[4], dst[5], dst[6]);
  const zLen = Math.hypot(dst[8], dst[9], dst[10]);
  if (xLen > 0) {
    dst[0] /= xLen;
    dst[1] /= xLen;
    dst[2] /= xLen;
  }
  if (yLen > 0) {
    dst[4] /= yLen;
    dst[5] /= yLen;
    dst[6] /= yLen;
  }
  if (zLen > 0) {
    dst[8] /= zLen;
    dst[9] /= zLen;
    dst[10] /= zLen;
  }
  return dst;
}

function getWebGL2ContextSafely(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  // If another context is already bound, create a fresh duplicate
  if (canvas.getContext('webgpu')) {
    console.warn('Canvas already has a WebGPU context — creating new canvas for WebGL fallback.');
    const newCanvas = canvas.cloneNode() as HTMLCanvasElement;
    canvas.replaceWith(newCanvas);
    return newCanvas.getContext('webgl2');
  }

  return canvas.getContext('webgl2');
}

/** > Currently Supports static file definitions. */
class Renderer3D {
  canvas?: HTMLCanvasElement;
  contextType: 'webgpu' | 'webgl2' | null = null;
  device: GPUDevice | null = null;
  context: GPUCanvasContext | WebGLRenderingContext | null = null;
  format: GPUTextureFormat | null = null;
  renderTexture: GPUTexture | null = null;
  depthTexture: GPUTexture | null = null;
  private gizmo: Gizmo | null = null;
  private modelMatrix: Float32Array = mat4.create() as Float32Array;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(fileName: string) {
    if ('gpu' in navigator) {
      console.log('Attempting WebGPU initialization....');
      try {
        await this.initWebGPU(fileName);
        this.contextType = 'webgpu';
        return;
      } catch (err) {
        console.warn('WebGPU initialization failed, falling back to webgl2', err);
      }
    }

    console.log('Using WebGL2 fallback.');
    this.initWebGL(fileName);
    this.contextType = 'webgl2';
  }

  private async initWebGPU(fileName: string): Promise<void> {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter found.');
    this.device = await adapter.requestDevice();

    const gpuContext = this.canvas!.getContext('webgpu');
    if (!gpuContext) throw new Error('Failed to create WebGPU context.');

    this.context = gpuContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    gpuContext.configure({ device: this.device, format: this.format });

    this.depthTexture = this.device.createTexture({
      size: [this.canvas!.width, this.canvas!.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    console.log('[Renderer3D] WebGPU Initialized.');

    await this.loadSceneWebGPU(fileName);
  }

  private initWebGL(_fileName: string): void {
    const gl = getWebGL2ContextSafely(this.canvas!);
    if (!gl) {
      console.error('WebGL2 context not supported.');
      console.table({
        secureContext: window.isSecureContext,
        hasGPU: 'gpu' in navigator,
        ua: navigator.userAgent,
      });
      return;
    }

    this.device = gl;
    this.context = gl;

    gl.viewport(0, 0, this.canvas!.width, this.canvas!.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    console.log('[Renderer3D] WebGL2 fallback initialized.');

    this.render(() => gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT));
  }

  private async loadSceneWebGPU(fileName: string): Promise<void> {
    if (!this.device) throw new Error('Device not initialized.');

    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const mvpMatrix = mat4.create() as Float32Array;

    const { width, height } = this.canvas!;
    
    mat4.identity(this.modelMatrix); 
    // Camera def need to change
    mat4.lookAt(viewMatrix, [4, 3, 5], [0, 0, 0], [0, 1, 0]);
    mat4.perspective(projectionMatrix, Math.PI / 4, width / height, 0.1, 100);
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, this.modelMatrix);
    mat4.scale(this.modelMatrix, this.modelMatrix, [0.8, 0.8, 0.8]);

    const ext = this.returnFileExt(fileName);
    switch (ext) {
      case 'obj':
        await this.loadOBJScene(fileName, mvpMatrix);
        break;
      case 'stl':
        await this.loadSTLScene(fileName, mvpMatrix);
        break;
      case 'fbx':
        await this.loadFBXScene(fileName, mvpMatrix);
        break;
      default:
        console.warn(`Unsupported file type: ${ext}`);
    }
  }

  private async loadFBXScene(fileName: string, mvpMatrix: Float32Array) {
    const device = this.device as GPUDevice;
    const context = this.context as GPUCanvasContext;
    if (!device || !context) throw new Error('Renderer3D not initialized.');

    const absURL = new URL(fileName, window.location.href).href;
    console.log(`[Renderer3D] Loading FBX scene from: ${absURL}`);
    const fbxParser = new WebGPUFBXParser(device);

    // Step 3: Fetch binary data
    let arrayBuffer: ArrayBuffer;
    try {
      const response = await fetch(absURL);
      if (!response.ok) throw new Error(`HTTP ${response.status} (${response.statusText})`);
      arrayBuffer = await response.arrayBuffer();
    } catch (err) {
      console.error(`❌ Failed to fetch FBX '${fileName}':`, err);
      console.warn('Tip: Make sure f.fbx is in your /public/ folder and accessible via /f.fbx');
      return;
    }

    await fbxParser.loadFBX(arrayBuffer);

    const shaderModule = fbxParser.getShader();
    const SCENE_UNIFORM_BUFFER_SIZE = (16 + 4 + 4) * 4;

    const sceneUBO = device.createBuffer({
      size: SCENE_UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const sceneData = new Float32Array(24);
    sceneData.set(mvpMatrix, 0);
    sceneData.set([0.0, -1.0, -1.0, 0.0], 16);
    sceneData.set([1.0, 1.0, 1.0, 0.0], 20);
    device.queue.writeBuffer(sceneUBO, 0, sceneData);

    const materialUBO = device.createBuffer({
      size: MATERIAL_UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const defaultMaterial: MtlMaterial = {
      name: 'fbxDefault',
      Ka: [0.2, 0.2, 0.2],
      Kd: [0.7, 0.7, 0.7],
      Ks: [0.8, 0.8, 0.8],
      Ke: [0.0, 0.0, 0.0],
      Tf: [1.0, 1.0, 1.0],
      Ns: 20,
      Ni: 1,
      d: 1,
      Tr: 0,
      illum: 2,
      map_Ka: null,
      map_Kd: null,
      map_Ke: null,
      map_d: null,
      map_Ns: null,
      map_bump: null,
      disp: null,
      decal: null,
      refl: null,
      Pr: 0.4,
      Pm: 0.1,
      Ps: 0.0,
      Pc: 0.0,
      Pt: 0.0,
      map_Pr: null,
      map_Pm: null,
      map_Ps: null,
      map_Pc: null,
      map_Pt: null,
    };

    const matData = createMaterialUniformBufferData(defaultMaterial);
    device.queue.writeBuffer(materialUBO, 0, matData);

    if (!this.format) throw new Error('Canvas format not resolved.');
    await fbxParser.createPipeline(shaderModule, this.format, sceneUBO, materialUBO);

    console.log(fbxParser.createPipeline(shaderModule, this.format, sceneUBO, materialUBO))
    
    const depthView = this.depthTexture!.createView();
    const renderFrame = () => {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: depthView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      });

      fbxParser.render(pass);
      pass.end();
      device.queue.submit([encoder.finish()]);
      requestAnimationFrame(renderFrame);
    };
    renderFrame();
    console.log(`[Renderer3D] ✅ FBX scene loaded: ${fileName}`);
  }

  private async loadOBJScene(fileName: string, mvpMatrix: any) {
    
    const device = this.device as GPUDevice;
    const context = this.context as GPUCanvasContext;
    if (!device || !context) throw new Error('Renderer3D device/context not initialized.');

    const objParser = new OBJParser(device);
    const data = await fetch(fileName).then((r) => r.text());
    await objParser.loadOBJ(data);

    const shaderModule = objParser.getShader();

    // Scene uniform buffer — matrix + lighting info, etc.
    const SCENE_UNIFORM_BUFFER_SIZE = (16 + 4 + 4) * 4; // 24 floats × 4 bytes
    const sceneUniformBuffer = device.createBuffer({
      size: SCENE_UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Material uniform buffer
    const materialUniformBuffer = device.createBuffer({
      size: 200,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const sceneData = new Float32Array(24);
    sceneData.set(mvpMatrix, 0);
    sceneData.set([0, -1, -1, 0], 16);
    sceneData.set([1.0, 1.0, 1.0, 0.0], 20);
    device.queue.writeBuffer(sceneUniformBuffer, 0, sceneData);

    // Default material if none defined
    const fallbackMaterial: MtlMaterial = {
      name: 'default',
      Ka: [0.2, 0.2, 0.2],
      Kd: [0.8, 0.8, 0.8],
      Ks: [0.6, 0.6, 0.6],
      Ke: [0.1, 0.1, 0.1],
      Tf: [1.0, 1.0, 1.0],
      Ns: 10.0,
      Ni: 0.0,
      d: 0.0,
      Tr: 0.0,
      illum: 0,
      map_Kd: null,
      map_Ka: null,
      map_Ke: null,
      map_d: null,
      map_Ns: null,
      map_bump: null,
      disp: null,
      decal: null,
      refl: null,
      Pr: 0.5,
      Pm: 0.2,
      Ps: 0.0,
      Pc: 0.0,
      Pt: 0.0,
      map_Pr: null,
      map_Pm: null,
      map_Ps: null,
      map_Pc: null,
      map_Pt: null,
    };
    const matData = createMaterialUniformBufferData(fallbackMaterial);
    device.queue.writeBuffer(materialUniformBuffer, 0, matData);

    await objParser.createPipeline(
      shaderModule,
      this.format!,
      sceneUniformBuffer,
      materialUniformBuffer,
    );

    const depthView = this.depthTexture!.createView();

    // gizmo
    const gizmoModel = mat4.create() as Float32Array;
    mat4.identity(gizmoModel); // if you want orientation matching camera
    const gizmo = new Gizmo(device, this.modelMatrix);
    await gizmo.init(this.format!);
    this.gizmo = gizmo;
    
    // Render pass
    const renderFrame = () => {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: depthView,
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      });

      objParser.render(pass);
    
      if (this.gizmo && this.modelMatrix) {
        const rotMat = mat4.create();
        extractRotation(rotMat, this.modelMatrix);
        mat4.copy(this.gizmo.modelMatrix, rotMat);
      }
      
      this.gizmo?.draw(pass);
      
      pass.end();
      device.queue.submit([encoder.finish()]);

      requestAnimationFrame(renderFrame);
    };

    renderFrame();

    const model: Model = {
      name: fileName,
      id: uuid(),
      static: true,
      vertexBuffer: objParser.getVertexBuffer(),
      indexBuffer: objParser.getIndexBuffer(),
      shader: objParser.getShaderString(),
    };

    console.log('Loaded model:', model);
  }

  private async loadSTLScene(fileName: string, mvpMatrix: Float32Array) {
    const stl = new STLParser(this.device as GPUDevice);
    const data = await fetch(fileName).then((r) => r.text());
    await stl.loadSTL(data);
    const shaderModule = stl.getShader();

    const uniformBuffer = (this.device as GPUDevice).createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    (this.device as GPUDevice).queue.writeBuffer(uniformBuffer, 0, mvpMatrix);

    await stl.createPipeline(shaderModule, this.format!, uniformBuffer);

    const device = this.device as GPUDevice;
    const context = this.context as GPUCanvasContext;
    const depthView = this.depthTexture!.createView();

    const renderFrame = () => {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: depthView,
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      });

      stl.render(pass);
      pass.end();
      device.queue.submit([encoder.finish()]);
      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }

  private createModelScaleMatrix(scaleX: number, scaleY: number, scaleZ: number) {
    return new Float32Array([scaleX, 0, 0, 0, 0, scaleY, 0, 0, 0, 0, scaleZ, 0, 0, 0, 0, 1]);
  }

  private render(fn: () => void): void {
    if (typeof fn === 'function') fn();
  }

  private returnFileExt(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }
}

export default Renderer3D;
