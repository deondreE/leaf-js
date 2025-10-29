// © 2025 Deondre English

import { MATERIAL_UNIFORM_BUFFER_SIZE, MtlMaterial } from './mtl';

export interface FBXMesh {
  vertices: number[];
  indices: number[];
  normals: number[];
  uvs: number[];
}

type FBXValue = string | number | number[] | null;
interface FBXNode {
  name: string;
  props: FBXValue[];
  children: FBXNode[];
}

/** Entrypoint – detects file type and dispatches parser */
export async function parseFBX(data: ArrayBuffer | string): Promise<FBXMesh> {
  // Case 1: Already loaded binary data
  if (data instanceof ArrayBuffer) {
    const header = new TextDecoder().decode(data.slice(0, 27));
    if (header.startsWith('Kaydara FBX Binary')) {
      return await parseBinaryFBX(data);
    }
    return parseASCIIFBX(new TextDecoder().decode(data));
  }

  // Case 2: Inline ASCII FBX text
  if (typeof data === 'string' && data.startsWith('; FBX')) {
    return parseASCIIFBX(data);
  }

  // Case 3: Remote or local HTTP(S) URL
  if (typeof data === 'string') {
    if (data.startsWith('blob:')) {
      throw new Error('Cannot fetch blob: URLs. Pass a pre-loaded ArrayBuffer instead.');
    }

    try {
      const resp = await fetch(data);
      if (!resp.ok) {
        throw new Error(`Failed to fetch FBX from '${data}': ${resp.status}`);
      }
      const buf = await resp.arrayBuffer();
      return await parseFBX(buf);
    } catch (err) {
      throw new Error(`Unable to load FBX from '${data}': ${err}`);
    }
  }

  throw new Error('Unrecognized FBX format or input type.');
}

/** Parse ASCII FBX */
function parseASCIIFBX(text: string): FBXMesh {
  const extract = (key: string): number[] => {
    const r = new RegExp(`${key}:\\s*\\*?\\d+\\s*\\{[^}]*a:(.*?)\\}`, 'ms');
    const m = r.exec(text);
    if (!m) return [];
    return m[1]
      .split(/,|\s+/)
      .map((n) => parseFloat(n))
      .filter((v) => !isNaN(v));
  };

  const verts = extract('Vertices');
  const idx = extract('PolygonVertexIndex');
  const normals = extract('Normals');
  const uvs = extract('UV');

  // Triangulate
  const indices: number[] = [];
  let face: number[] = [];
  for (let i = 0; i < idx.length; i++) {
    let id = idx[i];
    const end = id < 0;
    id = Math.abs(id) - 1;
    face.push(id);
    if (end) {
      if (face.length >= 3) {
        for (let j = 1; j < face.length - 1; j++) indices.push(face[0], face[j], face[j + 1]);
      }
      face = [];
    }
  }

  return { vertices: verts, indices, normals, uvs };
}

/** Zlib decompression cross-platform */
async function decompressZlib(data: Uint8Array): Promise<ArrayBuffer> {
  // Browser-native streaming decompression
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('deflate');
    const stream = new Response(new Blob([data]).stream().pipeThrough(ds));
    return await stream.arrayBuffer();
  }

  // Node fallback
  try {
    const { inflate } = await import('zlib');
    return await new Promise<ArrayBuffer>((resolve, reject) =>
      inflate(data, (err: any, buf: Buffer) => {
        if (err) reject(err);
        else resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      }),
    );
  } catch {
    throw new Error('No DEFLATE decompression available in this environment.');
  }
}

