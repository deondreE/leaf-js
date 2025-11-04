import RigidBody from "./RigidBody";
import { PhysicsShape } from "../types/scene.types";
import { mat3, quat, vec3 } from "gl-matrix";

/**
 * PhysicsSystem
 * -------------------------------
 * A simple yet extensible 3D physics integrator that supports:
 *  - Linear motion (forces, damping, ground collisions)
 *  - Angular motion (torque, inertia tensor, and spin)
 *  - Basic restitution and friction
 *
 * Serves as a foundation for real-time WebGPU-based visual simulations.
 */
export default class PhysicsSystem {
  /** All active rigid bodies in the simulation world. */
  bodies: RigidBody[] = [];

  /** Global gravitational acceleration vector (m/s²). */
  gravity: [number, number, number] = [0, -9.81, 0];

  /** Y-coordinate of ground-plane collision surface. */
  groundY = -4;
  /** Default restitution (bounciness) when collisions occur. */
  restitution = 0.8;

  /** Linear damping factor applied each simulation step (0–1). */
  linearDamping = 0.995;

  /** Angular damping applied for rotational velocity (0–1). */
  angularDamping = 0.995;

  /** Number of fixed substeps per frame; improves stability. */
  substeps = 4;

  /** Coefficient of ground friction applied on collisions. */
  friction = 0.4;

  /**
   * Adds a new rigid body to the simulation.
   * @param body The RigidBody instance to include in the physics world.
   */
  addBody(body: RigidBody) {
    this.bodies.push(body);
  }

  /**
   * Advances the entire simulation forward in fixed substeps.
   * @param dt Delta time in seconds.
   */
  simulate(dt: number) {
    const step = dt / this.substeps;
    for (let i = 0; i < this.substeps; ++i) this.integrate(step);
  }

  /**
   * Updates all physics bodies over a single frame using both
   * linear and rotational dynamics.
   * @param dt Time delta (seconds since last update).
   */
  update(dt: number) {
    for (const body of this.bodies) {
      if (body.mass <= 0) continue;

      // --- LINEAR FORCES -------------------------------------------------
      if (body.useGravity) {
        body.applyForce([
          this.gravity[0] * body.mass,
          this.gravity[1] * body.mass,
          this.gravity[2] * body.mass,
        ]);
      }

      // Compute acceleration (a = F/m)
      const accel = vec3.scale(vec3.create(), body.force, 1 / body.mass);

      // Integrate velocity and position
      vec3.add(
        body.velocity,
        body.velocity,
        vec3.scale(vec3.create(), accel, dt),
      );
      vec3.add(
        body.position,
        body.position,
        vec3.scale(vec3.create(), body.velocity, dt),
      );

      // --- ANGULAR FORCES ------------------------------------------------
      // Compute angular acceleration (α = I⁻¹ * τ)
      const angularAcc = vec3.transformMat3(
        vec3.create(),
        body.torque,
        body.inverseInertiaTensor,
      );
      vec3.add(
        body.angularVelocity,
        body.angularVelocity,
        vec3.scale(vec3.create(), angularAcc, dt),
      );

      // Integrate orientation: dq/dt = 0.5 * ω * q
      const qDot = quat.create();
      quat.mul(
        qDot,
        quat.fromValues(
          body.angularVelocity[0],
          body.angularVelocity[1],
          body.angularVelocity[2],
          0,
        ),
        body.orientation,
      );
      quat.scale(qDot, qDot, 0.5 * dt);
      quat.add(body.orientation, body.orientation, qDot);
      quat.normalize(body.orientation, body.orientation);

      // --- COLLISION RESOLUTION ------------------------------------------
      this.handleGroundCollision(body);

      // --- DAMPING -------------------------------------------------------
      vec3.scale(body.velocity, body.velocity, this.linearDamping);
      vec3.scale(
        body.angularVelocity,
        body.angularVelocity,
        this.angularDamping,
      );

      // --- CLEANUP -------------------------------------------------------
      body.clearAccumulators();
    }
  }

