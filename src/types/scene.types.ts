/* ---------------------------------------------------------------------
 * Basic math helpers
 * ------------------------------------------------------------------- */

import { Mat4 } from "wgpu-matrix";
import RigidBody from "../physics/RigidBody";

/** 3D Vector Structure. */
export interface Vec3 {
  /** X-Axis */
  x: number;
  /** Y-Axis */
  y: number;
  /** Z-Axis */
  z: number;
}

/** A color / 4 channel vector. */
export interface Vec4 {
  /** Red (0-1) Range or 0-255 optioanlly */
  r: number;
  /** Green (0-1) Range or 0-255 optioanlly */
  g: number;
  /** Blue (0-1) Range or 0-255 optioanlly */
  b: number;
  /** Alpha (0-1) Range or 0-255 optioanlly */
  a: number;
}

/** Lighting configuration for a scene. */
export interface LightConfig {
  /** Light type: directional or point. (default: directional) */
  type?: "directional" | "point" | "spot";
  /** Direction the light rays travel toward (world-space). */
  direction?: Vec3;
  /** Position for point/spot lights. */
  position?: Vec3;
  /** RGB intensity multiplier (default: white [1,1,1]) */
  color?: Vec3;
  /** Falloff for point/spot types. */
  intensity?: number;
  /** Inner/Outer cone for spot lights (in radians). */
  cone?: { inner: number; outer: number };
}

/** Ambient/background render configuration. */
export interface RenderConfig {
  /** When true, WebGPU uses MSAA for smoother geometry. */
  antialias?: boolean;
  /** Scene background color [0-1]. */
  background?: [number, number, number];
  /** Optional exposure scalar. */
  exposure?: number;
}

/* ---------------------------------------------------------------------
 * Camera configuration
 * ------------------------------------------------------------------- */

/** Describes how a camera should be inialized for the scene. */
export interface CameraConfig {
  /** Perspective or Orthographic projection */
  type: "perspective" | "orthographic";
  /** Field of view in degrees (perspective only). */
  FOV?: number;
  /** Horizontal/vertical aspect or orthographic bounds. */
  cameraBounds?: number;
  /** Near clip distance. */
  near?: number;
  /** Far clip distance. */
  far?: number;
  /** Zoom multiplier. */
  zoom?: number;
  /** Explicit position of the camera. */
  position?: Vec3;
  /** Target point where the camera looks at. */
  lookAt?: Vec3;
}
/* ---------------------------------------------------------------------
 * Particle System
 * ------------------------------------------------------------------- */

/** Time-based variations for a particle's properties. */
export interface OverTimeEffects {
  /** Rotation `degrees/sec` applied every frame. */
  rotationOverTime: Vec3;
  /** velocity change over time. */
  velocityOverTime: Vec3;
  /** Color change over time. */
  colorOverTime: {
    startColor: Vec4;
    endColor: Vec4;
  };
  /** Size interpelation from start->finish values. */
  sizeOverTime: {
    startSize: { w: number; h: number };
    endSize: { w: number; h: number };
    interperlationType: "linear" | "noise";
  };
}

/** Supported emitter volume shapes. */
export type EmitterShape =
  | "default"
  | "cone"
  | "sphere"
  | "box"
  | "point"
  | "cylinder";

/** Configuration for a simple ParticleEmitter. */
export interface ParticleEmitter {
  /** Starting position in the `world-pos` for emitted particles  */
  startPos: Vec3;
  /** Emission rate - particles spawned per second. */
  emissionRate: number;
  /** Over-time transformations for rotation, velocity, color, and size. */
  overTimeEffects: OverTimeEffects;
  /** Geometric shape of the emitter volume. */
  shape: EmitterShape;
}

/** Top-Level config of the particle system. */
export interface ParticleConfig {
  /** Global gravity force applied to particle */
  gravity: number;
  /** Particle emitter definition. */
  emitter: ParticleEmitter;
  /** Total number of particles that can exist simultaneously */
  particleCount: number;
  /** When true, the system starts active. */
  enabled?: boolean;
}

/* ---------------------------------------------------------------------
 * Physics System
 * ------------------------------------------------------------------- */

/** Built-in RigidBody shapes recognized by the physics engine.
 * @todo Implement this
 */
export type PhysicsShape =
  | "none"
  | "sphere"
  | "box"
  | "capsule"
  | "plane"
  | "mesh";

