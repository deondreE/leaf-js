// particleRenderer.ts
import { ParticleConfig, ParticleUniform } from './particleTypes';
import { standardShaders, simulationShaders } from './particleShaders';

const WORKGROUP_SIZE = 64;

export default class ParticleRenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: any;

  private pipeline!: GPURenderPipeline;
  private computePipeline!: GPUComputePipeline;
  private particleBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;
  private computeBindGroup!: GPUBindGroup;

  private particleData!: Float32Array;
  private aliveParticles = 0;
  private time = 0;

  private readonly config: Required<ParticleConfig>;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, userConfig: ParticleConfig = {}) {
    this.canvas = canvas;
    this.config = Object.assign(
      {
        particleCount: 4_000_000,
        emissionRate: 5000,
        emissionArea: { width: 2, height: 2 },
        initialVelocityDirection: { x: 0, y: 1 },
        initialVelocityMagnitude: 0.01,
        particleLifespan: 3,
        gravity: -0.0001,
        simulation: false,
      },
      userConfig,
    );

    this.init().then(() => {
      this.initBuffers();
      this.createPipelines();
      this.startRenderLoop();
    });
  }

  private async init() {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter found!');

    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext('webgpu')!;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
    });
  }

  private initBuffers() {
    const { particleCount, simulation } = this.config;
    const stride = simulation ? 4 : 5;

    this.particleData = new Float32Array(particleCount * stride);

    this.particleBuffer = this.device.createBuffer({
      size: this.particleData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(this.particleBuffer.getMappedRange()).set(this.particleData);
    this.particleBuffer.unmap();

    this.uniformBuffer = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    const { gravity, simulation, particleLifespan } = this.config;

    // Render pipeline
    const renderShader = simulation
      ? simulationShaders.render
      : standardShaders.render(particleLifespan);

    const renderModule = this.device.createShaderModule({ code: renderShader });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: renderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: simulation ? 16 : 20,
            attributes: simulation
              ? [{ shaderLocation: 0, offset: 0, format: 'float32x2' }]
              : [
                  { shaderLocation: 0, offset: 0, format: 'float32x2' },
                  { shaderLocation: 1, offset: 8, format: 'float32' },
                ],
          },
        ],
      },
      fragment: {
        module: renderModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'point-list' },
    });

    // Compute pipeline
    const computeShader = simulation
      ? simulationShaders.compute(gravity)
      : standardShaders.compute(gravity);

    const computeModule = this.device.createShaderModule({ code: computeShader });
    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: computeModule, entryPoint: 'cs_main' },
    });

    // Bind groups
    this.computeBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  private emitParticles(dt: number) {
    const {
      emissionRate,
      emissionArea,
      initialVelocityDirection,
      initialVelocityMagnitude,
      simulation,
    } = this.config;

    if (simulation) return;

    const emitCount = Math.floor(emissionRate * dt);
    for (let i = 0; i < emitCount && this.aliveParticles < this.config.particleCount; i++) {
      const index = this.aliveParticles++;
      const x = (Math.random() - 0.5) * emissionArea.width;
      const y = (Math.random() - 0.5) * emissionArea.height;
      const vx = initialVelocityDirection.x * initialVelocityMagnitude;
      const vy = initialVelocityDirection.y * initialVelocityMagnitude;

      const base = index * 5;
      this.particleData[base] = x;
      this.particleData[base + 1] = y;
      this.particleData[base + 2] = vx;
      this.particleData[base + 3] = vy;
      this.particleData[base + 4] = 0; // age
    }
  }

  private update(dt: number) {
    this.time += dt;
    const tData = new Float32Array([this.time]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, tData);

    if (!this.config.simulation) this.emitParticles(dt);
    this.device.queue.writeBuffer(this.particleBuffer, 0, this.particleData.buffer);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.computePipeline);
    pass.setBindGroup(0, this.computeBindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.config.particleCount / WORKGROUP_SIZE));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private render() {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: [0, 0, 0, 1],
        },
      ],
    });

    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.particleBuffer);
    pass.draw(this.aliveParticles || this.config.particleCount);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private startRenderLoop() {
    const loop = () => {
      const dt = 1 / 120;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }
}
