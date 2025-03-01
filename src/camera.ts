import { mat4, vec3 } from 'wgpu-matrix';

/** Reusable component as a camera that allows users to customize the overall look of their scenes. */
class Camera {
  type: string;
  FOV: number;
  cameraBounds: number;
  near: number;
  far: number;
  zoom: number = 1;

  viewMatrix: any;
    pMatrix: any;
    mvpMatrix: any;
    mMatrix: any;

  DEFAULT_UP: any = vec3.create(0, 1, 0);

  constructor(
    FOV: number,
    cameraBounds: number,
    near: number = 0.1,
    far: number,
    zoom: number = 1,
    type: string,
  ) {
    this.FOV = FOV;
    this.cameraBounds = cameraBounds;
    this.near = near;
    this.far = far;
    this.type = type;
    this.zoom = zoom ? zoom : 1;
  }

  setup(): void {
    switch (this.type) {
        case 'perspective':
            break;
        case 'orthographic':
            this.pMatrix = this.createOrthographicProjection(-1, 1, -1, 1, this.near, this.far);
            break;
    }
}

  createOrthographicProjection(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
  ): any {
    const matrix = mat4.create();

    const lr = 1 / (right - left);
    const bt = 1 / (top - bottom);
    const nf = 1 / (far - near);

    matrix[0] = 2 * lr;
    matrix[1] = 0;
    matrix[2] = 0;
    matrix[3] = 0;

    matrix[4] = 0;
    matrix[5] = 2 * bt;
    matrix[6] = 0;
    matrix[7] = 0;

    matrix[8] = 0;
    matrix[9] = 0;
    matrix[10] = -2 * nf;
    matrix[11] = 0;

    matrix[12] = -(right + left) * lr;
    matrix[13] = -(top + bottom) * bt;
    matrix[14] = -(far + near) * nf;
    matrix[15] = 1;

    return matrix;
  }

  updateProjectionMatrix(mvpMatrix: any, modelMatrix: any): void {
    this.mvpMatrix = mvpMatrix;

    mat4.multiply(mvpMatrix, this.pMatrix, this.viewMatrix);
    mat4.multiply(mvpMatrix, this.mvpMatrix, modelMatrix);
  }

  updateWorldMatrix(): void {
    // Implement any updates to the world matrix if needed
  }
}

export default Camera;
