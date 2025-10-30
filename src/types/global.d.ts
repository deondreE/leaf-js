import type { SceneFactory } from './scene.types';

declare global {
  interface Window {
    initScene?: SceneFactory;
  }
}

export {};