  /**
   * Alternative integration function (legacy) that supports linear motion only.
   * Substeps are processed by {@link simulate()} for extra stability.
   * @param dt Fixed time step duration in seconds.
   */
  private integrate(dt: number) {
    for (const body of this.bodies) {
      if (body.mass <= 0) continue;

      // --- Apply gravity as force if applicable ---
      if (body.useGravity) {
        body.applyForce([
          this.gravity[0] * body.mass,
          this.gravity[1] * body.mass,
          this.gravity[2] * body.mass,
        ]);
      }

      // --- Integrate velocity ---
      body.velocity[0] += (body.force[0] / body.mass) * dt;
      body.velocity[1] += (body.force[1] / body.mass) * dt;
      body.velocity[2] += (body.force[2] / body.mass) * dt;

      // --- Integrate position ---
      body.position[0] += body.velocity[0] * dt;
      body.position[1] += body.velocity[1] * dt;
      body.position[2] += body.velocity[2] * dt;

      // --- Collision detection and resolution ---
      this.resolveGroundCollision(body);

      // --- Apply damping ---
      const damping = Math.pow(this.linearDamping, dt * 60);
      body.velocity[0] *= damping;
      body.velocity[1] *= damping;
      body.velocity[2] *= damping;

      // Reset accumulated forces
      body.force = [0, 0, 0];
    }
  }

  /**
   * Resolves collisions of bodies with the ground plane
   * (legacy helper used by the older integrator).
   * @param body Rigid body to test for contact.
   */
  private resolveGroundCollision(body: RigidBody) {
    switch (body.shape as PhysicsShape) {
      case "sphere": {
        const r = body.radius;
        const bottom = body.position[1] - r;

        if (bottom < this.groundY) {
          // Reposition to rest on the ground.
          body.position[1] = this.groundY + r;

          // Reflect velocity using restitution.
          if (body.velocity[1] < 0) {
            const rest = body.restitution ?? this.restitution;
            body.velocity[1] *= -rest;
          }

          // Apply tangential friction.
          const frictionFactor = 1 - this.friction;
          body.velocity[0] *= frictionFactor;
          body.velocity[2] *= frictionFactor;
        }
        break;
      }

      case "box": {
        if (!body.size) return;
        const halfHeight = body.size[1];
        const bottom = body.position[1] - halfHeight;

        if (bottom < this.groundY) {
          body.position[1] = this.groundY + halfHeight;

          if (body.velocity[1] < 0) {
            const rest = body.restitution ?? this.restitution;
            body.velocity[1] *= -rest;
          }

          const frictionFactor = 1 - this.friction;
          body.velocity[0] *= frictionFactor;
          body.velocity[2] *= frictionFactor;
        }
        break;
      }

      default:
        // Extend this with additional collider types if needed.
        break;
    }
  }

  /**
   * Checks against the ground plane and resolves position, velocity,
   * and angular damping to prevent interpenetration.
   * @param body Target rigid body for collision response.
   */
  private handleGroundCollision(body: RigidBody) {
    switch (body.shape as PhysicsShape) {
      case "sphere": {
        const r = body.radius;
        const bottom = body.position[1] - r;
        if (bottom < this.groundY) {
          // Snap sphere to ground.
          body.position[1] = this.groundY + r;

          // Reverse upward momentum.
          if (body.velocity[1] < 0)
            body.velocity[1] *= -(body.restitution ?? this.restitution);

          // Apply energy loss via damping and tangential friction.
          vec3.scale(body.velocity, body.velocity, body.damping);
          vec3.scale(body.angularVelocity, body.angularVelocity, body.damping);
        }
        break;
      }

      case "box": {
        const h = body.size?.[1] ?? 0.5;
        const bottom = body.position[1] - h;
        if (bottom < this.groundY) {
          body.position[1] = this.groundY + h;
          if (body.velocity[1] < 0)
            body.velocity[1] *= -(body.restitution ?? this.restitution);
          vec3.scale(body.velocity, body.velocity, body.damping);
          vec3.scale(body.angularVelocity, body.angularVelocity, body.damping);
        }
        break;
      }

      default:
        // Other shapes (capsule, mesh, etc.) can be implemented later.
        break;
    }
  }
}
