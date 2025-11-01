import { Vec3, PhysicsShape, RigidBodyConfig } from '../types/scene.types';

export default class RigidBody {
  shape: PhysicsShape;
  mass: number;
  position: [number, number, number];
  velocity: [number, number, number];
  acceleration: [number, number, number];
  restitution: number;
  damping: number;
  friction: number;
  radius: number;
  size?: [number, number, number];
  useGravity: boolean;

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
    this.useGravity = config.mass > 0; // static objects won’t use gravity
  }
}