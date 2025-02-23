import Renderer from './renderer';
import type { Model } from './types/scene.types';

// NOTE: you can define a large pipeline, and there is a clean step that removes most of the unused garbage.

/** A Scene is defined as a collection of objects renderd in a single pass. */
class Scene {
  name: string | '' = '';
  children: Map<Model, string> = new Map<Model, string>();
  renderer: Renderer | null = null;

  constructor(name: string) {
    this.name = name;
  }

  /** Awake is called pre-start post init. */
  awake(f: () => {}) {
    // attach s
  }

  /** Start is called after awake. */
  start(f: () => void) {
    console.log('Loading current scene into the canvas context.');

    // user callback
    f();
  }

  /** Update is called everyframe based on deltatime.
   * @param dt is the time in between frames.
   */
  update(dt: number) {}

  /** Checks if the current context of the scene is static. */
  private checkStatic(): boolean {
    return true;
  }

  private export() {}
}

export default Scene;
