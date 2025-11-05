import { mat4, ReadonlyVec3 } from "gl-matrix";
import OBJParser from "./parsers/obj";
import STLParser from "./parsers/stl";

import {
  Model,
  GeometryBuffers,
  Vec4,
  PrimitiveModel,
  CameraConfig,
} from "./types/scene.types";
import { v4 as uuid } from "uuid";
import Camera from "./camera";
import {
  createMaterialUniformBufferData,
  MATERIAL_UNIFORM_BUFFER_SIZE,
  MtlMaterial,
} from "./parsers/mtl";
import { WebGPUFBXParser } from "./parsers/fbx";
import Gizmo from "./gizmo";
import RigidBody from "./physics/RigidBody";
import PhysicsSystem from "./physics/PhysyicsSystem";
import PhysicsDebugger from "./physics/PhysicsDebugger";
import { extractRotation } from "./matrixMath";
import { Vec3 } from "wgpu-matrix";
import { isInt8Array } from "node:util/types";
import { radToDeg } from "wgpu-matrix/dist/3.x/utils";
import { normalizeColor } from "./color";

/** > Currently Supports static file definitions. */
class Renderer3D {
  canvas?: HTMLCanvasElement;
  contextType: "webgpu" | "webgl2" | null = null;
  device: GPUDevice | null = null;
  context: GPUCanvasContext | WebGLRenderingContext | null = null;
  format: GPUTextureFormat | null = null;
  renderTexture: GPUTexture | null = null;
  depthTexture: GPUTexture | null = null;

  private gizmo: Gizmo | null = null;
  private modelMatrix: Float32Array = mat4.create() as Float32Array;
  private models: Model[] = [];
  private camera: Camera | null = null;
  private gizmoShown: boolean = false;
  private pickTexture: GPUTexture | null = null;
  private pickTextureView: GPUTextureView | null = null;
  private physics: PhysicsSystem = new PhysicsSystem();
  private physicsEnabled = true;
  private physicsDebugger: PhysicsDebugger | null = null;
  private showPhysicsDebug = true;
  private lastTime = 0;
  private viewMatrix: any;
  private geometries: Map<string, GeometryBuffers> = new Map();
  private primitiveMap: Map<string, PrimitiveModel> = new Map();

  private fpsElement: HTMLDivElement | null = null;
  private frames: number = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  enablePhysics(enable = true) {
    this.physicsEnabled = enable;
    console.log(`[Renderer3D] Physics ${enable ? "enabled" : "disabled"}.`);
  }

  togglePhysicsDebug(enable: boolean) {
    this.showPhysicsDebug = enable;
    console.log(
      `[Renderer3D] Physics debugger ${enable ? "enabled" : "disabled"}.`,
    );
  }

  async init(fileName: string) {
    if ("gpu" in navigator) {
      console.log("Attempting WebGPU initialization....");
      try {
        await this.initWebGPU(fileName);
        this.contextType = "webgpu";
        return;
      } catch (err) {
        console.warn(
          "WebGPU initialization failed, falling back to webgl2",
          err,
        );
      }
    }

    console.log("Using WebGL2 fallback.");
    this.initWebGL(fileName);
    this.contextType = "webgl2";
  }

