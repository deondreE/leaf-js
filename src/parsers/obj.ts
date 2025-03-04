interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Vec2 {
  u: number;
  v: number;
}

interface Vertex {
  position: Vec3;
  normal: Vec3;
  texCoord: Vec2;
}

interface Face {
  vertexIndices: number[];
  texCoordIndices: number[];
  normalIndices: number[];
}

export default class WebGPUOBJParser {
  vertices: Vertex[] = [];
  indices: number[] = [];

  device: GPUDevice;
  vertexBuffer!: GPUBuffer;
  indexBuffer!: GPUBuffer;
  pipeline!: GPURenderPipeline;
  bindGroup!: GPUBindGroup;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  async loadOBJ(objData: string): Promise<boolean> {
    const positions: Vec3[] = [];
    const texCoords: Vec2[] = [];
    const normals: Vec3[] = [];
    const shaderString: string = '';
    this.vertices = [];
    this.indices = [];

    const vertexMap = new Map<string, number>();

    try {
      const lines = objData.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const parts = trimmedLine.split(/\s+/);
        if (parts.length === 0) continue;

        const prefix = parts[0];

        switch (prefix) {
          case 'v': {
            const [_, x, y, z] = trimmedLine.split(/\s+/).map(Number);
            positions.push({ x, y, z });
            break;
          }
          case 'vt': {
            const [_, u, v] = trimmedLine.split(/\s+/).map(Number);
            texCoords.push({ u, v });
            break;
          }
          case 'vn': {
            const [_, x, y, z] = trimmedLine.split(/\s+/).map(Number);
            normals.push({ x, y, z });
            break;
          }
          case 'f': {
            const faceIndices: number[] = [];

            for (let i = 1; i < parts.length; ++i) {
              const indices: any = parts[i].split('/').map((n) => (n ? parseInt(n) - 1 : -1));
              const vIdx = indices[0] ?? -1;
              const tIdx = indices[1] ?? -1;
              const nIdx = indices[2] ?? -1;

              if (vIdx < 0 || vIdx >= positions.length) continue;

              const key = `${vIdx}/${tIdx}/${nIdx}`;
              if (vertexMap.has(key)) {
                faceIndices.push(vertexMap.get(key)!);
              } else {
                const vertex = {
                  position: positions[vIdx],
                  texCoord: tIdx >= 0 ? texCoords[tIdx] : { u: 0, v: 0 },
                  normal: nIdx >= 0 ? normals[nIdx] : { x: 0, y: 0, z: 0 },
                };

                const newIndex = this.vertices.length;
                this.vertices.push(vertex);
                vertexMap.set(key, newIndex);
                faceIndices.push(newIndex);
              }

              // Ensure triangulation (convert quads into triangles).
              if (faceIndices.length === 3) {
                this.indices.push(...faceIndices);
              } else if (faceIndices.length === 4) {
                this.indices.push(faceIndices[0], faceIndices[1], faceIndices[2]);
                this.indices.push(faceIndices[0], faceIndices[2], faceIndices[3]);
              }
            }
            break;
          }
        }
      }

      await this.createBuffers();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async createBuffers() {
    const vertexData = new Float32Array(
      this.vertices.flatMap((v) => [
        v.position.x,
        v.position.y,
        v.position.z,
        v.normal.x,
        v.normal.y,
        v.normal.z,
        v.texCoord.u,
        v.texCoord.v,
      ]),
    );

    this.vertexBuffer = this.device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(vertexData);
    this.vertexBuffer.unmap();

    const indexData = new Uint16Array(this.indices);
    this.indexBuffer = this.device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(this.indexBuffer.getMappedRange()).set(indexData);
    this.indexBuffer.unmap();
  }

  async createPipeline(
    shaderModule: GPUShaderModule,
    format: GPUTextureFormat,
    uniformBuffer: GPUBuffer,
  ) {
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'uniform' },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 8 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
              { shaderLocation: 1, offset: 3 * 4, format: 'float32x3' }, // normal
              { shaderLocation: 2, offset: 6 * 4, format: 'float32x2' }, // texCoord
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'front',
        unclippedDepth: false,
        frontFace: 'cw',
      },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    });
  }

  getShader() {
    this.shaderString = `
            struct Uniforms {
              mvpMatrix: mat4x4<f32>,
            }
            @group(0) @binding(0) var<uniform> uniforms: Uniforms; 

            struct VertexInput {
                @location(0) position: vec3<f32>,
                @location(1) normal: vec3<f32>,
                @location(2) texCoord: vec2<f32>
            };

            struct VertexOutput {
                @builtin(position) Position: vec4<f32>,
                @location(0) vNormal: vec3<f32>,
            };

            @vertex
            fn vs_main(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.Position = uniforms.mvpMatrix * vec4<f32>(input.position, 1.0);
                output.vNormal = input.normal;
                return output;
            }

            @fragment
            fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
                let color = vec3<f32>(0.5, 0.5, 0.5) * (input.vNormal.z * 0.5 + 0.5);
                return vec4<f32>(color, 1.0);
            }
        `;

    const shader = this.device.createShaderModule({
      code: this.shaderString,
    });

    return shader;
  }

  getVertexBuffer(): GPUBuffer {
    return this.vretexBuffer;
  }

  getIndexBuffer(): GPUBuffer {
    return this.indexBuffer;
  }

  getShaderString(): string {
    return this.shaderString;
  }

  render(passEncoder: GPURenderPassEncoder): void {
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
    passEncoder.drawIndexed(this.indices.length);
  }
}
