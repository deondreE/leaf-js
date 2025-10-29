export const simulationShaders = {
  render: `
    struct VertexInput {
      @location(0) position: vec2<f32>,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
    };

    @vertex
    fn vs_main(@location(0) pos: vec2<f32>) -> VertexOutput {
      var out: VertexOutput;
      out.position = vec4<f32>(pos, 0.0, 1.0);
      return out;
    }

    @fragment
    fn fs_main() -> @location(0) vec4<f32> {
      return vec4<f32>(1.0);
    }
  `,
  compute: (gravity: number) => `
    struct Particle {
      position: vec2<f32>,
      velocity: vec2<f32>,
    };

    @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
    @group(0) @binding(1) var<uniform> time: f32;

    @compute @workgroup_size(64)
    fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= arrayLength(&particles)) { return; }
      let g = vec2<f32>(0.0, ${gravity});
      particles[id.x].velocity += g * time;
      particles[id.x].position += particles[id.x].velocity;
    }
  `,
};

export const standardShaders = {
  render: (lifespan: number) => `
    struct VertexInput {
      @location(0) position: vec2<f32>,
      @location(1) age: f32,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) age: f32,
    };

    @vertex
    fn vs_main(@location(0) pos: vec2<f32>, @location(1) age: f32) -> VertexOutput {
      var out: VertexOutput;
      out.position = vec4<f32>(pos, 0.0, 0.1);
      out.age = age;
      return out;
    }

    @fragment
    fn fs_main(@location(0) age: f32) -> @location(0) vec4<f32> {
      let alpha = 1.0 - (age / ${lifespan});
      return vec4<f32>(1.0, 1.0, 1.0, alpha);
    }
  `,
  compute: (gravity: number) => `
    struct Particle {
      position: vec2<f32>,
      velocity: vec2<f32>,
      age: f32,
    };

    @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
    @group(0) @binding(1) var<uniform> time: f32;

    @compute @workgroup_size(64)
    fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= arrayLength(&particles)) { return; }
      let g = vec2<f32>(0.0, ${gravity});
      particles[id.x].velocity += g * time;
      particles[id.x].position += particles[id.x].velocity;
      particles[id.x].age += time;
    }
  `,
};