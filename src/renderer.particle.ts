export default class ParticleRenderer {
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  format: GPUTextureFormat | null = null;
  computePipeline: GPUComputePipeline | null = null;
  particleBuffer: GPUBuffer | null = null;
  uniformBuffer: GPUBuffer | null = null;
  bindGroup: GPUBindGroup | null = null;
  computeBindGroup: GPUBindGroup | null = null;
  pipeline: GPURenderPipeline | null = null;
  canvas: HTMLCanvasElement;
  particleCount: number = 4000000;
  time: number = 0;
  userData?: any;

  emissionRate: number = 5000;
  emissionArea: { width: number; height: number } = { width: 2, height: 2 };
  initialVelocityDirection: { x: number; y: number } = { x: 0, y: 1 }; // Upward
  initialVelocityMagnitude: number = 0.01;
  particleLifespan: number = 3;

  simulation: boolean = false;
  particleData: Float32Array = new Float32Array();
  aliveParticles: number = 0;

  constructor(canvas: HTMLCanvasElement, userData: any) {
    this.canvas = canvas;
    this.userData = userData;

    this.particleCount = userData ? userData.particleCount : 4_000_000;

    this.init().then(() => {
      this.initBuffers();
      this.createPipeline();
      this.createComputePipeline();
      this.startRenderLoop();
    });
  }

  async init() {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.error('No webgpu adpater found!');
      return;
    }

    this.device = await adapter.requestDevice();
    this.context = this.canvas!.getContext('webgpu');
    this.format = navigator.gpu.getPreferredCanvasFormat();

    if (!this.device || !this.context || !this.format) {
      console.error('Failed to init WebGPU');
      return;
    }

    this.context.configure({
      device: this.device,
      format: this.format,
    });
  }

  private initBuffers() {
    // TODO: support user provided data when it comes to creating particles.
    if (this.simulation) {
      const particleData = new Float32Array(this.particleCount * 4);
      for (let i = 0; i < this.particleCount; i++) {
        const x = (Math.random() - 0.5) * this.emissionArea.width;
        const y = (Math.random() - 0.5) * this.emissionArea.height;

        particleData[i * 4] = x;
        particleData[i * 4 + 1] = y;

        const vx = this.initialVelocityDirection.x * this.initialVelocityMagnitude;
        const vy = this.initialVelocityDirection.y * this.initialVelocityMagnitude;

        particleData[i * 4 + 2] = vx;
        particleData[i * 4 + 3] = vy;
      }

      this.particleBuffer = this.device!.createBuffer({
        size: particleData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });
      new Float32Array(this.particleBuffer.getMappedRange()).set(particleData);
      this.particleBuffer.unmap();

      this.uniformBuffer = this.device!.createBuffer({
        size: 8, // t,g
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    } else {
      this.particleData = new Float32Array(this.particleCount * 5); // 5 floats per particle

      this.particleBuffer = this.device!.createBuffer({
        size: this.particleData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });
      new Float32Array(this.particleBuffer.getMappedRange()).set(this.particleData);
      this.particleBuffer.unmap();

      this.uniformBuffer = this.device!.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    }
  }

  private createPipeline() {
    if (this.simulation) {
      const shaderModule = this.device!.createShaderModule({
        code: `
      struct VertexInput {
          @location(0) position: vec2<f32>,
      };

      struct VertexOutput {
          @builtin(position) position: vec4<f32>,
      };

      @vertex
      fn vs_main(@location(0) pos: vec2<f32>) -> VertexOutput {
          var out: VertexOutput;
          out.position = vec4<f32>(pos, 0.0, 1.0);
          return out;
      }

      @fragment
      fn fs_main() -> @location(0) vec4<f32> {
          return vec4<f32>(1.0, 1.0, 1.0, 1.0); // White particles
      }
      `,
      });

      this.pipeline = this.device!.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              arrayStride: 16, // 2 vec2s (position, velocity)
              attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
            },
          ],
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{ format: 'bgra8unorm' }],
        },
        primitive: { topology: 'point-list' },
      });

      this.bindGroup = this.device!.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: this.uniformBuffer! } }],
      });
    } else {
      const shaderModule = this.device!.createShaderModule({
        code: `
          struct VertexInput {
            @location(0) position: vec2<f32>,
            @location(1) age: f32,
          };

          struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) age: f32,
          };

          @vertex
          fn vs_main(@location(0) pos: vec2<f32>, @location(1) age: f32) -> VertexOutput {
            var out: VertexOutput;
            out.position = vec4<f32>(pos, 0.0, 0.1);
            out.age = age;
            return out;
          }

          @fragment
          fn fs_main(@location(0) age: f32) -> @location(0) vec4<f32> {
            let alpha = 1.0 - (age / ${this.particleLifespan});
            return vec4(1.0, 1.0, 1.0, alpha);
          }
        `,
      });

      this.pipeline = this.device!.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              arrayStride: 20,
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 8, format: 'float32' },
              ],
            },
          ],
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{ format: 'bgra8unorm' }],
        },
        primitive: { topology: 'point-list' },
      });
    }
  }

  private createComputePipeline() {
    const grav = this.userData ? this.userData.gravity : -0.0001;
    if (this.simulation) {
      const computeShaderModule = this.device!.createShaderModule({
        code: `
      struct Particle {
          position: vec2<f32>,
          velocity: vec2<f32>,
      };

      @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
      @group(0) @binding(1) var<uniform> time: f32;

      @compute @workgroup_size(64)
      fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
          let index = id.x;
          if (index >= arrayLength(&particles)) { return; }

          let gravity = vec2<f32>(0.0, ${grav});
          particles[index].velocity += gravity * time;
          particles[index].position += particles[index].velocity;
      }
      `,
      });

      this.computePipeline = this.device!.createComputePipeline({
        layout: 'auto',
        compute: {
          module: computeShaderModule,
          entryPoint: 'cs_main',
        },
      });

      this.computeBindGroup = this.device!.createBindGroup({
        layout: this.computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.particleBuffer! } },
          { binding: 1, resource: { buffer: this.uniformBuffer! } },
        ],
      });
    } else {
      const temp = this.device!.createShaderModule({
        code: `
      struct Particle {
          position: vec2<f32>,
          velocity: vec2<f32>,
          age: f32
      };

      @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
      @group(0) @binding(1) var<uniform> time: f32;

      @compute @workgroup_size(64)
      fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
          let index = id.x;
          if (index >= arrayLength(&particles)) { return; }

          let gravity = vec2<f32>(0.0, ${grav});
          particles[index].velocity += gravity * time;
          particles[index].position += particles[index].velocity;
          particles[index].age += time;
      }
      `,
      });

      this.computePipeline = this.device!.createComputePipeline({
        layout: 'auto',
        compute: {
          module: temp,
          entryPoint: 'cs_main',
        },
      });

      this.computeBindGroup = this.device!.createBindGroup({
        layout: this.computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.particleBuffer! } },
          { binding: 1, resource: { buffer: this.uniformBuffer! } },
        ],
      });
    }
  }

  private emitParticles(deltaTime: number) {
    const particlesToEmit = Math.floor(this.emissionRate * deltaTime);

    for (let i = 0; i < particlesToEmit; ++i) {
      if (this.aliveParticles < this.particleCount) {
        const index = this.aliveParticles;

        const x = (Math.random() - 0.5) * this.emissionArea.width;
        const y = (Math.random() - 0.5) * this.emissionArea.height;

        const vx = this.initialVelocityDirection.x * this.initialVelocityMagnitude;
        const vy = this.initialVelocityDirection.y * this.initialVelocityMagnitude;

        this.particleData[index * 5] = x;
        this.particleData[index * 5 + 1] = y;
        this.particleData[index * 5 + 2] = vx;
        this.particleData[index * 5 + 3] = vy;
        this.particleData[index * 5 + 4] = 0;

        this.aliveParticles++;
      } else {
        // pool is full
      }
    }
  }

  public update(deltaTime: number) {
    if (this.simulation) {
      this.time += deltaTime;

      const tData = new Float32Array([this.time]);
      this.device!.queue.writeBuffer(this.uniformBuffer!, 0, tData);

      const commandEncoder = this.device!.createCommandEncoder();
      const pass = commandEncoder.beginComputePass();
      pass.setPipeline(this.computePipeline!);
      pass.setBindGroup(0, this.computeBindGroup);
      pass.dispatchWorkgroups(Math.ceil(this.particleCount / 64));
      pass.end();

      this.device!.queue.submit([commandEncoder.finish()]);
    } else {
      this.time += deltaTime;

      this.emitParticles(deltaTime);

      const timeData = new Float32Array([this.time]);
      this.device!.queue.writeBuffer(this.uniformBuffer!, 0, timeData);

      const commandEncoder = this.device!.createCommandEncoder();
      const pass = commandEncoder.beginComputePass();
      pass.setPipeline(this.computePipeline!);
      pass.setBindGroup(0, this.computeBindGroup);
      pass.dispatchWorkgroups(Math.ceil(this.particleCount / 64));
      pass.end();

      this.device!.queue.writeBuffer(
        this.particleBuffer!,
        0,
        this.particleData.buffer,
        0,
        this.particleData.byteLength,
      );

      this.device!.queue.submit([commandEncoder.finish()]);
    }
  }

  public render() {
    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: this.context!.getCurrentTexture().createView(),
          loadValue: [0, 0, 0, 1],
          storeOp: 'store',
          loadOp: 'load',
        },
      ],
    };
    const commandEncoder = this.device!.createCommandEncoder();
    // @ts-ignore
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    if (this.simulation) {
      passEncoder.setPipeline(this.pipeline!);
      passEncoder.setVertexBuffer(0, this.particleBuffer);
      passEncoder.draw(this.aliveParticles);
      passEncoder.end();

      this.device!.queue.submit([commandEncoder.finish()]);
    } else {
      passEncoder.setPipeline(this.pipeline!);
      passEncoder.setVertexBuffer(0, this.particleBuffer);
      passEncoder.draw(this.aliveParticles); // Only draw alive particles
      passEncoder.end();

      this.device!.queue.submit([commandEncoder.finish()]);
    }
  }

  private startRenderLoop() {
    const renderLoop = () => {
      const deltaTime = 1 / 120;
      this.update(deltaTime);
      this.render();
      requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }
}