  private async initWebGPU(fileName: string): Promise<void> {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter found.");
    this.device = await adapter.requestDevice();

    const gpuContext = this.canvas!.getContext("webgpu");
    if (!gpuContext) throw new Error("Failed to create WebGPU context.");

    this.context = gpuContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    gpuContext.configure({ device: this.device, format: this.format });

    const { width, height } = this.canvas!;
    this.depthTexture = this.device.createTexture({
      size: [width, height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.pickTexture = this.device.createTexture({
      size: [width, height],
      format: this.format!,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    this.pickTextureView = this.pickTexture.createView();

    // --- Initialize Physics Debugger
    this.physicsDebugger = new PhysicsDebugger(this.device, this.format!);
    await this.physicsDebugger.init();

    console.log("[Renderer3D] WebGPU Initialized.");

    await this.loadSceneWebGPU(fileName);

    this.canvas!.addEventListener("click", (e) =>
      this.pickObject(e.offsetX, e.offsetY),
    );
  }

  private initWebGL(_fileName: string): void {
    const gl = this.getWebGL2ContextSafely(this.canvas!);
    if (!gl) {
      console.error("WebGL2 context not supported.");
      console.table({
        secureContext: window.isSecureContext,
        hasGPU: "gpu" in navigator,
        ua: navigator.userAgent,
      });
      return;
    }

    this.device = gl;
    this.context = gl;

    gl.viewport(0, 0, this.canvas!.width, this.canvas!.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    console.log("[Renderer3D] WebGL2 fallback initialized.");

    this.render(() => gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT));
  }

  private async loadSceneWebGPU(fileName: string): Promise<void> {
    if (!this.device) throw new Error("Device not initialized.");

    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    let mvpMatrix = mat4.create() as Float32Array;

    const { width, height } = this.canvas!;
    mat4.identity(this.modelMatrix);

    // fallback (manual)
    this.viewMatrix = viewMatrix;
    mat4.lookAt(viewMatrix, [5, 6, 15], [0, 0, 0], [0, 4, 0]);
    mat4.perspective(projectionMatrix, Math.PI / 4, width / height, 0.1, 100);
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, this.modelMatrix);

    // DO NOT double scale
    // mat4.scale(this.modelMatrix, this.modelMatrix, [0.8, 0.8, 0.8]);

    const ext = this.returnFileExt(fileName);
    switch (ext) {
      case "obj":
        await this.loadOBJScene(fileName, mvpMatrix);
        break;
      case "stl":
        await this.loadSTLScene(fileName, mvpMatrix);
        break;
      case "fbx":
        await this.loadFBXScene(fileName, mvpMatrix);
        break;
      default:
        console.warn(`Unsupported file type: ${ext}`);
    }
  }

  private async loadFBXScene(fileName: string, mvpMatrix: Float32Array) {
    const device = this.device as GPUDevice;
    const context = this.context as GPUCanvasContext;
    if (!device || !context) throw new Error("Renderer3D not initialized.");

    const absURL = new URL(fileName, window.location.href).href;
    console.log(`[Renderer3D] Loading FBX scene from: ${absURL}`);
    const fbxParser = new WebGPUFBXParser(device);

    let arrayBuffer: ArrayBuffer;
    try {
      const response = await fetch(absURL);
      if (!response.ok)
        throw new Error(`HTTP ${response.status} (${response.statusText})`);
      arrayBuffer = await response.arrayBuffer();
    } catch (err) {
      console.error(`❌ Failed to fetch FBX '${fileName}':`, err);
      console.warn(
        "Tip: Make sure f.fbx is in your /public/ folder and accessible via /f.fbx",
      );
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
      name: "fbxDefault",
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

    if (!this.format) throw new Error("Canvas format not resolved.");
    await fbxParser.createPipeline(
      shaderModule,
      this.format,
      sceneUBO,
      materialUBO,
    );

    const depthView = this.depthTexture!.createView();
    const renderFrame = () => {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthView,
          depthClearValue: 1,
          depthLoadOp: "clear",
          depthStoreOp: "store",
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

  private async loadOBJScene(fileName: string, mvpMatrix: Float32Array) {
    const device = this.device as GPUDevice;
    const context = this.context as GPUCanvasContext;
    if (!device || !context)
      throw new Error("Renderer3D device/context not initialized.");

    const index = this.models.length;
    const objParser = new OBJParser(device);

    // Fetch and load the OBJ
    const absUrl = new URL(fileName, window.location.href).href;
    console.log(`[Renderer3D] Loading OBJ: ${absUrl}`);
    const data = await fetch(absUrl).then((r) => r.text());
    await objParser.loadOBJ(data);

    const shaderModule = objParser.getShader();

    // === Scene Uniform Buffer ===
    const SCENE_UNIFORM_BUFFER_SIZE = (16 + 4 + 4) * 4; // mat4 + vec4 + vec4
    const sceneUniformBuffer = device.createBuffer({
      size: SCENE_UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // === Material Uniform Buffer ===
    const materialUniformBuffer = device.createBuffer({
      size: MATERIAL_UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Fill scene data
    const sceneData = new Float32Array(24);
    sceneData.set(mvpMatrix, 0); // 0–15 : mat4
    sceneData.set([0, -1, -1, 0], 16); // light direction
    sceneData.set([1.0, 1.0, 1.0, 0.0], 20); // light color
    device.queue.writeBuffer(sceneUniformBuffer, 0, sceneData);

    const fallbackMaterial: MtlMaterial = {
      name: "default",
      Ka: [0.2, 0.2, 0.2],
      Kd: [0.8, 0.8, 0.8],
      Ks: [0.6, 0.6, 0.6],
      Ke: [0.1, 0.1, 0.1],
      Tf: [1.0, 1.0, 1.0],
      Ns: 10.0,
      Ni: 1.0,
      d: 1.0,
      Tr: 0.0,
      illum: 2,
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
      Pm: 0.3,
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

    this.fpsElement = document.createElement("div");
    Object.assign(this.fpsElement.style, {
      position: "absolute",
      top: "8px",
      left: "8px",
      color: "#00ff88",
      fontFamily: "monospace",
      fontSize: "14px",
      background: "rgba(0, 0, 0, 0.4)",
      padding: "2px 6px",
      borderRadius: "4px",
      zIndex: "999",
    });
    this.fpsElement.textContent = "FPS: 0";
    this.canvas!.parentElement?.appendChild(this.fpsElement);

    let body: RigidBody | null = null;
    // == Physics ==
    for (const [objName, objData] of Object.entries(objParser.objects)) {
      body = new RigidBody({
        shape: "box",
        mass: 1.0,
        position: { x: 0, y: 3, z: 0 },
        restitution: 0.8,
        damping: 0.99,
      });
      this.physics.addBody(body);
      body.applyTorque([0, 2, 0]);
    }

    // === Gizmo Setup ===
    if (this.gizmoShown) {
      const gizmo = new Gizmo(device, this.modelMatrix);
      await gizmo.init(this.format!);
      this.gizmo = gizmo;
      this.gizmo.attachInteraction(this.canvas!, this.camera);
    }

    const model: Model = {
      name: fileName,
      id: uuid(),
      static: false,
      vertexBuffer: objParser.getVertexBuffer(),
      indexBuffer: objParser.getIndexBuffer(),
      shader: objParser.getShaderString(),
      // pickingColor: [100, 100, 100],
      body: body!,
      modelMatrix: mat4.create() as Float32Array,
    };
    this.models.push(model);

    const depthView = this.depthTexture!.createView();

    // === Render Loop ===
    const renderFrame = (now: number) => {
      const dt = this.lastTime ? (now - this.lastTime) / 1000 : 0;
      this.lastTime = now;

      if (this.physicsEnabled) this.physics.update(dt);

      this.frames++;
      if (now - this.lastFpsUpdate > 1000) {
        this.currentFps = this.frames;
        this.frames = 0;
        this.lastFpsUpdate = now;
        if (this.fpsElement) {
          this.fpsElement.textContent = `FPS: ${this.currentFps}`;
        }
      }

      for (const mdl of this.models) {
        if (mdl.body && mdl.modelMatrix) {
          const [x, y, z] = mdl.body.position;
          mat4.fromTranslation(mdl.modelMatrix, [x, y, z]);

          const mvp = new Float32Array(16);
          mat4.multiply(mvp, mvpMatrix, mdl.modelMatrix);
          sceneData.set(mvp, 0);
          device.queue.writeBuffer(sceneUniformBuffer, 0, sceneData);
        }
      }

      // this.camera.viewMatrix = mat4.lookAt(mat4.create(), [8, 6, 12], [0, 0, 0], [0, 1, 0]);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthView,
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });

      objParser.render(pass);

      if (this.showPhysicsDebug && this.physicsDebugger) {
        this.physicsDebugger.updateBuffers(this.physics.bodies);
        this.physicsDebugger.draw(pass);
        this.physicsDebugger.physicsGroundY = -0.56;
      }

      if (this.gizmo && this.modelMatrix) {
        const rotMat = mat4.create() as Float32Array;
        extractRotation(rotMat, this.modelMatrix);
        mat4.copy(this.gizmo.modelMatrix, rotMat);
        this.gizmo.draw(pass);
      }

      pass.end();
      device.queue.submit([encoder.finish()]);
      requestAnimationFrame(renderFrame);
    };

    requestAnimationFrame(renderFrame);

    console.log(`[Renderer3D] ✅ OBJ loaded: ${fileName}`);
  }

  private async pickObject(
    mouseX: number,
    mouseY: number,
  ): Promise<Model | null> {
    if (!this.device || !this.context) return null;
    if (!this.pickTexture || !this.pickTextureView) return null;

    const device = this.device as GPUDevice;
    const context = this.context as GPUCanvasContext;
    const width = this.canvas!.width;
    const height = this.canvas!.height;

    const pickShader = device.createShaderModule({
      code: /* wgsl */ `
          struct SceneUniforms {
            mvpMatrix: mat4x4<f32>,
          };
          @group(0) @binding(0) var<uniform> sceneUniforms : SceneUniforms;
  
          struct VertexInput {
            @location(0) position: vec3<f32>,
          };
  
          struct VertexOutput {
            @builtin(position) Position : vec4<f32>,
          };
  
          @vertex
          fn vs_main(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.Position = sceneUniforms.mvpMatrix * vec4<f32>(input.position, 1.0);
            return output;
          }
  
          @group(0) @binding(1) var<uniform> colorID : vec4<f32>;
  
          @fragment
          fn fs_main() -> @location(0) vec4<f32> {
            return colorID;
          }
        `,
    });

    const pickPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: pickShader,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 8 * 4,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module: pickShader,
        entryPoint: "fs_main",
        targets: [{ format: this.format! }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });

    const pixelBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const encoder = device.createCommandEncoder();

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.pickTextureView!,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture!.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    pass.setPipeline(pickPipeline);

    const sceneUBO = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const colorUBO = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    for (let i = 0; i < this.models.length; ++i) {
      const mdl = this.models[i];
      const colorID = [
        ((i + 1) & 0xff) / 255,
        (((i + 1) >> 8) & 0xff) / 255,
        0,
        1,
      ];
      device.queue.writeBuffer(colorUBO, 0, new Float32Array(colorID));
      device.queue.writeBuffer(sceneUBO, 0, mdl.modelMatrix);

      const bindGroup = device.createBindGroup({
        layout: pickPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: sceneUBO } },
          { binding: 1, resource: { buffer: colorUBO } },
        ],
      });

      const mvp = new Float32Array(16);
      mat4.multiply(mvp, this.viewMatrix ?? mdl.modelMatrix, mdl.modelMatrix);
      device.queue.writeBuffer(sceneUBO, 0, mvp);

      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, mdl.vertexBuffer);
      pass.setIndexBuffer(mdl.indexBuffer, "uint16");
      pass.drawIndexed(mdl.indexBuffer.size / 2, 1, 0, 0, 0);
    }
    pass.end();

    encoder.copyTextureToBuffer(
      {
        texture: this.pickTexture!,
        origin: { x: mouseX, y: height - mouseY - 1 },
      },
      { buffer: pixelBuffer, bytesPerRow: 256 },
      { width: 1, height: 1, depthOrArrayLayers: 1 },
    );

    device.queue.submit([encoder.finish()]);

    await pixelBuffer.mapAsync(GPUMapMode.READ);
    const color = new Uint8Array(pixelBuffer.getMappedRange()).slice(0, 4);
    pixelBuffer.unmap();

    const id = color[0] + (color[1] << 8);
    const selected = this.models[id - 1] ?? null;
    if (selected) {
      console.log(
        `[Renderer3D] 🎯 Picked model: ${selected.name} (index ${id - 1})`,
      );
    } else {
      console.log("[Renderer3D] No object picked.");
    }

    return selected;
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
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthView,
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });

      stl.render(pass);
      pass.end();
      device.queue.submit([encoder.finish()]);
      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }

  private createModelScaleMatrix(
    scaleX: number,
    scaleY: number,
    scaleZ: number,
  ) {
    return new Float32Array([
      scaleX,
      0,
      0,
      0,
      0,
      scaleY,
      0,
      0,
      0,
      0,
      scaleZ,
      0,
      0,
      0,
      0,
      1,
    ]);
  }

  async createPrimitive(
    shape: "box" | "sphere" | "plane" | "torus" | "cone" | "quad",
    color: Vec4 = {
      r: 0.24,
      g: 0.24,
      b: 0.24,
      a: 1,
    },
    instanceCount: number = 1,
    scale: { width: number; height: number; depth: number } = {
      width: 1,
      height: 1,
      depth: 1,
    },
    pos: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    camera?: CameraConfig,
    clearColor?: Vec4,
  ) {
    if (!this.device || !this.context)
      throw new Error("Renderer not initialized");

    const colorArray = normalizeColor(color);
    const clearColorArray = normalizeColor(clearColor!);

    const sampleCount = 4;
    const device = this.device as GPUDevice;
    const ctx = this.context as GPUCanvasContext;
    const format = this.format!;

    let vertices: Float32Array | undefined = new Float32Array();
    let indices: Uint16Array | undefined = new Uint16Array();

    switch (shape) {
      case "box":
        vertices = new Float32Array([
          -1, -1, 1, 0, 0, 1, 1, -1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, -1, 1, 1, 0,
          0, 1, -1, -1, -1, 0, 0, -1, 1, -1, -1, 0, 0, -1, 1, 1, -1, 0, 0, -1,
          -1, 1, -1, 0, 0, -1, 1, -1, -1, 1, 0, 0, 1, -1, 1, 1, 0, 0, 1, 1, 1,
          1, 0, 0, 1, 1, -1, 1, 0, 0, -1, -1, -1, -1, 0, 0, -1, -1, 1, -1, 0, 0,
          -1, 1, 1, -1, 0, 0, -1, 1, -1, -1, 0, 0, -1, 1, 1, 0, 1, 0, 1, 1, 1,
          0, 1, 0, 1, 1, -1, 0, 1, 0, -1, 1, -1, 0, 1, 0, -1, -1, 1, 0, -1, 0,
          1, -1, 1, 0, -1, 0, 1, -1, -1, 0, -1, 0, -1, -1, -1, 0, -1, 0,
        ]);
        indices = new Uint16Array([
          0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14,
          12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
        ]);
        break;
      case "sphere": {
        const latBands = 16;
        const longBands = 16;
        const radius = 1;
        const positions: number[] = [];
        const normals: number[] = [];
        const idx: number[] = [];

        for (let lat = 0; lat <= latBands; ++lat) {
          const theta = (lat * Math.PI) / latBands;
          const sinTheta = Math.sin(theta);
          const cosTheta = Math.cos(theta);

          for (let long = 0; long <= longBands; ++long) {
            const phi = (long * 2 * Math.PI) / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            positions.push(radius * x, radius * y, radius * z);
            normals.push(x, y, z);
          }
        }

        for (let lat = 0; lat < latBands; ++lat) {
          for (let long = 0; long < longBands; ++long) {
            const first = lat * (longBands + 1) + long;
            const second = first + longBands + 1;
            const next = (long + 1) % (longBands + 1);
            idx.push(first, second, second + next - long);
            idx.push(first, second + next - long, first + next - long);
          }
        }

        const interleaved = new Float32Array(positions.length + normals.length);
        for (let i = 0, j = 0; i < positions.length / 3; ++i) {
          interleaved.set(positions.slice(i * 3, i * 3 + 3), j);
          interleaved.set(normals.slice(i * 3, i * 3 + 3), j + 3);
          j += 6;
        }

        vertices = interleaved;
        indices = new Uint16Array(idx);
        break;
      }
      case "plane": {
        vertices = new Float32Array([
          // bottom-left
          -1, 0, -1, 0, 1, 0,
          // bottom-right
          1, 0, -1, 0, 1, 0,
          // top-right
          1, 0, 1, 0, 1, 0,
          // top-left
          -1, 0, 1, 0, 1, 0,
        ]);

        indices = new Uint16Array([0, 1, 2, 2, 3, 0]);
        break;
      }
      case "quad": {
        vertices = new Float32Array([
          // bottom-left
          -1, -1, 0, 0, 0, 1,
          // bottom-right
          1, -1, 0, 0, 0, 1,
          // top-right
          1, 1, 0, 0, 0, 1,
          // top-left
          -1, 1, 0, 0, 0, 1,
        ]);

        indices = new Uint16Array([0, 1, 2, 2, 3, 0]);
        break;
      }
      case "torus": {
        const segmentsR = 64; // main ring divisions
        const segmentsT = 32; // tube divisions
        const R = 8; // major radius  (distance from center)
        const r = 2; // minor radius  (tube thickness)

        const positions: number[] = [];
        const normals: number[] = [];
        const indicesArr: number[] = [];

        // vertices + normals
        for (let i = 0; i <= segmentsR; ++i) {
          const u = (i / segmentsR) * Math.PI * 2;
          const cosU = Math.cos(u);
          const sinU = Math.sin(u);

          for (let j = 0; j <= segmentsT; ++j) {
            const v = (j / segmentsT) * Math.PI * 2;
            const cosV = Math.cos(v);
            const sinV = Math.sin(v);

            const x = (R + r * cosV) * cosU;
            const y = r * sinV;
            const z = (R + r * cosV) * sinU;
            positions.push(x, y, z);

            const nx = cosU * cosV;
            const ny = sinV;
            const nz = sinU * cosV;
            normals.push(nx, ny, nz);
          }
        }

        for (let i = 0; i < segmentsR; ++i) {
          for (let j = 0; j < segmentsT; ++j) {
            const first = i * (segmentsT + 1) + j;
            const second = (i + 1) * (segmentsT + 1) + j;

            indicesArr.push(first, second, first + 1);
            indicesArr.push(second, second + 1, first + 1);
          }
        }

        // interleave position + normal
        const interleaved = new Float32Array(positions.length * 2);
        for (let i = 0, j = 0; i < positions.length / 3; ++i) {
          interleaved.set(positions.slice(i * 3, i * 3 + 3), j);
          interleaved.set(normals.slice(i * 3, i * 3 + 3), j + 3);
          j += 6;
        }

        vertices = interleaved;
        indices = new Uint16Array(indicesArr);
        break;
      }
      case "cone": {
        const radialSegments = 128;
        const height = 8;
        const radius = 10;

        const positons: number[] = [];
        const normals: number[] = [];
        const indicesArr: number[] = [];

        const halfH = height / 2;
        const tip = [0, halfH, 0];
        const baseCenter = [0, -halfH, 0];

        for (let i = 0; i <= radialSegments; ++i) {
          const theta = (i / radialSegments) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);

          const x = radius * cosT;
          const y = -halfH;
          const z = radius * sinT;
          positons.push(x, y, z);

          const slope = Math.atan(radius / height);
          const nx = cosT * Math.sin(slope);
          const ny = Math.cos(slope);
          const nz = sinT * Math.sin(slope);
          normals.push(nx, ny, nz);
        }

        const baseCenterIndex = positons.length / 3;
        positons.push(...baseCenter);
        normals.push(0, 1, 0);

        const tipIndex = positons.length / 3;
        positons.push(...tip);
        normals.push(0, 1, 0);

        // side
        for (let i = 0; i < radialSegments; ++i) {
          const next = (i + 1) % radialSegments;
          indicesArr.push(tipIndex, 1, next);
        }

        // base
        for (let i = 0; i < radialSegments; ++i) {
          const next = (i + 1) % radialSegments;
          indicesArr.push(baseCenterIndex, next, i);
        }

        const interleaved = new Float32Array(positons.length * 2);
        for (let i = 0, j = 0; i < positons.length / 3; ++i) {
          interleaved.set(positons.slice(i * 3, i * 3 + 3), j);
          interleaved.set(positons.slice(i * 3, i * 3 + 3), j);
          j += 6;
        }

        vertices = interleaved;
        indices = new Uint16Array(indicesArr);
        break;
      }
    }

    const vbuf = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(vbuf.getMappedRange()).set(vertices);
    vbuf.unmap();

    var ibuf = device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(ibuf.getMappedRange()).set(indices);
    ibuf.unmap();

    const BYTES_PER_INSTANCE = 80;
    const instanceBuffer = device.createBuffer({
      size: Math.ceil(instanceCount * BYTES_PER_INSTANCE),
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const instanceArray: number[] = [];

    const gridSize = Math.ceil(Math.cbrt(instanceCount));
    const spacing = 3;
    let index = 0;
    for (let x = 0; x < gridSize && index < instanceCount; ++x) {
      for (let y = 0; y < gridSize && index < instanceCount; ++y) {
        for (let z = 0; z < gridSize && index < instanceCount; ++z) {
          const model = mat4.create();
          let tx = pos.x;
          let ty = pos.y;
          let tz = pos.z;

          if (instanceCount > 1) {
            // build a centered grid and offset by pos
            tx += (x - gridSize / 2) * spacing;
            ty += (y - gridSize / 2) * spacing;
            tz += (z - gridSize / 2) * spacing;
          }

          mat4.rotateX(model, model, (rotation.x * Math.PI) / 180);
          mat4.rotateY(model, model, (rotation.y * Math.PI) / 180);
          mat4.rotateZ(model, model, (rotation.z * Math.PI) / 180);
          mat4.scale(model, model, [scale.width, scale.height, scale.depth]);
          mat4.translate(model, model, [tx, ty, tz]);

          instanceArray.push(...model, ...colorArray);
          ++index;
        }
      }
    }
    device.queue.writeBuffer(
      instanceBuffer,
      0,
      new Float32Array(instanceArray),
    );

    const msaaColorTexture = device.createTexture({
      size: [this.canvas!.width, this.canvas!.height],
      sampleCount,
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const msaaColorView = msaaColorTexture.createView();

    this.depthTexture = device.createTexture({
      size: [this.canvas!.width, this.canvas!.height],
      format: "depth24plus",
      sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const depthView = this.depthTexture.createView();

    // =================
    //  Camera Config
    // =================
    const modelMatrix = mat4.create();
    const projMatrix = mat4.create();
    let fov = 0;
    const aspect = this.canvas!.width / this.canvas!.height;
    let near = 0;
    let far = 0;
    if (camera) {
      console.log(`[Renderer 3D]: ${camera}`);
      fov = (camera.FOV! * Math.PI) / 180;
      near = camera.near!;
      far = camera.far!;
      mat4.perspective(projMatrix, fov, aspect, near, far);
    } else {
      fov = (60 * Math.PI) / 180;
      near = 0.1;
      far = 2000.0;
      mat4.perspective(projMatrix, fov, aspect, near, far);
    }
    const viewMatrix = mat4.create();
    const camPos: [number, number, number] = [100, 25, 200];
    const target: [number, number, number] = [0, 0, 0];
    const up: [number, number, number] = [0, 1, 0];
    mat4.lookAt(viewMatrix, camPos, target, up);

    const viewProj = mat4.create();
    mat4.multiply(viewProj, projMatrix, viewMatrix);

    const lightDir = new Float32Array([0.4, 0.7, 0.3, 0.0]);
    const lightColor = new Float32Array([1.0, 1.0, 1.0, 0.0]);

    const uniformSize = 64 + 16 + 16 + 16;
    const uniformBuffer = device.createBuffer({
      size: uniformSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, viewProj as Float32Array);
    device.queue.writeBuffer(uniformBuffer, 64, new Float32Array(colorArray));
    device.queue.writeBuffer(uniformBuffer, 80, lightDir);
    device.queue.writeBuffer(uniformBuffer, 96, lightColor);

    const shader = device.createShaderModule({
      code: `
        struct SceneUniforms {
          viewProj: mat4x4<f32>,
          baseColor: vec4<f32>,
          lightDir: vec4<f32>,
          lightColor: vec4<f32>,
        };
        @group(0) @binding(0) var<uniform> scene : SceneUniforms;
      
        struct VSOut {
          @builtin(position) Position : vec4<f32>,
          @location(0) normal : vec3<f32>,
          @location(1) vColor : vec4<f32>,
        };
        
        struct InstanceInput {
          @location(2) mat0 : vec4<f32>,
          @location(3) mat1 : vec4<f32>,
          @location(4) mat2 : vec4<f32>,
          @location(5) mat3 : vec4<f32>,
          @location(6) color : vec4<f32>,
        };
        
        @vertex
        fn vs_main(@location(0) pos: vec3<f32>, @location(1) norm: vec3<f32>, inst: InstanceInput) -> VSOut {
          var model = mat4x4<f32>(inst.mat0, inst.mat1, inst.mat2, inst.mat3); 
          var out: VSOut;
          out.Position = scene.viewProj * model * vec4<f32>(pos, 1.0);
          out.normal = normalize(norm);
          out.vColor = inst.color;
          return out;
         }
         
         @fragment
         fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
            var n = normalize(input.normal);
            var l = normalize(scene.lightDir.xyz);
            
            let diff = max(dot(n,l), 0.0);
            let ambient = 0.15;
            let brightness = ambient + diff;
            
            let rgb = input.vColor.rgb * scene.lightColor.rgb * brightness;
            return vec4<f32>(rgb, scene.baseColor.a);
         }`,
    });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      multisample: { count: sampleCount },
      vertex: {
        module: shader,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 6 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 1, offset: 3 * 4, format: "float32x3" },
            ],
          },
          {
            arrayStride: BYTES_PER_INSTANCE,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 2, offset: 0, format: "float32x4" },
              { shaderLocation: 3, offset: 16, format: "float32x4" },
              { shaderLocation: 4, offset: 32, format: "float32x4" },
              { shaderLocation: 5, offset: 48, format: "float32x4" },
              { shaderLocation: 6, offset: 64, format: "float32x4" },
            ],
          },
        ],
      },
      fragment: {
        module: shader,
        entryPoint: "fs_main",
        targets: [{ format }],
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const primtiveKey = `${shape}_${this.primitiveMap.size}`;
    const entry: PrimitiveModel = {
      key: primtiveKey,
      shape,
      indexCount: indices.length,
      instanceCount,
      vertexBuffer: vbuf,
      indexBuffer: ibuf,
      instanceBuffer,
      baseColor: color,
      shaderKey: "default",
    };
    this.primitiveMap.set(primtiveKey, entry);

    let prev = 0;
    const renderFrame = (now: number) => {
      const encoder = device.createCommandEncoder();

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: msaaColorView,
            resolveTarget: ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: {
              r: clearColorArray[0],
              g: clearColorArray[1],
              b: clearColorArray[2],
              a: clearColorArray[3],
            },
          },
        ],
        depthStencilAttachment: {
          view: depthView,
          depthLoadOp: "clear",
          depthStoreOp: "store",
          depthClearValue: 1.0,
        },
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      for (const [, p] of this.primitiveMap) {
        pass.setVertexBuffer(0, p.vertexBuffer);
        pass.setVertexBuffer(1, p.instanceBuffer);
        pass.setIndexBuffer(p.indexBuffer, "uint16");
        pass.drawIndexed(p.indexCount, p.instanceCount);
      }
      pass.end();

      device.queue.submit([encoder.finish()]);
      requestAnimationFrame(renderFrame);
      // console.log(`[Renderer3D] Drew: ${shape} primitive`);
    };
    requestAnimationFrame(renderFrame);
  }

  private render(fn: () => void): void {
    if (typeof fn === "function") fn();
  }

  private returnFileExt(fileName: string): string {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  }

  private getWebGL2ContextSafely(
    canvas: HTMLCanvasElement,
  ): WebGL2RenderingContext | null {
    // If another context is already bound, create a fresh duplicate
    if (canvas.getContext("webgpu")) {
      console.warn(
        "Canvas already has a WebGPU context — creating new canvas for WebGL fallback.",
      );
      const newCanvas = canvas.cloneNode() as HTMLCanvasElement;
      canvas.replaceWith(newCanvas);
      return newCanvas.getContext("webgl2");
    }

    return canvas.getContext("webgl2");
  }

  setCamera(camera: Camera) {
    this.camera = camera;
  }
}

export default Renderer3D;
