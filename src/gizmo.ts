import { mat4, vec4 } from "gl-matrix";
import Camera from "./camera";

function generateArrowGeometry(axis: "x" | "y" | "z"): Float32Array {
  const headLength = 0.2;
  const shaftLength = 0.8;
  const radius = 0.03;
  const radialSegments = 16;

  const verts: number[] = [];
  const color =
    axis === "x" ? [1, 0, 0, 1] : axis === "y" ? [0, 1, 0, 1] : [0, 0, 1, 1];

  // Shaft (cylinder sides)
  for (let i = 0; i < radialSegments; i++) {
    const t1 = (i / radialSegments) * Math.PI * 2;
    const t2 = ((i + 1) / radialSegments) * Math.PI * 2;

    const c1 = Math.cos(t1) * radius;
    const s1 = Math.sin(t1) * radius;
    const c2 = Math.cos(t2) * radius;
    const s2 = Math.sin(t2) * radius;

    const p0 =
      axis === "x" ? [0, c1, s1] : axis === "y" ? [c1, 0, s1] : [c1, s1, 0];
    const p1 =
      axis === "x"
        ? [shaftLength, c1, s1]
        : axis === "y"
          ? [c1, shaftLength, s1]
          : [c1, s1, shaftLength];
    const p2 =
      axis === "x"
        ? [shaftLength, c2, s2]
        : axis === "y"
          ? [c2, shaftLength, s2]
          : [c2, s2, shaftLength];
    const p3 =
      axis === "x" ? [0, c2, s2] : axis === "y" ? [c2, 0, s2] : [c2, s2, 0];

    verts.push(...p0, ...color, ...p1, ...color, ...p2, ...color);
    verts.push(...p0, ...color, ...p2, ...color, ...p3, ...color);
  }

  // Cone head
  const tip =
    axis === "x"
      ? [shaftLength + headLength, 0, 0]
      : axis === "y"
        ? [0, shaftLength + headLength, 0]
        : [0, 0, shaftLength + headLength];
  const baseStart = shaftLength;
  const coneRadius = radius * 1.5;
  for (let i = 0; i < radialSegments; i++) {
    const t1 = (i / radialSegments) * Math.PI * 2;
    const t2 = ((i + 1) / radialSegments) * Math.PI * 2;

    const c1 = Math.cos(t1) * coneRadius;
    const s1 = Math.sin(t1) * coneRadius;
    const c2 = Math.cos(t2) * coneRadius;
    const s2 = Math.sin(t2) * coneRadius;

    const b1 =
      axis === "x"
        ? [baseStart, c1, s1]
        : axis === "y"
          ? [c1, baseStart, s1]
          : [c1, s1, baseStart];
    const b2 =
      axis === "x"
        ? [baseStart, c2, s2]
        : axis === "y"
          ? [c2, baseStart, s2]
          : [c2, s2, baseStart];

    verts.push(...tip, ...color, ...b1, ...color, ...b2, ...color);
  }

  return new Float32Array(verts);
}

function distPointToSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number],
) {
  if (isNaN(a[0]) || isNaN(a[1]) || isNaN(b[0]) || isNaN(b[1])) return Infinity;

  const px = p[0],
    py = p[1];
  const ax = a[0],
    ay = a[1];
  const bx = b[0],
    by = b[1];

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const t = Math.max(
    0,
    Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)),
  );
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  return Math.hypot(px - closestX, py - closestY);
}

export default class Gizmo {
  device: GPUDevice;
  pipeline!: GPURenderPipeline;
  vertexBuffer!: GPUBuffer;
  bindGroup!: GPUBindGroup;
  uniformBuffer!: GPUBuffer;
  modelMatrix: Float32Array;
  vertexCount = 0;

  private canvas: HTMLCanvasElement | null = null;
  private activeAxis: "x" | "y" | "z" | null = null;
  private camera: Camera | null = null;
  private isDragging = false;
  private lastMouse: { x: number; y: number } = { x: 0, y: 0 };

  constructor(device: GPUDevice, model: Float32Array) {
    this.device = device;
    this.modelMatrix = model;
  }

  attachInteraction(canvas: HTMLCanvasElement, camera: any) {
    this.canvas = canvas;
    this.camera = camera;
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mouseup", this.onMouseUp);
  }

  private onMouseDown = (evt: MouseEvent) => {
    if (!this.canvas || !this.camera) return;

    const { width, height } = this.canvas;

    // Axis endpoints in local gizmo space
    const origin: [number, number, number] = [0, 0, 0];
    const xEnd: [number, number, number] = [1, 0, 0];
    const yEnd: [number, number, number] = [0, 1, 0];
    const zEnd: [number, number, number] = [0, 0, 1];

    // Unpack camera
    const { viewMatrix, pMatrix } = this.camera;

    // Project to screen (returns [xPx, yPx, ndcZ])
    const o2 = this.projectToScreen(
      origin,
      viewMatrix,
      pMatrix,
      this.modelMatrix,
      width,
      height,
    );
    const x2 = this.projectToScreen(
      xEnd,
      viewMatrix,
      pMatrix,
      this.modelMatrix,
      width,
      height,
    );
    const y2 = this.projectToScreen(
      yEnd,
      viewMatrix,
      pMatrix,
      this.modelMatrix,
      width,
      height,
    );
    const z2 = this.projectToScreen(
      zEnd,
      viewMatrix,
      pMatrix,
      this.modelMatrix,
      width,
      height,
    );

    const mouse: [number, number] = [evt.offsetX, evt.offsetY];

    // Compute distances to each axis line in screen space
    const distX = distPointToSegment(mouse, [o2[0], o2[1]], [x2[0], x2[1]]);
    const distY = distPointToSegment(mouse, [o2[0], o2[1]], [y2[0], y2[1]]);
    const distZ = distPointToSegment(mouse, [o2[0], o2[1]], [z2[0], z2[1]]);

    const threshold = 15; // pixel tolerance

    // If all axes are too far, do nothing
    if (distX > threshold && distY > threshold && distZ > threshold) {
      this.activeAxis = null;
      this.isDragging = false;
      return;
    }

    // Decide which axis is closest to click
    if (distX <= distY && distX <= distZ) this.activeAxis = "x";
    else if (distY <= distZ) this.activeAxis = "y";
    else this.activeAxis = "z";

    this.isDragging = true;
    this.lastMouse = { x: evt.offsetX, y: evt.offsetY };

    console.log(
      `Picked axis: ${this.activeAxis}`,
      "Distances:",
      `X ${distX.toFixed(2)} Y ${distY.toFixed(2)} Z ${distZ.toFixed(2)}`,
    );
  };