/** Parse FBX Binary */
async function parseBinaryFBX(buffer: ArrayBuffer): Promise<FBXMesh> {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();

  // Header check
  const header = decoder.decode(buffer.slice(0, 23));
  if (!header.startsWith('Kaydara FBX Binary')) {
    throw new Error('Invalid FBX binary header');
  }

  const version = view.getUint32(23, true);
  const use64 = version >= 7500;
  let cursor = 27;

  const readU32 = (o: number) => view.getUint32(o, true);
  const readU64 = (o: number) => readU32(o) + 0x100000000 * readU32(o + 4);

  const readProperty = async (): Promise<FBXValue> => {
    const t = String.fromCharCode(view.getUint8(cursor++));
    switch (t) {
      case 'F': {
        const f = view.getFloat32(cursor, true);
        cursor += 4;
        return f;
      }
      case 'D': {
        const d = view.getFloat64(cursor, true);
        cursor += 8;
        return d;
      }
      case 'I': {
        const i = view.getInt32(cursor, true);
        cursor += 4;
        return i;
      }
      case 'L': {
        const low = readU32(cursor);
        const high = readU32(cursor + 4);
        cursor += 8;
        return high * 0x100000000 + low;
      }
      case 'S': {
        const len = readU32(cursor);
        cursor += 4;
        const str = decoder.decode(buffer.slice(cursor, cursor + len));
        cursor += len;
        return str;
      }
      case 'f':
      case 'd':
      case 'i': {
        const length = readU32(cursor);
        const encoding = readU32(cursor + 4);
        const compLen = readU32(cursor + 8);
        cursor += 12;
        let bytes = buffer.slice(cursor, cursor + compLen);
        cursor += compLen;

        if (encoding !== 0) {
          bytes = await decompressZlib(new Uint8Array(bytes));
        }

        if (t === 'f') return Array.from(new Float32Array(bytes));
        if (t === 'd') return Array.from(new Float64Array(bytes));
        return Array.from(new Int32Array(bytes));
      }
      default:
        return null;
    }
  };

  /** Recursive node reader */
  const readRecord = async (): Promise<FBXNode | null> => {
    if (cursor >= buffer.byteLength) return null;

    const endOffset = use64 ? readU64(cursor) : readU32(cursor);
    const numProps = use64 ? readU64(cursor + 8) : readU32(cursor + 4);
    cursor += use64 ? 24 : 12;

    const nameLen = view.getUint8(cursor++);
    if (endOffset === 0 || nameLen === 0) return null;

    const name = decoder.decode(buffer.slice(cursor, cursor + nameLen));
    cursor += nameLen;

    const props: FBXValue[] = [];
    for (let i = 0; i < numProps; i++) props.push(await readProperty());

    const children: FBXNode[] = [];
    while (cursor < endOffset) {
      const child = await readRecord();
      if (!child) break;
      children.push(child);
    }

    cursor = endOffset;
    return { name, props, children };
  };

  const roots: FBXNode[] = [];
  while (cursor < buffer.byteLength - 160) {
    const node = await readRecord();
    if (!node) break;
    roots.push(node);
  }

  // Traverse mesh data
  const vertices: number[] = [];
  const polys: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const traverse = (node: FBXNode) => {
    switch (node.name) {
      case 'Vertices':
        vertices.push(...(node.props[0] as number[]));
        break;
      case 'PolygonVertexIndex':
        polys.push(...(node.props[0] as number[]));
        break;
      case 'LayerElementNormal': {
        const c = node.children.find((n) => n.name === 'Normals');
        if (c) normals.push(...(c.props[0] as number[]));
        break;
      }
      case 'LayerElementUV': {
        const c =
          node.children.find((n) => n.name === 'UV') || node.children.find((n) => n.name === 'UVs');
        if (c) uvs.push(...(c.props[0] as number[]));
        break;
      }
    }
    node.children.forEach(traverse);
  };
  roots.forEach(traverse);

  // Triangulate
  const indices: number[] = [];
  let face: number[] = [];
  for (let i = 0; i < polys.length; i++) {
    let id = polys[i];
    const end = id < 0;
    id = Math.abs(id) - 1;
    face.push(id);
    if (end) {
      for (let j = 1; j < face.length - 1; j++) indices.push(face[0], face[j], face[j + 1]);
      face = [];
    }
  }

  return { vertices, indices, normals, uvs };
}

/* --------------------------------------------------------------------
 * WebGPUFBXParser — FBX → GPU Mesh Upload
 * ------------------------------------------------------------------ */

