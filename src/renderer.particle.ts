export default class ParticleRenderer {
  device: GPUDevice;
  context: GPUCanvasContext | null = null;
  format: GPUCanvasFormat;
  computePipeline: GPUComputePipeline;
  particleBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  computeBindGroup: GPUBindGroup;
  pipeline: GPURenderPipeline | null = null;
  canvas: HTMLCanvasElement;
  particleCount: number = 4000000;
  time: number = 0;
  userData?: any;

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
    const particleData = new Float32Array(this.particleCount * 4);
    for (let i = 0; i < this.particleCount; i++) {
      particleData[i * 4] = (Math.random() - 0.5) * 2; // x position
      particleData[i * 4 + 1] = (Math.random() - 0.5) * 2; // y position
      particleData[i * 4 + 2] = Math.random() * 0.02 - 0.01; // x velocity
      particleData[i * 4 + 3] = Math.random() * 0.02 - 0.01; // y velocity
    }

    this.particleBuffer = this.device.createBuffer({
      size: particleData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.particleBuffer.getMappedRange()).set(particleData);
    this.particleBuffer.unmap();

    this.uniformBuffer = this.device.createBuffer({
      size: 8, // t,g
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipeline() {
    const shaderModule = this.device.createShaderModule({
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

    this.pipeline = this.device.createRenderPipeline({
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

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });
  }
  private createComputePipeline() {
    const grav = this.userData ? this.userData.gravity : -0.0001;
    const computeShaderModule = this.device.createShaderModule({
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

    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: computeShaderModule,
        entryPoint: 'cs_main',
      },
    });

    this.computeBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  public update(deltaTime: number) {
    this.time += deltaTime;

    const timeData = new Float32Array([this.time]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, timeData);

    const commandEncoder = this.device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this.computePipeline);
    pass.setBindGroup(0, this.computeBindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.particleCount / 64));
    pass.end();

    this.device.queue.submit([commandEncoder.finish()]);
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

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setVertexBuffer(0, this.particleBuffer);
    passEncoder.draw(this.particleCount);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  private startRenderLoop() {
    const renderLoop = () => {
      const deltaTime = 1 / 60;
      this.update(deltaTime);
      this.render();
      requestAnimationFrame(renderLoop);
    };
    // WISH THIS DIDN't have to be recursive, maybe a while running condition.
    renderLoop();
  }
}
