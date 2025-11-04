import {
  MtlMaterial,
  MATERIAL_UNIFORM_FLOAT_COUNT,
  createMaterialUniformBufferData,
} from "./mtl";

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

interface Vec3 {
  x: number;
  y: number;
  z: number;
}
interface Vec2 {
  u: number;
  v: number;
}

interface ObjVertex {
  position: Vec3;
  normal: Vec3;
  texCoord: Vec2;
}

export default class WebGPUOBJParser {
  vertices: Vertex[] = [];
  indices: number[] = [];
  shaderString: string = "";

  device: GPUDevice;
  vertexBuffer!: GPUBuffer;
  indexBuffer!: GPUBuffer;
  pipeline!: GPURenderPipeline;
  bindGroup!: GPUBindGroup;
  materialUniformBuffer!: GPUBuffer;
  objects: Record<string, { vertices: Vertex[]; indices: number[] }> = {};
  private objectDrawRanges: { name: string; start: number; count: number }[] =
    [];

  constructor(device: GPUDevice) {
    this.device = device;
  }

  /** Parse OBJ data into GPU Buffers.  */
  async loadOBJ(objData: string): Promise<boolean> {
    const positions: Vec3[] = [];
    const texCoords: Vec2[] = [];
    const normals: Vec3[] = [];
    this.vertices = [];
    this.indices = [];

    let currentObject = "default";
    this.objects = { [currentObject]: { vertices: [], indices: [] } };
    const vertexMap = new Map<string, number>();

    try {
      const lines = objData.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const parts = trimmedLine.split(/\s+/);
        if (parts.length === 0) continue;

        const prefix = parts[0];

        switch (prefix) {
          case "o": {
            currentObject =
              parts[1] || `object_${Object.keys(this.objects).length}`;
            this.objects[currentObject] = { vertices: [], indices: [] };
            vertexMap.clear();
            break;
          }
          case "v": {
            positions.push({
              x: parseFloat(parts[1]),
              y: parseFloat(parts[2]),
              z: parseFloat(parts[3]),
            });
            break;
          }
          case "vt": {
            texCoords.push({
              u: parseFloat(parts[1]),
              v: parseFloat(parts[2]),
            });
            break;
          }
          case "vn": {
            normals.push({
              x: parseFloat(parts[1]),
              y: parseFloat(parts[2]),
              z: parseFloat(parts[3]),
            });
            break;
          }
          case "f": {
            const obj = this.objects[currentObject];
            const currentFaceVertexIndices: number[] = [];

            for (let i = 1; i < parts.length; ++i) {
              const facePart = parts[i];
              const [vStr, tStr, nStr] = facePart.split("/");

              const vIdx = parseInt(vStr, 10) - 1;
              const tIdx = tStr ? parseInt(tStr, 10) - 1 : -1;
              const nIdx = nStr ? parseInt(nStr, 10) - 1 : -1;

              if (tIdx < 0 || vIdx >= positions.length) continue;

              const key = `${vIdx}/${tIdx}/${nIdx}`;
              if (vertexMap.has(key)) {
                currentFaceVertexIndices.push(vertexMap.get(key)!);
              } else {
                const vertex: Vertex = {
                  position: positions[vIdx],
                  texCoord: tIdx >= 0 ? texCoords[tIdx] : { u: 0, v: 0 },
                  normal: nIdx >= 0 ? normals[nIdx] : { x: 0, y: 0, z: 0 },
                };
                const newIndex = obj.vertices.length;
                obj.vertices.push(vertex);
                vertexMap.set(key, newIndex);
                currentFaceVertexIndices.push(newIndex);
              }
            }

            // Triangulate if needed
            if (currentFaceVertexIndices.length >= 3) {
              const first = currentFaceVertexIndices[0];
              for (let i = 0; i < currentFaceVertexIndices.length - 1; ++i) {
                obj.indices.push(first);
                obj.indices.push(currentFaceVertexIndices[i]);
                obj.indices.push(currentFaceVertexIndices[i + 1]);
              }
            }
            break;
          }
        }
      }

      this.vertices = [];
      this.indices = [];
      let vertexOffset = 0;
      let indexOffset = 0;

      for (const [name, obj] of Object.entries(this.objects)) {
        console.log(
          `Parsed object "${name}": ${obj.vertices.length} vertices, ${obj.indices.length} indices.`,
        );

        this.objectDrawRanges.push({
          name,
          start: indexOffset,
          count: obj.indices.length,
        });

        this.vertices.push(...obj.vertices);
        this.indices.push(...obj.indices.map((i) => i + vertexOffset));

        vertexOffset += obj.vertices.length;
        indexOffset += obj.indices.length;
      }
      console.log(
        `OBJ Parsing Complete: ${this.vertices.length} unique vertices, ${this.indices.length} indices.`,
      );

      await this.createBuffers();
      return true;
    } catch (e) {
      console.error("Error parsing OBJ:", e);
      return false;
    }
  }

  async createBuffers(): Promise<void> {
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
    console.log(
      "Vertex buffer created with",
      vertexData.length,
      "floats,",
      vertexData.byteLength,
      "bytes.",
    );

    const useUint32 = this.vertices.length > 65535; // Or simply always use Uint32 for robustness

    const indexData = useUint32
      ? new Uint32Array(this.indices)
      : new Uint16Array(this.indices);

    this.indexBuffer = this.device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new (useUint32 ? Uint32Array : Uint16Array)(
      this.indexBuffer.getMappedRange(),
    ).set(indexData);
    this.indexBuffer.unmap();
    console.log(
      "Index buffer created with",
      indexData.length,
      "indices,",
      indexData.byteLength,
      "bytes. Using",
      useUint32 ? "Uint32" : "Uint16",
      "indices.",
    );
  }

  async createPipeline(
    shaderModule: GPUShaderModule,
    format: GPUTextureFormat,
    sceneUniformBuffer: GPUBuffer,
    materialUniformBuffer: GPUBuffer,
  ) {
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0, // For SceneUniforms
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1, // For MaterialUniforms
          visibility: GPUShaderStage.FRAGMENT, // Material properties mostly affect fragment stage
          buffer: { type: "uniform" },
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
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 8 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0 * 4, format: "float32x3" }, // position
              { shaderLocation: 1, offset: 3 * 4, format: "float32x3" }, // normal
              { shaderLocation: 2, offset: 6 * 4, format: "float32x2" }, // texCoord
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [{ format }],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: sceneUniformBuffer } },
        { binding: 1, resource: { buffer: materialUniformBuffer } },
      ],
    });

    this.materialUniformBuffer = materialUniformBuffer;
  }

  getShader() {
    this.shaderString = `
            struct SceneUniforms {
              mvpMatrix: mat4x4<f32>,
              lightDirection: vec3<f32>,
              lightColor: vec3<f32>,
            }
            @group(0) @binding(0) var<uniform> sceneUniforms: SceneUniforms; 

            struct MaterialUniforms {
              baseColor: vec3<f32>,
              ambientColor: vec3<f32>,
              specularColor: vec3<f32>,
              emissionColor:vec3<f32>,
              shininess: f32,
              alpha: f32,
              roughness: f32,
              metallic: f32,
              sheen: f32,
              clearcoat: f32,
              transmission: f32,
            };
            @group(0) @binding(1) var<uniform> materialUniforms: MaterialUniforms;

            struct VertexInput {
              @location(0) position: vec3<f32>,
              @location(1) normal: vec3<f32>,
              @location(2) texCoord: vec2<f32>
            };

            struct VertexOutput {
              @builtin(position) Position: vec4<f32>,
              @location(0) vNormal: vec3<f32>,
              @location(1) vWorldPos: vec3<f32>,
            };

            @vertex
            fn vs_main(input: VertexInput) -> VertexOutput {
              var output: VertexOutput;
              let worldPos = vec4<f32>(input.position, 1.0);
              output.Position = sceneUniforms.mvpMatrix * worldPos;
              output.vNormal = normalize(input.normal); // Ensure normal is normalized
              output.vWorldPos = input.position; 
              return output;
            }

            @fragment
            fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
                let N = normalize(input.vNormal);
                let L = normalize(-sceneUniforms.lightDirection);
                let V = normalize(-input.vWorldPos);
                let H = normalize(L + V);
            
                let NdotL = max(dot(N, L), 0.0);
                let NdotV = max(dot(N, V), 0.0);
                let NdotH = max(dot(N, H), 0.0);
            
                // Basic diffuse + Blinn–Phong specular
                let diffuse = materialUniforms.baseColor * NdotL;
            
                let shininess = max(materialUniforms.shininess, 1.0);
                let specularStrength = 0.2;
                let specular = specularStrength * pow(NdotH, shininess);
            
                let ambient = materialUniforms.ambientColor * 0.2;
            
                let color = ambient + diffuse + specular;
                return vec4<f32>(color, materialUniforms.alpha);
            }
        `;

    const shader = this.device.createShaderModule({
      code: this.shaderString,
    });

    return shader;
  }

  getVertexBuffer(): GPUBuffer {
    return this.vertexBuffer;
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
    passEncoder.setIndexBuffer(this.indexBuffer, "uint16");

    for (const obj of this.objectDrawRanges) {
      if (obj.count <= 0) continue;
      passEncoder.drawIndexed(obj.count, 1, obj.start, 0, 0);
    }
  }
}
