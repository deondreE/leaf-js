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

class STLParser {
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

  // Load and parse the STL file (ASCII format)
  async loadSTL(stlData: string): Promise<boolean> {
    const regex =
      /facet\s+normal\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)\s+([\s\S]*?)\s+endfacet/g;
    let match;
    const vertices: Vertex[] = [];
    const indices: number[] = [];
  
    // Parsing the STL data
    while ((match = regex.exec(stlData)) !== null) {
      const [_, nx, ny, nz, verticesData] = match;
      const normal: Vec3 = {
        x: parseFloat(nx),
        y: parseFloat(ny),
        z: parseFloat(nz),
      };
  
      // Extracting vertices of the triangle
      const vertexRegex = /vertex\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)/g;
      let vertexMatch;
      let triangleVertices: Vec3[] = [];
  
      while ((vertexMatch = vertexRegex.exec(verticesData)) !== null) {
        const vertex: Vec3 = {
          x: parseFloat(vertexMatch[1]),
          y: parseFloat(vertexMatch[2]),
          z: parseFloat(vertexMatch[3]),
        };
        triangleVertices.push(vertex);
      }
  
      // Store the triangle vertices
      if (triangleVertices.length === 3) {
        const offset = vertices.length; // Get the current offset BEFORE adding vertices
  
        for (const vertex of triangleVertices) {
          const texCoord: Vec2 = { u: 0, v: 0 }; // Default texCoord, you can modify this
          vertices.push({ position: vertex, normal, texCoord });
        }
  
        indices.push(offset, offset + 1, offset + 2);
      }
    }
  
    // Assign vertices and indices BEFORE creating buffers
    this.vertices = vertices;
    this.indices = indices;
  
    // Now create the buffers
    await this.createBuffers();
  
    return vertices.length > 0; // Return true if vertices were loaded
  }

  // Create buffers for vertices and indices
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

    // Ensure indices are correctly defined and the buffer is created correctly
    let indexData: Uint16Array | Uint32Array;
    if (this.indices.length > 65536) {
      indexData = new Uint32Array(this.indices);
    } else {
      indexData = new Uint16Array(this.indices);
    }

    // ***CRITICAL: Check if indexData has any data***
    if (indexData.length === 0) {
        console.warn("Index data is empty. Skipping index buffer creation.");
        return; // Or handle the error appropriately
      }
      

    this.indexBuffer = this.device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new (indexData.constructor as any)(this.indexBuffer.getMappedRange()).set(indexData);
    this.indexBuffer.unmap();
  }

  // Create the render pipeline
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

  // Shader code for vertex and fragment shaders
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

  // Render method
  render(passEncoder: GPURenderPassEncoder): void {
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
  
    // Check if indexBuffer exists BEFORE using it
    if (!this.indexBuffer) {
      console.warn(
        "Index buffer is not initialized. Rendering without indices (drawArrays)."
      );
      passEncoder.draw(this.vertices.length); // drawArrays
      return;
    }
  
    // Determine the correct index format based on the buffer size
    const indexFormat = this.indexBuffer.size <= 65536 ? "uint16" : "uint32";
    passEncoder.setIndexBuffer(this.indexBuffer, indexFormat);
  
    // Draw the correct number of indices
    passEncoder.drawIndexed(this.indices.length);
  }
}

export default STLParser;
