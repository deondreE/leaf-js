import { FBXTree } from 'fbx-parser';

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

export default class FBXParser {
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

  async loadFBX(fbxData: ArrayBuffer): Promise<boolean> {
    try {
      // Parse the binary FBX data
      const parsedData = this.parseBinaryFBX(fbxData);

      if (!parsedData) {
        console.error('Failed to parse binary FBX data.');
        return false;
      }

      this.vertices = parsedData.vertices;
      this.indices = parsedData.indices;

      await this.createBuffers();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  private parseBinaryFBX(fbxData: ArrayBuffer): {
    vertices: Vertex[];
    indices: number[];
  } | null {
    try {
      const fbxTree = new FBXTree();
      fbxTree.load(fbxData);

      const vertices: Vertex[] = [];
      const indices: number[] = [];

      // Assuming the FBX file contains a single mesh
      const geometry = fbxTree.Objects.Geometry[0];

      if (!geometry) {
        console.warn('No geometry found in FBX file.');
        return null;
      }

      const positions = geometry.vertices;
      const normals = geometry.normals;
      const uvs = geometry.uvs;
      const polygonVertexIndex = geometry.polygonVertexIndex;

      if (!positions || !polygonVertexIndex) {
        console.warn('Missing positions or indices in FBX geometry.');
        return null;
      }

      // Build vertices and indices
      let vertexOffset = 0;
      for (let i = 0; i < polygonVertexIndex.length; i++) {
        const vertexIndex = polygonVertexIndex[i];
        const positionIndex = vertexIndex < 0 ? ~vertexIndex : vertexIndex; // Handle negative indices

        const position = {
          x: positions[positionIndex * 3],
          y: positions[positionIndex * 3 + 1],
          z: positions[positionIndex * 3 + 2],
        };

        const normal = normals
          ? {
              x: normals[positionIndex * 3],
              y: normals[positionIndex * 3 + 1],
              z: normals[positionIndex * 3 + 2],
            }
          : { x: 0, y: 0, z: 0 };

        const texCoord = uvs
          ? {
              u: uvs[positionIndex * 2],
              v: uvs[positionIndex * 2 + 1],
            }
          : { u: 0, v: 0 };

        const vertex: Vertex = { position, normal, texCoord };
        vertices.push(vertex);
        indices.push(i); // Use the current index as the index
      }

      return { vertices, indices };
    } catch (error) {
      console.error('Error parsing FBX data:', error);
      return null;
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
    const shader = this.device.createShaderModule({
      code: `
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
        `,
    });

    return shader;
  }

  render(passEncoder: GPURenderPassEncoder): void {
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
    passEncoder.drawIndexed(this.indices.length);
  }
}
