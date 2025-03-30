/** TODO: Add Support for textures, and multi model support, just make things arrays, stay within 200bytes */
const primitiveCubeShader = `
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
};

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(1) uv: vec2<f32>,
};

struct Uniforms {
    rotationMatrix: mat4x4<f32>,
    scale: f32,
    interactable: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let scaledPosition = input.position * uniforms.scale;
    let rotatedPosition = uniforms.rotationMatrix * vec4<f32>(scaledPosition, 1.0);
    output.Position = rotatedPosition;
    output.uv = input.uv;
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  var color: vec4<f32>;

  if (uniforms.interactable == 0) {
    color = vec4<f32>(1.0, 0.0, 1.0, 1.0);
  }

  return color;
}
`;
export default primitiveCubeShader;
