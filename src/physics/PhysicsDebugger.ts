import RigidBody from './RigidBody';
import { mat3, mat4, quat, vec3 } from 'gl-matrix';

/**
 * Lightweight line renderer for visualizing physics shapes.
 * Draws sphere wireframes for RigidBodies and an optional ground plane line.
 */
export default class PhysicsDebugger {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private pipeline!: GPURenderPipeline;
  private vertexBuffer!: GPUBuffer;
  private vertexCount = 0;

  physicsGroundY = 0;
  showGround = true;
  showBodies = true;

  private lastColors = new WeakMap<RigidBody, [number, number, number]>();

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
  }

  private velocityToColor(v: number): [number, number, number] {
    const t = Math.min(v / 10, 1.0);
    if (t < 0.5) {
      const m = t / 0.5;
      return [m, 1.0, 0.0];
    } else {
      const m = (t - 0.5) / 0.5;
      return [1.0, 1.0 - m, 0.0];
    }
  }

  private smoothColor(
    body: RigidBody,
    target: [number, number, number],
    factor = 0.15,
  ): [number, number, number] {
    const prev = this.lastColors.get(body) ?? target;
    const out: [number, number, number] = [
      prev[0] + (target[0] - prev[0]) * factor,
      prev[1] + (target[1] - prev[1]) * factor,
      prev[2] + (target[2] - prev[2]) * factor,
    ];
    this.lastColors.set(body, out);
    return out;
  }

  async init() {
    // --- simple WGSL shader for drawing colored lines ---
    const shaderModule = this.device.createShaderModule({
      code: /* wgsl */ `
        struct VSOut {
          @builtin(position) Position : vec4<f32>,
          @location(0) color : vec3<f32>,
        };

        @vertex
        fn vs_main(@location(0) pos : vec3<f32>, @location(1) col : vec3<f32>) -> VSOut {
          var out : VSOut;
          out.Position = vec4<f32>(pos, 1.0);
          out.color = col;
          return out;
        }

        @fragment
        fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
          return vec4<f32>(in.color, 1.0);
        }
      `,
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 6 * 4,
            attributes: [
              { shaderLocation: 0, format: 'float32x3', offset: 0 },
              { shaderLocation: 1, format: 'float32x3', offset: 12 },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'line-list' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'less',
      },
    });
  }

  /** Generate simple sphere wireframe vertices around each physics body */
  updateBuffers(bodies: RigidBody[]) {
    const verts: number[] = [];

    // Ground grid ------------------------------------------------------------
    if (this.showGround) {
      const size = 20;
      const y = this.physicsGroundY;
      const c: [number, number, number] = [0.1, 0.8, 0.1];
      const step = 1;
      for (let i = -size; i <= size; i += step) {
        verts.push(-size, y, i, ...c, size, y, i, ...c); // z lines
        verts.push(i, y, -size, ...c, i, y, size, ...c); // x lines
      }
    }

    // Body wireframes -------------------------------------------------------
    if (this.showBodies) {
      const segs = 16;

      for (const b of bodies) {
        const [x, y, z] = b.position;
        const r = b.radius;
        const q = b.orientation ?? quat.create();

        const speed = Math.sqrt(b.velocity[0] ** 2 + b.velocity[1] ** 2 + b.velocity[2] ** 2);
        const targetCol = this.velocityToColor(speed);
        const color = this.smoothColor(b, targetCol);

        // Local-space circle points
        for (let i = 0; i < segs; i++) {
          const a1 = (i / segs) * Math.PI * 2;
          const a2 = ((i + 1) / segs) * Math.PI * 2;

          // Each circle is drawn in LOCAL space
          const circles = [
            // XZ circle
            [
              vec3.fromValues(Math.cos(a1) * r, 0, Math.sin(a1) * r),
              vec3.fromValues(Math.cos(a2) * r, 0, Math.sin(a2) * r),
            ],
            // XY circle
            [
              vec3.fromValues(Math.cos(a1) * r, Math.sin(a1) * r, 0),
              vec3.fromValues(Math.cos(a2) * r, Math.sin(a2) * r, 0),
            ],
            // YZ circle
            [
              vec3.fromValues(0, Math.cos(a1) * r, Math.sin(a1) * r),
              vec3.fromValues(0, Math.cos(a2) * r, Math.sin(a2) * r),
            ],
          ];

          // Transform each vertex by body orientation → world position
          for (const [v1, v2] of circles) {
            const w1 = vec3.transformQuat(vec3.create(), v1, q);
            const w2 = vec3.transformQuat(vec3.create(), v2, q);
            vec3.add(w1, w1, b.position);
            vec3.add(w2, w2, b.position);

            verts.push(w1[0], w1[1], w1[2], ...color, w2[0], w2[1], w2[2], ...color);
          }
        }
      }
    }

    const data = new Float32Array(verts);
    this.vertexCount = data.length / 6;
    this.vertexBuffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(data);
    this.vertexBuffer.unmap();
  }

  draw(passEncoder: GPURenderPassEncoder) {
    if (!this.pipeline || !this.vertexBuffer) return;
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.draw(this.vertexCount);
  }
}
