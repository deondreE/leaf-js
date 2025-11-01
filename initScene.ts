import type { SceneFactory } from './src/types/scene.types';

export const initScene: SceneFactory = () => ({
  name: 'Demo Scene',

  camera: {
    type: 'orthographic',
    FOV: 45,
    cameraBounds: 1.0,
    near: 0.1,
    far: 100.0,
    zoom: 1.0,
  },

  particle: {
    gravity: -0.0001,
    emitter: {
      startPos: { x: 0, y: 0, z: 0 },
      emissionRate: 10,
      overTimeEffects: {
        rotationOverTime: { x: 0, y: 0.2, z: 0 },
        velocityOverTime: { x: 0, y: 1, z: 0 },
        colorOverTime: {
          startColor: { r: 1, g: 1, b: 1, a: 1 },
          endColor: { r: 1, g: 0, b: 0, a: 1 },
        },
        sizeOverTime: {
          startSize: { w: 1, h: 1 },
          endSize: { w: 0.2, h: 0.2 },
          interperlationType: 'linear',
        },
      },
      shape: 'sphere',
    },
    particleCount: 5_000,
  },

  physics: {
    enabled: true,
    gravity: { x: 0, y: -9.81, z: 0 }, 
    rigidBodies: [
      {
        shape: 'sphere',
        mass: 1.0,
        position: { x: 0, y: 5, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        restitution: 0.8,
        damping: 0.99,
        radius: 1,
      },
      {
        shape: 'plane',
        mass: 0,
        position: { x: 0, y: 0, z: 0 },
      },
    ],
  },

  animations: {
    enabled: true,
    duration: 5.0,
    tracks: [
      {
        target: 'camera',
        property: 'position.z',
        keyframes: [
          { time: 0, value: 10 },
          { time: 2.5, value: 5 },
          { time: 5, value: 10 },
        ],
        loop: true,
      },
      {
        target: 'light',
        property: 'rotation.y',
        keyframes: [
          { time: 0, value: 0 },
          { time: 5, value: 6.28 },
        ],
        loop: true,
      },
    ],
  },
});

window.initScene = initScene;