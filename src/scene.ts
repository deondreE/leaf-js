import Renderer from './renderer';
import type { Model } from './types/scene.types';
import { assert } from './utils/util';

/** A Scene is defined as a collection of objects renderd in a single pass. */
class Scene {
  name: string | '' = '';
  children: Model[] = [];
  renderer: Renderer | null = null;

  constructor({ name }: Scene) {
    this.name = name;
  }

  /** Awake is called pre-start post init. */
  awake() {}

  /** Start is called after awake. */
  start() {
    assert(this.checkStatic() == true);
    // Make sure awake is called first.
    setTimeout(() => {
      this.awake();
    }, 1000);

    console.log('Loading current scene into the canvas context.');
    this.renderer = new Renderer({ models: this.children });
    this.renderer.init();

    this.renderer.render();
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
