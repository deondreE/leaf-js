import { mat4 } from "gl-matrix";

function generateArrowGeometry(axis: "x" | "y" | "z"): Float32Array {
  const headLength = 0.2;
  const shaftLength = 0.8;
  const radius = 0.03;
  const radialSegments = 16;

  const verts: number[] = [];
  const color =
    axis === "x"
      ? [1, 0, 0, 1]
      : axis === "y"
      ? [0, 1, 0, 1]
      : [0, 0, 1, 1];

  // Shaft (cylinder sides)
  for (let i = 0; i < radialSegments; i++) {
    const t1 = (i / radialSegments) * Math.PI * 2;
    const t2 = ((i + 1) / radialSegments) * Math.PI * 2;

    const c1 = Math.cos(t1) * radius;
    const s1 = Math.sin(t1) * radius;
    const c2 = Math.cos(t2) * radius;
    const s2 = Math.sin(t2) * radius;

    const p0 =
      axis === "x"
        ? [0, c1, s1]
        : axis === "y"
        ? [c1, 0, s1]
        : [c1, s1, 0];
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
      axis === "x"
        ? [0, c2, s2]
        : axis === "y"
        ? [c2, 0, s2]
        : [c2, s2, 0];

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

export default class Gizmo {
  device: GPUDevice;
  pipeline!: GPURenderPipeline;
  vertexBuffer!: GPUBuffer;
  bindGroup!: GPUBindGroup;
  uniformBuffer!: GPUBuffer;
  modelMatrix: Float32Array;
  vertexCount = 0;

  constructor(device: GPUDevice, model: Float32Array) {
    this.device = device;
    this.modelMatrix = model;
  }

  async init(format: GPUTextureFormat) {
    const vertsX = generateArrowGeometry("x");
    const vertsY = generateArrowGeometry("y");
    const vertsZ = generateArrowGeometry("z");

    const allVerts = new Float32Array(
      vertsX.length + vertsY.length + vertsZ.length
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
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} }],
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

    const uniform = new Float32Array(16);
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
        return input.color;
      }
    `;
  }
}