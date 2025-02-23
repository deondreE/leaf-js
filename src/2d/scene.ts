import Renderer2d from './renderer';

/**
 * The scene doesnt really know about the renderer it is just resposible for organizing information and passing the information to the renderer.
 */
export default class Scene2d {
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    console.log('Starting 2d scene');
  }

  render(renderer: Renderer2d, delta: number) {
    console.log('Time to render');
  }
}
