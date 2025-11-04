import { parse } from "uuid";

/**
 * Interface to represent a single parsed material from an MTL file.
 */
export interface MtlMaterial {
  name: string;

  /** Ambient color (RGB) */
  Ka: number[];

  /** Diffuse color (RGB) */
  Kd: number[];

  /** Specular color (RGB) */
  Ks: number[];

  /** Emission color (RGB) - Less common, often [0,0,0] */
  Ke: number[];

  /** Transmission filter (RGB) */
  Tf: number[];

  /** Shininess / Specular Exponent */
  Ns: number;

  /** Optical Density / Index of refraction. */
  Ni: number;

  /** Dissolve (Transparency, 0.0 - 1.0) */
  d: number;

  /** Transparency (Alternative to d, 0.0 - 1.0) */
  Tr: number;

  /** Illumination model (0-10) */
  illum: number;

  /**  Diffuse texture map filename */
  map_Kd: string | null;

  /** Ambient texture map filename */
  map_Ka: string | null;

  /** Specular texture map filename  */
  map_Ke: string | null;

  /** Specular exponent map filename */
  map_d: string | null;

  /** Specular exponent map filename */
  map_Ns: string | null;

  /** Bump map filename */
  map_bump: string | null;

  /** Displacement map filename */
  disp: string | null;

  /** Decal texture filename */
  decal: string | null;

  /** Reflection map filename. */
  refl: string | null;

  //============= PBR===============
  /** Roughness (0-1, inverse of glossiness) */
  Pr: number;

  /** Merallic (0-1) */
  Pm: number;

  /** Sheen (0-1) */
  Ps: number;

  /** ClaerCoat (0-1) */
  Pc: number;

  /** Transmission (0-1, for glass-like surfaces)  */
  Pt: number;

  /** roughness map */
  map_Pr: string | null;
  /** metalic map */
  map_Pm: string | null;
  /** Sheen map */
  map_Ps: string | null;
  /** Clearcoat map */
  map_Pc: string | null;
  /** transmission map */
  map_Pt: string | null;
}

/**
 * Parses the content of an MTL file string into a dictionary of materials.
 * @param mtlContent The string content of the .mtl file.
 * @returns A Map where keys are material names and values are MtlMaterial objects.
 */
export function parseMtl(mtlContent: string): Map<string, MtlMaterial> {
  const materials = new Map<string, MtlMaterial>();
  let currentMaterial: MtlMaterial | null = null;

  const lines = mtlContent.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) continue;

    const parts = trimmedLine.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case "newmtl":
        const materialName = args.join(" ");
        if (materialName) {
          currentMaterial = {
            name: materialName,
            Ka: [0.1, 0.1, 0.1], // Default ambient
            Kd: [0.7, 0.7, 0.7], // Default diffuse (grey)
            Ks: [0.0, 0.0, 0.0], // Default specular (black)
            Ke: [0.0, 0.0, 0.0], // Default emission (black)
            Tf: [1.0, 1.0, 1.0],
            Ns: 10.0, // Default shininess
            Ni: 1.0,
            d: 1.0, // Default opaque
            Tr: 0.0,
            illum: 2,
            map_Kd: null,
            map_Ka: null,
            map_Ke: null,
            map_d: null,
            map_Ns: null,
            map_bump: null,
            disp: null,
            decal: null,
            refl: null,
            Pr: 0.5,
            Pm: 0.0,
            Ps: 0.0,
            Pc: 0.0,
            Pt: 0.0,
            map_Pr: null,
            map_Pm: null,
            map_Ps: null,
            map_Pc: null,
            map_Pt: null,
          };
          materials.set(materialName, currentMaterial);
        }
        break;
      case "Ka":
      case "Kd":
      case "Ks":
      case "Ke":
      case "Tf":
        if (currentMaterial && args.length >= 3) {
          const color = args.map(parseFloat).slice(0, 3);
          (currentMaterial as any)[command] = color;
        }
        break;
      case "Ns": // Shininess
        if (currentMaterial && args.length >= 1) {
          currentMaterial.Ns = parseFloat(args[0]);
        }
        break;
      case "Ni":
        if (currentMaterial && args.length >= 1)
          currentMaterial.Ni = parseFloat(args[0]);
        break;
      case "d":
        if (currentMaterial && args.length >= 1) {
          currentMaterial.d = parseFloat(args[0]);
          currentMaterial.Tr = 1.0 - currentMaterial.d;
        }
        break;
      case "Tr": // Transparency (alternative to d)
        if (currentMaterial && args.length >= 1) {
          const alpha = parseFloat(args[0]);
          currentMaterial.d = 1.0 - currentMaterial.Tr;
        }
        break;
      case "illum":
        if (currentMaterial && args.length >= 1)
          currentMaterial.illum = parseInt(args[0]);
        break;

      case "Pr":
      case "Pm":
      case "Ps":
      case "Pc":
      case "Pt":
        if (currentMaterial)
          (currentMaterial as any)[command] = parseFloat(args[0]);
        break;

      case "map_Ka":
      case "map_Kd":
      case "map_Ks":
      case "map_Ke":
      case "map_d":
      case "map_Ns":
      case "disp":
      case "decal":
      case "refl":
      case "map_Pr":
      case "map_Pm":
      case "map_Ps":
      case "map_Pc":
      case "map_Pt":
        if (currentMaterial) (currentMaterial as any)[command] = args.join(" ");
        break;

      case "map_bump":
      case "bump":
        if (currentMaterial && args.length >= 1) {
          const bmIndex = args.indexOf("-bm");
          if (bmIndex >= 0 && bmIndex + 2 <= args.length) {
            const filename = args.slice(bmIndex + 2).join(" ");
            currentMaterial.map_bump = filename;
          } else {
            currentMaterial.map_bump = args.join(" ");
          }
        }
        break;
      default:
        break;
    }
  }

  return materials;
}

