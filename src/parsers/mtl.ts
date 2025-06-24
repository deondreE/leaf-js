// mtl-parser.ts

/**
 * Interface to represent a single parsed material from an MTL file.
 */
export interface MtlMaterial {
    name: string;
    Ka: number[]; // Ambient color (RGB)
    Kd: number[]; // Diffuse color (RGB)
    Ks: number[]; // Specular color (RGB)
    Ke: number[]; // Emission color (RGB) - Less common, often [0,0,0]
    Ns: number;   // Shininess / Specular Exponent
    d: number;    // Dissolve (Transparency, 0.0 - 1.0)
    Tr: number;   // Transparency (Alternative to d, 0.0 - 1.0)
    Ni: number;   // Optical Density / Index of Refraction
    map_Kd: string | null; // Diffuse texture map filename
    map_bump: string | null; // Bump map filename
    // ... potentially other properties like map_Ka, map_Ks, etc.
}

/**
 * Parses the content of an MTL file string into a dictionary of materials.
 * @param mtlContent The string content of the .mtl file.
 * @returns A Map where keys are material names and values are MtlMaterial objects.
 */
export function parseMtl(mtlContent: string): Map<string, MtlMaterial> {
    const materials = new Map<string, MtlMaterial>();
    let currentMaterial: MtlMaterial | null = null;

    const lines = mtlContent.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
            continue; // Skip empty lines and comments
        }

        const parts = trimmedLine.split(/\s+/); // Split by one or more spaces
        const command = parts[0];
        const args = parts.slice(1).map(s => s.trim());

        switch (command) {
            case 'newmtl':
                const materialName = args[0];
                if (materialName) {
                    currentMaterial = {
                        name: materialName,
                        Ka: [0.1, 0.1, 0.1], // Default ambient
                        Kd: [0.7, 0.7, 0.7], // Default diffuse (grey)
                        Ks: [0.0, 0.0, 0.0], // Default specular (black)
                        Ke: [0.0, 0.0, 0.0], // Default emission (black)
                        Ns: 10.0,            // Default shininess
                        d: 1.0,              // Default opaque
                        Tr: 1.0,             // Default opaque (alternative)
                        Ni: 1.0,             // Default index of refraction
                        map_Kd: null,
                        map_bump: null,
                    };
                    materials.set(materialName, currentMaterial);
                }
                break;
            case 'Ka': // Ambient color
            case 'Kd': // Diffuse color
            case 'Ks': // Specular color
            case 'Ke': // Emission color
                if (currentMaterial && args.length >= 3) {
                    const color = args.map(parseFloat);
                    if (command === 'Ka') currentMaterial.Ka = color;
                    else if (command === 'Kd') currentMaterial.Kd = color;
                    else if (command === 'Ks') currentMaterial.Ks = color;
                    else if (command === 'Ke') currentMaterial.Ke = color;
                }
                break;
            case 'Ns': // Shininess
                if (currentMaterial && args.length >= 1) {
                    currentMaterial.Ns = parseFloat(args[0]);
                }
                break;
            case 'd': // Dissolve (transparency)
            case 'Tr': // Transparency (alternative to d)
                if (currentMaterial && args.length >= 1) {
                    const alpha = parseFloat(args[0]);
                    if (command === 'd') currentMaterial.d = alpha;
                    else if (command === 'Tr') currentMaterial.Tr = alpha;
                }
                break;
            case 'Ni': // Optical Density / Index of Refraction
                if (currentMaterial && args.length >= 1) {
                    currentMaterial.Ni = parseFloat(args[0]);
                }
                break;
            case 'map_Kd': // Diffuse texture map
                if (currentMaterial && args.length >= 1) {
                    currentMaterial.map_Kd = args[0];
                }
                break;
            case 'map_bump': // Bump map
                if (currentMaterial && args.length >= 1) {
                    currentMaterial.map_bump = args[0];
                }
                break;
            // Add other MTL properties as needed (illum, etc.)
            default:
                // console.warn(`Unknown or unhandled MTL command: ${command}`);
                break;
        }
    }

    return materials;
}

/**
 * Calculates the size of the MaterialUniforms struct in bytes, respecting WebGPU alignment rules.
 * For `vec3<f32>` members, WebGPU typically aligns them on 16-byte boundaries.
 * For `f32`, it aligns on 4-byte boundaries.
 *
 * MaterialUniforms {
 *    baseColor: vec3<f32>,      // offset 0, size 12, aligned to 16
 *    ambientColor: vec3<f32>,   // offset 16, size 12, aligned to 16
 *    specularColor: vec3<f32>,  // offset 32, size 12, aligned to 16
 *    emissionColor: vec3<f32>,  // offset 48, size 12, aligned to 16
 *    shininess: f32,            // offset 64, size 4, aligned to 4
 *    alpha: f32,                // offset 68, size 4, aligned to 4
 * }
 * Total size: 68 bytes.
 */
export const MATERIAL_UNIFORM_BUFFER_SIZE =
    (4 * 16) + // 4 vec3s, each padded to 16 bytes = 64 bytes
    (2 * 4);   // 2 f32s, each 4 bytes = 8 bytes
               // Total = 64 + 8 = 72 bytes if last f32 does not cause alignment of next member.
               // Let's recalculate carefully:
               // baseColor: offset 0, size 12, occupies [0, 15]
               // ambientColor: offset 16, size 12, occupies [16, 31]
               // specularColor: offset 32, size 12, occupies [32, 47]
               // emissionColor: offset 48, size 12, occupies [48, 63]
               // shininess: offset 64, size 4, occupies [64, 67]
               // alpha: offset 68, size 4, occupies [68, 71]
               // Total size should be 72 bytes (72 / 4 = 18 floats)
               // This is 18 floats, so it will be a Float32Array of length 18.
export const MATERIAL_UNIFORM_FLOAT_COUNT = MATERIAL_UNIFORM_BUFFER_SIZE / 4;


/**
 * Creates a Float32Array suitable for a WebGPU uniform buffer for a single material.
 * This array can then be used to update a GPUBuffer.
 *
 * @param material The MtlMaterial object.
 * @returns A Float32Array formatted for the MaterialUniforms WGSL struct.
 */
export function createMaterialUniformBufferData(material: MtlMaterial): Float32Array {
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

    // Verify the final offset matches expected float count
    if (offset !== MATERIAL_UNIFORM_FLOAT_COUNT) {
        console.warn(`Material uniform data length mismatch! Expected ${MATERIAL_UNIFORM_FLOAT_COUNT}, got ${offset}`);
    }

    return data;
}