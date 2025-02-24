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
}

export type { Model, SceneTypes };