export class WebGPUFBXParser {
  device: GPUDevice;
  vertices = new Float32Array();
  indices = new Uint32Array();
  vertexBuffer?: GPUBuffer;
  indexBuffer?: GPUBuffer;
  pipeline!: GPURenderPipeline;
  bindGroup!: GPUBindGroup;
  shaderString = '';

  constructor(device: GPUDevice) {
    this.device = device;
  }

  async loadFBX(source: string | ArrayBuffer): Promise<void> {
    const mesh = await parseFBX(source);

    const vCount = mesh.vertices.length / 3;
    const interleaved = new Float32Array(vCount * 8);
    for (let i = 0; i < vCount; i++) {
      interleaved.set(
        [
          mesh.vertices[i * 3] ?? 0,
          mesh.vertices[i * 3 + 1] ?? 0,
          mesh.vertices[i * 3 + 2] ?? 0,
          mesh.normals[i * 3] ?? 0,
          mesh.normals[i * 3 + 1] ?? 0,
          mesh.normals[i * 3 + 2] ?? 1,
          mesh.uvs[i * 2] ?? 0,
          mesh.uvs[i * 2 + 1] ?? 0,
        ],
        i * 8,
      );
    }

    this.vertices = interleaved;
    this.indices = new Uint32Array(mesh.indices);
    await this.createBuffers();
  }

  private async createBuffers(): Promise<void> {
    // Cleanup if old buffers exist
    this.vertexBuffer?.destroy?.();
    this.indexBuffer?.destroy?.();

    this.vertexBuffer = this.device.createBuffer({
      size: this.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(this.vertices);
    this.vertexBuffer.unmap();

    this.indexBuffer = this.device.createBuffer({
      size: this.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint32Array(this.indexBuffer.getMappedRange()).set(this.indices);
    this.indexBuffer.unmap();
  }

  /** Basic Lambert/Phong shader with proper alignment padding */
  getShader(): GPUShaderModule {
    this.shaderString = `
      struct SceneUniforms {
        mvpMatrix: mat4x4<f32>,
        lightDirection: vec3<f32>, _pad1: f32,
        lightColor: vec3<f32>, _pad2: f32,
      };
      @group(0) @binding(0) var<uniform> scene: SceneUniforms;

      struct MaterialUniforms {
        baseColor: vec3<f32>, _padA: f32,
        ambientColor: vec3<f32>, _padB: f32,
        specularColor: vec3<f32>, _padC: f32,
        emissionColor: vec3<f32>, _padD: f32,
        shininess: f32,
        alpha: f32,
      };
      @group(0) @binding(1) var<uniform> material: MaterialUniforms;

      struct VSIn {
        @location(0) pos : vec3<f32>,
        @location(1) normal : vec3<f32>,
        @location(2) uv : vec2<f32>,
      };
      struct VSOut {
        @builtin(position) Position: vec4<f32>,
        @location(0) normal: vec3<f32>,
      };

      @vertex
      fn vs_main(input: VSIn) -> VSOut {
        var o: VSOut;
        o.Position = scene.mvpMatrix * vec4<f32>(input.pos, 1.0);
        o.normal = normalize(input.normal);
        return o;
      }

      @fragment
      fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
        let N = normalize(input.normal);
        let L = normalize(-scene.lightDirection);
        let diff = max(dot(N, L), 0.0);
        var color = (material.baseColor * diff + material.ambientColor) * scene.lightColor;
        color += material.emissionColor;
        return vec4<f32>(color, material.alpha);
      }
    `;
    return this.device.createShaderModule({ code: this.shaderString });
  }

  async createPipeline(
    shader: GPUShaderModule,
    format: GPUTextureFormat,
    sceneUBO: GPUBuffer,
    materialUBO: GPUBuffer,
  ) {
    const layout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [layout],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shader,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 8 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 12, format: 'float32x3' },
              { shaderLocation: 2, offset: 24, format: 'float32x2' },
            ],
          },
        ],
      },
      fragment: {
        module: shader,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: sceneUBO } },
        { binding: 1, resource: { buffer: materialUBO } },
      ],
    });
  }

  render(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer!);
    pass.setIndexBuffer(this.indexBuffer!, 'uint32');
    pass.drawIndexed(this.indices.length);
  }
}
