import { mat4, Mat4, vec3, Vec3 } from 'wgpu-matrix';
import { cubeVertexArray } from './meshes/cube';

export type ModelTypes = 'cube' | undefined;
type ModelOptions<T extends ModelTypes> = T extends 'cube'
  ? {
      type: 'cube';
      size?: Vec3;
    }
  : {
      vertexBuffer?: Float32Array;
      indexBuffer?: Float32Array;
      pipeline: GPURenderPipeline;
    };

class Model<T extends ModelTypes> {
  type: ModelTypes = undefined;
  vertices: Float32Array;
  transformMatrix: Mat4;

  constructor(options: ModelOptions<T>) {
    this.transformMatrix = mat4.identity();
    if (options.type) {
      this.type = options.type;
      mat4.scale(this.transformMatrix, options.size ?? vec3.create(1, 1, 1), this.transformMatrix);
      switch (this.type) {
        case 'cube':
          this.vertices = cubeVertexArray;
          break;
        default:
          throw new Error('Unsupported primitive');
      }
    }
  }
}

export default Model;