export const MATERIAL_UNIFORM_BUFFER_SIZE = 96;
export const MATERIAL_UNIFORM_FLOAT_COUNT = 24;

/**
 * Creates a Float32Array suitable for a WebGPU uniform buffer for a single material.
 * This array can then be used to update a GPUBuffer.
 *
 * @param material The MtlMaterial object.
 * @returns A Float32Array formatted for the MaterialUniforms WGSL struct.
 */
export function createMaterialUniformBufferData(
  material: MtlMaterial,
): Float32Array {
  const data = new Float32Array(MATERIAL_UNIFORM_FLOAT_COUNT);

  let offset = 0; // Offset in terms of Float32Array indices (not bytes)

  // baseColor (Kd) - vec3, aligned to 16 bytes (4 floats)
  data[offset++] = material.Kd[0];
  data[offset++] = material.Kd[1];
  data[offset++] = material.Kd[2];
  offset++; // Padding for vec3 to reach 4-float alignment

  // ambientColor (Ka) - vec3, aligned to 16 bytes (4 floats)
  data[offset++] = material.Ka[0];
  data[offset++] = material.Ka[1];
  data[offset++] = material.Ka[2];
  offset++; // Padding

  // specularColor (Ks) - vec3, aligned to 16 bytes (4 floats)
  data[offset++] = material.Ks[0];
  data[offset++] = material.Ks[1];
  data[offset++] = material.Ks[2];
  offset++; // Padding

  // emissionColor (Ke) - vec3, aligned to 16 bytes (4 floats)
  data[offset++] = material.Ke[0];
  data[offset++] = material.Ke[1];
  data[offset++] = material.Ke[2];
  offset++; // Padding

  // shininess (Ns) - f32, aligned to 4 bytes (1 float)
  data[offset++] = material.Ns;

  // alpha (d or Tr) - f32, aligned to 4 bytes (1 float)
  data[offset++] = material.d !== undefined ? material.d : material.Tr; // Use 'd' if available, otherwise 'Tr'

  // PBR Fields
  data[offset++] = material.Pr ?? 0.5; // Roughness
  data[offset++] = material.Pm ?? 0.0; // Metallic
  data[offset++] = material.Ps ?? 0.0; // Sheen
  data[offset++] = material.Pc ?? 0.0; // Clearcoat
  data[offset++] = material.Pt ?? 0.0; // Transmission

  while (offset < MATERIAL_UNIFORM_FLOAT_COUNT) {
    data[offset++] = 0.0;
  }

  // Verify the final offset matches expected float count
  if (offset !== MATERIAL_UNIFORM_FLOAT_COUNT) {
    console.warn(
      `Material uniform data length mismatch! Expected ${MATERIAL_UNIFORM_FLOAT_COUNT}, got ${offset}`,
    );
  }

  return data;
}
