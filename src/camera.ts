import { Mat4, mat4, vec3 } from "wgpu-matrix";

/**
 * Camera class that reproduces the same behavior as the original mat4 sequence.
 */
class Camera {
  type: "perspective" | "orthographic";
  FOV: number;
  cameraBounds: number;
  near: number;
  far: number;
  zoom: number;
  aspect: number;

  position: Mat4;
  target: Mat4;
  up: Mat4;

  viewMatrix: Mat4;
  pMatrix: Mat4;
  mvpMatrix: Mat4;
  mMatrix: Mat4;

  constructor(
    FOV: number = 45,
    cameraBounds: number = 1.0,
    near: number = 0.1,
    far: number = 100.0,
    zoom: number = 1.0,
    type: "perspective" | "orthographic" = "perspective",
    aspect: number = 1.0,
  ) {
    this.FOV = FOV;
    this.cameraBounds = cameraBounds;
    this.near = near;
    this.far = far;
    this.zoom = zoom;
    this.type = type;
    this.aspect = aspect;

    this.position = vec3.create(4, 3, 5);
    this.target = vec3.create(0, 0, 0);
    this.up = vec3.create(0, 1, 0);

    this.viewMatrix = mat4.create();
    this.pMatrix = mat4.create();
    this.mvpMatrix = mat4.create();
    this.mMatrix = mat4.create();
  }

  setup(canvas?: HTMLCanvasElement): void {
    // Compute aspect from canvas if available
    if (canvas) this.aspect = canvas.width / canvas.height;

    // Build view
    this.viewMatrix = mat4.lookAt(this.position, this.target, this.up);

    // Build projection
    switch (this.type) {
      case "perspective":
        this.pMatrix = this.createPerspectiveProjection(
          this.FOV,
          this.aspect,
          this.near,
          this.far,
        );
        break;
      case "orthographic":
        this.pMatrix = this.createOrthographicProjection(
          -this.cameraBounds,
          this.cameraBounds,
          -this.cameraBounds,
          this.cameraBounds,
          this.near,
          this.far,
        );
        break;
    }

    // Scale model matrix (same as your old version)
    mat4.identity(this.mMatrix);
    mat4.scale(this.mMatrix, this.mMatrix, [0.8, 0.8, 0.8]);

    // Compute MVP = P * V * M
    this.mvpMatrix = this.updateProjectionMatrix(this.mMatrix);
  }

  createPerspectiveProjection(
    fov: number,
    aspect: number,
    near: number,
    far: number,
  ): Float32Array {
    const f = 1.0 / Math.tan((fov * Math.PI) / 360);
    const nf = 1 / (near - far);
    const matrix = mat4.create();

    matrix[0] = f / aspect;
    matrix[1] = 0;
    matrix[2] = 0;
    matrix[3] = 0;

    matrix[4] = 0;
    matrix[5] = f;
    matrix[6] = 0;
    matrix[7] = 0;

    matrix[8] = 0;
    matrix[9] = 0;
    matrix[10] = far / (near - far);
    matrix[11] = -1;

    matrix[12] = 0;
    matrix[13] = 0;
    matrix[14] = (far * near) / (near - far);
    matrix[15] = 0;

    return matrix;
  }

  createOrthographicProjection(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
  ): Float32Array {
    const matrix = mat4.create();

    const lr = 1 / (right - left);
    const bt = 1 / (top - bottom);
    const nf = 1 / (far - near);

    matrix[0] = 2 * lr;
    matrix[5] = 2 * bt;
    matrix[10] = -2 * nf;
    matrix[12] = -(right + left) * lr;
    matrix[13] = -(top + bottom) * bt;
    matrix[14] = -(far + near) * nf;
    matrix[15] = 1;

    return matrix;
  }

  /**
   * Computes MVP = Projection * View * Model
   */
  updateProjectionMatrix(modelMatrix: Float32Array): Float32Array {
    const mvp = mat4.create();
    mat4.multiply(mvp, this.pMatrix, this.viewMatrix);
    mat4.multiply(mvp, mvp, modelMatrix);
    return (this.mvpMatrix = mvp);
  }

  /**
   * Repositions and reorients the camera.
   */
  lookAt(position: number[], target: number[], up?: number[]): void {
    this.position = vec3.create(...position);
    this.target = vec3.create(...target);
    this.up = up ? vec3.create(...up) : vec3.create(0, 1, 0);
    this.viewMatrix = mat4.lookAt(this.position, this.target, this.up);
  }
}

export default Camera;
