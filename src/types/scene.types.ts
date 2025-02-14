import { Vec3 } from 'wgpu-matrix';

/** Definition of an animation applied to a model */
interface Animation {
  name: string;
  type: 'rotation' | 'translation' | 'scale';
  duration: string;

  start(): void;
  update(dt: number): void;
  stop(): void;
}

interface Scene {
  name: string;
  view: Mat4;
  children: Model[];
}

/** Definition of a model inside of a scene. */
interface Model {
  type: 'square' | 'circle' | 'custom';
  id: number;
  name: string;
  position: Vec3;
  size: { w: number; h: number };
  verticies: Float32Array;
  shaders: string[];
  modelFile?: string;
  startAnimation: boolean;

  /** Apply transformation: Scale, Rotation, Transform. */
  applyTransformation(
    type: 'scale' | 'rotate' | 'translate',
    value: { x: number; y: number; z: number },
  ): void;
}

export type { Model, Scene };
