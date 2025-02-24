import Renderer2d from './renderer';
import { Scene2dConfiguration, Scene2dImageAssetDescription } from './types';
import WorkQueue from './workqueue';

/**
 * The scene doesnt really know about the renderer it is just resposible for organizing information and passing the information to the renderer.
 */
export default class Scene2d {
  canvas: HTMLCanvasElement;
  wkr: WorkQueue;
  renderer: Renderer2d;
  
  constructor(canvas: HTMLCanvasElement, config?: Scene2dConfiguration) {
    this.canvas = canvas;
    this.wkr = new WorkQueue(new URL('./pxlmagic.worker.ts', import.meta.url));
    
    this.render = this.render.bind(this);
    this.renderer = new Renderer2d(canvas, this.render);
  }

  async render(renderer: Renderer2d, delta: number):Promise<VoidFunction> {
    const v = await this.wkr.post<ImageBitmap>([0]);
    return () => {
      renderer.context.drawImage(v, 0, 0);
      v.close();
    }
  }


  /**
   * That actual loading of the image will occur in another context the descriptors provided will be used to describe how slices occur.
   * Assets are reserved to a scene for now however static files are cached per session to reduce calls. 
   * @param path 
   * @param options 
   */
  addImageAsset(path: string, options: Scene2dImageAssetDescription[]){
    
    //this.wkr.post([0, path, options]);
  }
}
