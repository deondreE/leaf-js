import { Mat4 } from "wgpu-matrix";

export enum ModelType {
  TRIANGLE,
  QUAD,
  CUBE,
  CAPSULE,
}

interface Scene {
  name: string;
  view: Mat4;
  children: Model[];
}

/** Definition of a model inside of a scene. */
interface Model {
  type: {
    [type in ModelType]: string;
  };
  name: string;
  size: { w: number; h: number };
  verticies: Float32Array;
  transforms: Float32Array;
  sourceFile?: string;
}

export type { Model, Scene };
