/** */
interface SceneTypes {
  name: string;
  id: string;
  models: Model[];
}

/** If item not defined then it not static. */
interface Model {
  vertexBuffer?: Float32Array;
  shader?: string;
  indexBuffer?: Float32Array;
  name: string;
  id: string;
  static: boolean;
}

export type { Model, SceneTypes };
