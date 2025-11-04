import { mat3, quat, vec3 } from "gl-matrix";
import { Vec3, PhysicsShape, RigidBodyConfig } from "../types/scene.types";

/**
 * Represents a dynamic or static rigid body in the physics world.
 *
 * Supports linear and angular dynamics:
 *  - Linear: position, velocity, external forces
 *  - Angular: rotation (quaternion), angular velocity, applied torque
 *
 * The physics integrator (`PhysicsSystem`) advances these values over time.
 */
export default class RigidBody {
  /** Type of collider shape used for physical simulation. */
  shape: PhysicsShape;

  /** Body mass (kg). A value ≤ 0 indicates a static, immovable body. */
  mass: number;

  /** World‑space position in meters. */
  position: [number, number, number];

  /** Linear velocity in world‑space (m/s). */
  velocity: [number, number, number];

  /** Linear acceleration accumulator (m/s², reset every frame). */
  acceleration: [number, number, number];

  /** Orientation of the body expressed as a quaternion. */
  orientation: quat;

  /** Angular velocity vector in radians/second. */
  angularVelocity: vec3;

  /** Torque accumulator applied this frame (N·m). */
  torque: vec3;

  /** Coefficient of restitution (bounce factor 0–1). */
  restitution: number;

  /** Damping factor applied to both linear and angular velocity (0–1). */
  damping: number;

  /** Friction coefficient affecting tangential motion when grounded. */
  friction: number;

  /** Radius used for spherical shapes. */
  radius: number;

  /** Local box half‑extents (width, height, depth). */
  size?: [number, number, number];

  /** Whether this body is affected by gravity. */
  useGravity: boolean;

  /** Accumulated linear forces for the current integration step. */
  force: vec3 = [0, 0, 0];

  /** Moment of inertia tensor in local/body coordinates. */
  inertiaTensor: mat3;

  /** Inverse inertia tensor for computing angular acceleration. */
  inverseInertiaTensor: mat3;

  /**
   * Constructs a new rigid body with physics parameters derived from configuration.
   * @param config Object defining mass, shape, and initial transform of the body.
   */
  constructor(config: RigidBodyConfig) {
    this.shape = config.shape;
    this.mass = config.mass;
    this.position = [config.position.x, config.position.y, config.position.z];
    this.velocity = [
      config.velocity?.x ?? 0,
      config.velocity?.y ?? 0,
      config.velocity?.z ?? 0,
    ];
    this.acceleration = [0, 0, 0];
    this.restitution = config.restitution ?? 0.8;
    this.damping = config.damping ?? 0.995;
    this.friction = config.friction ?? 0.5;
    this.radius = config.radius ?? 0.5;
    this.size = config.size
      ? [config.size.x, config.size.y, config.size.z]
      : undefined;

    // Static bodies ignore gravity (mass = 0)
    this.useGravity = config.mass > 0;

    this.orientation = quat.create();
    this.angularVelocity = [0, 0, 0];
    this.torque = [0, 0, 0];

    // Initialize inertia tensors based on shape
    this.inertiaTensor = this.computeInertiaTensor();
    this.inverseInertiaTensor = mat3.invert(mat3.create(), this.inertiaTensor)!;
  }

  /**
   * Applies a linear world‑space force to the body’s center of mass.
   * The resulting acceleration is integrated next frame.
   * @param force Force vector in Newtons.
   */
  applyForce(force: [number, number, number]) {
    this.force[0] += force[0];
    this.force[1] += force[1];
    this.force[2] += force[2];
  }

  /**
   * Applies a pure torque (rotational force) around the body’s center of mass.
   * @param t Torque vector in N·m (Newton‑meters).
   */
  applyTorque(t: vec3) {
    this.torque[0] += t[0];
    this.torque[1] += t[1];
    this.torque[2] += t[2];
  }

  /**
   * Creates a deep copy of this rigid body.
   * Useful for rollback or cloning scene objects.
   * @returns A new `RigidBody` instance with identical initial properties.
   */
  clone(): RigidBody {
    const clone = new RigidBody({
      shape: this.shape,
      mass: this.mass,
      position: {
        x: this.position[0],
        y: this.position[1],
        z: this.position[2],
      },
      velocity: {
        x: this.velocity[0],
        y: this.velocity[1],
        z: this.velocity[2],
      },
      restitution: this.restitution,
      damping: this.damping,
      friction: this.friction,
      radius: this.radius,
      size: this.size
        ? { x: this.size[0], y: this.size[1], z: this.size[2] }
        : undefined,
    });
    return clone;
  }

  /**
   * Applies an instantaneous force (impulse) at a world‑space point.
   * Produces both linear and angular motion depending on offset from center.
   * @param impulse Linear impulse vector in N·s.
   * @param point World‑space point at which impulse is applied.
   */
  applyImpulseAtPoint(impulse: vec3, point: vec3) {
    if (this.mass <= 0) return;

    // Linear impulse
    this.velocity[0] += impulse[0] / this.mass;
    this.velocity[1] += impulse[1] / this.mass;
    this.velocity[2] += impulse[2] / this.mass;

    // Angular impulse τ = r × J
    const r = vec3.sub(vec3.create(), point, this.position);
    const torque = vec3.cross(vec3.create(), r, impulse);
    vec3.add(this.torque, this.torque, torque);
  }

  /**
   * Computes the inertia tensor for the body’s mass distribution.
   * Uses analytical approximations for supported primitive shapes.
   * @returns The local‑space inertia tensor matrix.
   */
  private computeInertiaTensor(): mat3 {
    switch (this.shape) {
      case "sphere": {
        const I_s = (2 / 5) * this.mass * this.radius * this.radius;
        return mat3.fromValues(I_s, 0, 0, 0, I_s, 0, 0, 0, I_s);
      }

      case "box": {
        const [w, h, d] = this.size ?? [1, 1, 1];
        const Ixx = (1 / 12) * this.mass * (h * h + d * d);
        const Iyy = (1 / 12) * this.mass * (w * w + d * d);
        const Izz = (1 / 12) * this.mass * (w * w + h * h);
        return mat3.fromValues(Ixx, 0, 0, 0, Iyy, 0, 0, 0, Izz);
      }

      default:
        return mat3.identity(mat3.create());
    }
  }

  /**
   * Clears per‑frame force and torque accumulators.
   * Called automatically by the physics integrator each step.
   */
  clearAccumulators() {
    this.force = [0, 0, 0];
    this.torque = [0, 0, 0];
  }
}
