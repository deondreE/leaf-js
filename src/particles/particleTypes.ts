export interface ParticleConfig {
  particleCount?: number;
  emissionRate?: number;
  emissionArea?: { width: number; height: number };
  initialVelocityDirection?: { x: number; y: number };
  initialVelocityMagnitude?: number;
  particleLifespan?: number;
  gravity?: number;
  simulation?: boolean;
}

export interface ParticleUniform {
  time: number;
}