/** Definition of an individual physics object. */
export interface RigidBodyConfig {
  /** Collider shape type. */
  shape: PhysicsShape;
  /** 0 -> Static object. (immovable) */
  mass: number;
  /** Initial `world-pos` */
  position: Vec3;
  /** init velocity (optional)   */
  velocity?: Vec3;
  /** Coefficient of restitution (0-1); higher = bouncier; */
  restitution?: number;
  /** Linear damping factor (air drag). */
  damping?: number;
  /** Surface friction Coefficient */
  friction?: number;
  /** Radius for sphere colliders. */
  radius?: number; // sphere
  /** Half-extends for box colliders.*/
  size?: Vec3; // box half-extents
}

export interface PhysicsConfig {
  enabled: boolean;
  gravity: Vec3;
  rigidBodies: RigidBodyConfig[];
}

/* ---------------------------------------------------------------------
 * Animation System
 * ------------------------------------------------------------------- */

/** A value at a particular time along an animation timeline. */
export interface Keyframe<T> {
  /** Time (seconds) since animation start. */
  time: number;
  /** Property value at this timestamp. */
  value: T;
}

/** A single animated property track. */
export interface AnimationTrack {
  /** Which scene entity this track affects (e.g., "camera", "light", "mesh1"). */
  target: string;
  /** Property path; e.g. position.x or rotation.y. */
  property: string;
  keyframes: Keyframe<number>[];
  loop?: boolean;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "elastic" | "bounce";
}

/** High-level animation control block. */
export interface AnimationConfig {
  /** Enables or disables animations globally. */
  enabled: boolean;
  /** Total playback duration, in seconds. */
  duration: number;
  /** Collection of animation tracks. */
  tracks: AnimationTrack[];
}

export interface ObjectTexture {
  /** Standard color map. */
  albedo?: string;
  /** Normal map file path. */
  normal?: string;
  /** Optional metallic/roughness/combined map. */
  material?: string;
}

export type RandomAnimationType = "rotation" | "bounce" | "collide";

export interface SceneObject {
  name?: string;
  shape:
    | "sphere"
    | "box"
    | "plane"
    | "capsule"
    | "torus"
    | "rope"
    | "cone"
    | "quad";
  width?: number;
  height?: number;
  depth?: number;
  startPos?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  color?: Vec4;
  random_spawn_pos?: boolean;
  random_animation?: { type: RandomAnimationType };
  textures?: ObjectTexture;
  color_random?: boolean;
  amount?: number;
  /** Continuous rotation or animation on this object. */
  spin?: { axis?: Vec3; speed?: number } | boolean;
}

/**
 * The complete configuration returned by a SceneFactory.
 * Used to construct Camera, Physics, Particles, Animation systems, etc.
 */
export interface SceneConfig {
  /** Human‑friendly scene name. */
  name?: string;
  /** Camera setup. */
  camera?: CameraConfig;
  /** Lighting setup (optional). */
  lighting?: {
    ambient?: number;
    lights?: LightConfig[];
  };
  /** Global Renderer/RenderPass config (background color, MSAA, etc.). */
  render?: RenderConfig;
  /** Optional particle system. */
  particle?: ParticleConfig;
  /** Optional physics world. */
  physics?: PhysicsConfig;
  /** Optional animations. */
  animations?: AnimationConfig;
  /** Scene objects. */
  objects?: SceneObject[];
}

/**
 * A factory function that returns a SceneConfig.
 * It’s what developers define in initScene.ts; e.g. window.initScene = initScene.
 */
export type SceneFactory = () => SceneConfig;
/* ---------------------------------------------------------------------
 * Model type used inside your renderer (unchanged)
 * ------------------------------------------------------------------- */
/** GPU resource wrapper representing a renderable model. */
export interface Model {
  /** Unique ID (UUID). */
  id: string;
  /** Logical model name. */
  name: string;
  /** Whether this model is static (won’t move or animate). */
  static: boolean;
  body: RigidBody;
  /** GPU buffer for vertex data. */
  vertexBuffer: GPUBuffer;
  /** GPU buffer for index data. */
  indexBuffer: GPUBuffer;
  /** Identifier of the shader currently bound to this model. */
  shader: string;
  modelMatrix: Mat4;
}

export type GeometryBuffers = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
};
