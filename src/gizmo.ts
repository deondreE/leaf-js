interface GizmoVertex {
  position: [number, number, number];
  color: [number, number, number, number];
}

class Gizmo {
  device: GPUDevice | null = null;
  modelMatrix: any;
  context: any;
  canvas: HTMLCanvasElement;
  projectionMatrix: any;

  constructor(device: GPUDevice, context: any, modelMatrix: any, projectionMatrix: any, canvas: HTMLCanvasElement) {
    this.device = device;
    this.context = context;
    this.modelMatrix = modelMatrix;
    this.canvas = canvas;
    this.projectionMatrix = projectionMatrix;
  }

  render(passEncoder: GPURenderPassEncoder) {
    const axisVertices = new Float32Array([
      // Vertex 0: Origin (shared by all axes)
      0.0,
      0.0,
      0.0, // Position
      1.0,
      1.0,
      1.0,
      1.0, // White (or you could make it black, or transparent if only the ends matter)

      // Vertex 1: X-axis end
      1.0,
      0.0,
      0.0, // Position
      1.0,
      0.0,
      0.0,
      1.0, // Red

      // Vertex 2: Y-axis end
      0.0,
      1.0,
      0.0, // Position
      0.0,
      1.0,
      0.0,
      1.0, // Green

      // Vertex 3: Z-axis end
      0.0,
      0.0,
      1.0, // Position
      0.0,
      0.0,
      1.0,
      1.0, // Blue
    ]);

    const axisIndices = new Uint16Array([
      0,
      1, // X-axis line (from origin to X-end)
      0,
      2, // Y-axis line (from origin to Y-end)
      0,
      3, // Z-axis line (from origin to Z-end)
    ]);

    const vertexBuffer = this.device!.createBuffer({
      size: axisVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(vertexBuffer.getMappedRange()).set(axisVertices);
    vertexBuffer.unmap();

    const indexBuffer = this.device!.createBuffer({
      size: axisIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(indexBuffer.getMappedRange()).set(axisIndices);
    indexBuffer.unmap();

    const shaderModule = this.device!.createShaderModule({
      code: this.createShader(),
    });

    const gizmoPipeline = this.device!.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: (3 + 4) * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 3 * 4, format: 'float32x4' },
            ],
          },
        ],
      },
      primitive: {
        topology: 'line-list',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      multisample: { count: 1 },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
      },
    });

    const uniformBuffer = this.device!.createBuffer({
      size: 16 * 4 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    const gizmoBindGroup = this.device!.createBindGroup({
      layout: gizmoPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    });

    this.device!.queue.writeBuffer(uniformBuffer, 0, this.modelMatrix.buffer);
    this. device!.queue.writeBuffer(uniformBuffer, 16 * 4, this.projectionMatrix.buffer);

    let depthTexture: GPUTexture;
    let depthTextureView: GPUTextureView;
    const re = () => {
      depthTexture = this.device!.createTexture({
        size: [this.canvas.width, this.canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      depthTextureView = depthTexture.createView();
      const commandEncoder = this.device!.createCommandEncoder();
      const textureView = this.context.getCurrentTexture().createView();

      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            loadOp: 'load',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: depthTextureView,
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      };

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      passEncoder.setPipeline(gizmoPipeline);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setIndexBuffer(indexBuffer, 'uint16');
      passEncoder.setBindGroup(0, gizmoBindGroup);

      passEncoder.drawIndexed(axisIndices.length);
      passEncoder.end();
      this.device!.queue.submit([commandEncoder.finish()]);
    };
    requestAnimationFrame(re);
  }

  createShader() {
    return `
            struct VertexInput {
                @location(0) position: vec3<f32>,
                @location(1) color: vec4<f32>,
            };

            struct Uniforms {
                modelMatrix: mat4x4<f32>,
                viewProjectionMatrix: mat4x4<f32>,
            };
            @group(0) @binding(0) var<uniform> uniforms: Uniforms;

            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) color: vec4<f32>,
            };
            
            @vertex
            fn vs_main(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = uniforms.viewProjectionMatrix * uniforms.modelMatrix * vec4<f32>(input.position, 1.0);
                output.color = input.color;
                return output;
            }

            @fragment
            fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
                return color;
            }
        `;
  }
}

export default Gizmo;
