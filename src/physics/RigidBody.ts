
export default class RigidBody { 
  position: [number, number, number];
  velocity: [number, number, number];
  acceleration: [number, number, number];
  mass: number;
  useGravity: boolean;
  
  constructor(
    position: [number, number, number] = [0, 0, 0],
    mass = 1,
    useGravity = true,
  ) {
    this.position = position;
    this.velocity = [0, 0, 0];
    this.acceleration = [0, 0, 0];
    this.mass = mass;
    this.useGravity = useGravity;
  }
  
  /** apply a continues force linear force (F = m * a) */
  applyForce(force: [number, number, number]) {
    this.acceleration[0] += force[0] / this.mass;
    this.acceleration[1] += force[1] / this.mass;
    this.acceleration[2] += force[2] / this.mass;
  }
  
  clearForces() {
    this.acceleration = [0, 0, 0];
  }
}