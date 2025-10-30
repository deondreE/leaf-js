import RigidBody from "../physics/RigidBody";
/** */
interface SceneTypes {
  name: string;
  type: string;
  id: string;
  models: Model[];
}

/** If item not defined then it not static. */
interface Model {
  vertexBuffer?: GPUBuffer;
  shader?: string;
  indexBuffer?: GPUBuffer;
  name: string;
  id: string;
  static: boolean;
  modelMatrix: Float32Array;
  pickingColor: [number, number, number];
  body?: RigidBody;
}

/** Data that can effect the color directly. Default data will be applied to the renderer when it is called. */
interface ParticleData {
  gravity?: number;
  rotation?: number;
  emitter: {
    x: number;
    y: number;
    z: number;
    shape: 'cone' | 'rect' | 'default';
  };
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

export type { Model, SceneTypes, ParticleData };
