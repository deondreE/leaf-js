import RigidBody from './RigidBody';
import { PhysicsShape } from './types';

/**
 * Simple physics integrator handling gravity, ground contact, and damping.
 * Extensible for various collider shapes (sphere, box, capsule, etc.)
 */
export default class PhysicsSystem {
  /** All rigid bodies in the simulation. */
  bodies: RigidBody[] = [];

  /** Global gravity vector. */
  gravity: [number, number, number] = [0, -9.81, 0];

  /** Simple flat-ground at Y coordinate. */
  groundY = -4.0;

  /** Default bounce factor when colliding with ground. */
  restitution = 0.8;

  /** Default linear damping for velocity loss over time. */
  damping = 0.995;

  /** Add a rigid body to this physics world. */
  addBody(body: RigidBody) {
    this.bodies.push(body);
  }

  /** Integrates all bodies in the scene over a fixed time delta (dt). */
  update(dt: number) {
    for (const body of this.bodies) {
      // Skip static bodies (mass ≤ 0)
      if (body.mass <= 0) continue;

      // --- Gravity ------------------------------------------------------
      if (body.useGravity) {
        body.acceleration[0] += this.gravity[0];
        body.acceleration[1] += this.gravity[1];
        body.acceleration[2] += this.gravity[2];
      }

      // --- Integrate Velocity ------------------------------------------
      body.velocity[0] += body.acceleration[0] * dt;
      body.velocity[1] += body.acceleration[1] * dt;
      body.velocity[2] += body.acceleration[2] * dt;

      // --- Integrate Position ------------------------------------------
      body.position[0] += body.velocity[0] * dt;
      body.position[1] += body.velocity[1] * dt;
      body.position[2] += body.velocity[2] * dt;

      // --- Collisions ---------------------------------------------------
      this.handleGroundCollision(body);

      // --- Apply Global Damping ----------------------------------------
      body.velocity[0] *= this.damping;
      body.velocity[1] *= this.damping;
      body.velocity[2] *= this.damping;

      // Reset acceleration for the next frame
      body.acceleration = [0, 0, 0];
    }
  }

  /**
   * Check and resolve collisions against the simple flat ground plane.
   * Shape-specific resolution logic is applied.
   */
  private handleGroundCollision(body: RigidBody) {
    switch (body.shape as PhysicsShape) {
      case 'sphere': {
        const radius = body.radius;
        const bottomY = body.position[1] - radius;

        if (bottomY < this.groundY) {
          body.position[1] = this.groundY + radius;
          body.velocity[1] *= -body.restitution;
          body.velocity[0] *= body.damping;
          body.velocity[2] *= body.damping;
        }
        break;
      }

      case 'box': {
        if (!body.size) break;
        const halfHeight = body.size[1];
        const bottomY = body.position[1] - halfHeight;

        if (bottomY < this.groundY) {
          body.position[1] = this.groundY + halfHeight;
          body.velocity[1] *= -body.restitution;
          body.velocity[0] *= body.damping;
          body.velocity[2] *= body.damping;
        }
        break;
      }

      case 'capsule':
      case 'plane':
      case 'mesh':
      case 'none':
      default:
        // Other shapes can be implemented later.
        break;
    }
  }
}