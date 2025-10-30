import RigidBody from './RigidBody';

export default class PhysicsSystem {
  bodies: RigidBody[] = [];
  gravity: [number, number, number] = [0, -9.81, 0];

  addBody(body: RigidBody) {
    this.bodies.push(body);
  }

  update(dt: number) {
    for (const body of this.bodies) {
      if (body.useGravity) {
        body.acceleration[0] += this.gravity[0];
        body.acceleration[1] += this.gravity[1];
        body.acceleration[2] += this.gravity[2];
      }

      // integrate velocity
      body.velocity[0] += body.acceleration[0] * dt;
      body.velocity[1] += body.acceleration[1] * dt;
      body.velocity[2] += body.acceleration[2] * dt;

      // integrate position
      body.position[0] += body.velocity[0] * dt;
      body.position[1] += body.velocity[1] * dt;
      body.position[2] += body.velocity[2] * dt;

      // crude ground collision at Y=0
      if (body.position[1] < 0) {
        body.position[1] = 0;
        body.velocity[1] *= -0.4; // bounce with energy loss
      }

      body.clearForces();
    }
  }
}
