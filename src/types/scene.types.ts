import { Vec3 } from 'wgpu-matrix';

interface Scene {
  name: string;
  view: Mat4;
  children: Model[];
}

/** Definition of a model inside of a scene. */
interface Model {
  type: 'capsule' | 'cube' | 'custom' | undefined;
  vertexBuffer?: GPUBuffer | null;
  indexBuffer?: GPUBuffer | null;
}

export type { Model, Scene };
