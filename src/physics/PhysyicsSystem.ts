import RigidBody from './RigidBody';

export default class PhysicsSystem {
  bodies: RigidBody[] = [];
  gravity: [number, number, number] = [0, -9.81, 0];
  groundY = -4.0;
  restitution = 0.8; // bounce factor
  damping = 0.995; // velocity damping after bounce

  addBody(body: RigidBody) {
    this.bodies.push(body);
  }

  update(dt: number) {
    for (const body of this.bodies) {
      if (body.mass <= 0) continue;

      // Apply gravity
      if (body.useGravity) {
        body.acceleration[0] += this.gravity[0];
        body.acceleration[1] += this.gravity[1];
        body.acceleration[2] += this.gravity[2];
      }

      // Integrate velocity
      body.velocity[0] += body.acceleration[0] * dt;
      body.velocity[1] += body.acceleration[1] * dt;
      body.velocity[2] += body.acceleration[2] * dt;

      // Integrate position
      body.position[0] += body.velocity[0] * dt;
      body.position[1] += body.velocity[1] * dt;
      body.position[2] += body.velocity[2] * dt;

      if (body.position[1] - body.radius < this.groundY) {
        body.position[1] = this.groundY + body.radius;

        body.velocity[1] *= -this.restitution;

        body.velocity[0] *= this.damping;
        body.velocity[2] *= this.damping;
      }

      body.velocity[0] *= this.damping;
      body.velocity[1] *= this.damping;
      body.velocity[2] *= this.damping;

      body.acceleration = [0, 0, 0];
    }
  }
}
