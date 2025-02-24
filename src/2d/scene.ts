import Renderer2d from './renderer';
import { Scene2dConfiguration } from './types';
import WorkQueue from './workqueue';

/**
 * The scene doesnt really know about the renderer it is just resposible for organizing information and passing the information to the renderer.
 */
export default class Scene2d {
  canvas: HTMLCanvasElement;
  wkr: WorkQueue;

  constructor(canvas: HTMLCanvasElement, config?: Scene2dConfiguration) {
    this.canvas = canvas;
    this.wkr = new WorkQueue(new URL('./pxlmagic.worker.ts', import.meta.url));
    this.render = this.render.bind(this);
    console.log("Loading Scene2d", config, this.wkr);
  }

  async render(renderer: Renderer2d, delta: number):Promise<VoidFunction> {
    const v = await this.wkr.post<ImageBitmap>([0]);
    return () => {
      renderer.context.drawImage(v, 0, 0);
      v.close();
    }
  }

  /*
  addImageAsset(path: string, options: AssetDescriptor[]){
    this.wkr.post([0, path, options]);
  }
  */
}