  private projectToScreen(
    point: [number, number, number],
    viewMatrix: mat4,
    pMatrix: mat4,
    modelMatrix: mat4,
    width: number,
    height: number,
  ): [number, number, number] {
    // Compute full MVP
    const mv = mat4.create();
    mat4.multiply(mv, viewMatrix, modelMatrix);
    const mvp = mat4.create();
    mat4.multiply(mvp, pMatrix, mv);

    // Transform point
    const clip = vec4.fromValues(point[0], point[1], point[2], 1);
    vec4.transformMat4(clip, clip, mvp);

    const w = clip[3];
    if (Math.abs(w) < 1e-6) {
      // Avoid dividing by zero
      return [NaN, NaN, NaN];
    }

    const ndcX = clip[0] / w;
    const ndcY = clip[1] / w;
    const ndcZ = clip[2] / w;

    // Convert NDC → screen
    const x = (ndcX * 0.5 + 0.5) * width;
    const y = (-ndcY * 0.5 + 0.5) * height;
    return [x, y, ndcZ];
  }

  private onMouseMove = (evt: MouseEvent) => {
    if (this.isDragging && this.activeAxis)
      console.log(
        "Dragging",
        this.activeAxis,
        "dx:",
        evt.movementX,
        "dy:",
        evt.movementY,
      );
    if (!this.isDragging || !this.activeAxis || !this.camera) return;

    const dx = evt.movementX;
    const dy = evt.movementY;

    // Convert screen drag to approximate world delta
    const speed = 0.01;
    const delta = (dx - dy) * speed;

    const dir =
      this.activeAxis === "x"
        ? [1, 0, 0]
        : this.activeAxis === "y"
          ? [0, 1, 0]
          : [0, 0, 1];

    // Apply translation in world space
    mat4.translate(this.modelMatrix, this.modelMatrix, [
      dir[0] * delta,
      dir[1] * delta,
      dir[2] * delta,
    ]);
  };

  private onMouseUp = () => {
    if (this.activeAxis) console.log("Released", this.activeAxis);
    this.isDragging = false;
    this.activeAxis = null;
  };

  async init(format: GPUTextureFormat) {
    const vertsX = generateArrowGeometry("x");
    const vertsY = generateArrowGeometry("y");
    const vertsZ = generateArrowGeometry("z");

    const allVerts = new Float32Array(
      vertsX.length + vertsY.length + vertsZ.length,
    );
    allVerts.set(vertsX);
    allVerts.set(vertsY, vertsX.length);
    allVerts.set(vertsZ, vertsX.length + vertsY.length);

    this.vertexCount = allVerts.length / 7;

    console.log("Gizmo vertex count:", this.vertexCount);

    this.vertexBuffer = this.device.createBuffer({
      size: allVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(allVerts);
    this.vertexBuffer.unmap();

    const shaderModule = this.device.createShaderModule({
      code: this.createShader(),
    });

    this.uniformBuffer = this.device.createBuffer({
      size: 256, // align to 256 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const layout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 7 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 1, offset: 12, format: "float32x4" },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: false,
        depthCompare: "always",
      },
    });

    this.bindGroup = this.device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });
  }

  draw(pass: GPURenderPassEncoder) {
    if (this.vertexCount < 3) return;

    const uniform = new Float32Array(20);
    uniform.set(this.modelMatrix, 0);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniform);

    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(this.vertexCount);
  }

  private createShader(): string {
    return `
      struct Uniforms {
        model: mat4x4<f32>,
        activeAxis: vec3<f32>,
      };
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      struct VSIn {
        @location(0) pos: vec3<f32>,
        @location(1) color: vec4<f32>,
      };
      struct VSOut {
        @builtin(position) Position: vec4<f32>,
        @location(0) color: vec4<f32>,
      };

      @vertex
      fn vs_main(input: VSIn) -> VSOut {
        var out: VSOut;
        // Keep at center of screen temporarily
        var scale = 0.3;
        var offset = vec3<f32>(0.0, 0.0, 0.0);
        var pos = (uniforms.model * vec4<f32>(input.pos, 1.0)).xyz * scale + offset;
        out.Position = vec4<f32>(pos, 1.0);
        out.color = input.color;
        return out;
      }

      @fragment
      fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
        let highlight = step(0.5, abs(dot(input.color.rgb, uniforms.activeAxis)));
        let color = mix(input.color.rgb, vec3<f32>(1.0, 1.0, 0.0), highlight);
        return vec4<f32>(color, 1.0);
      }
    `;
  }
}
