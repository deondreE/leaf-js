import Renderer2d from "./renderer";
import Sprite from "./sprite";

export default class Scene2d {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	renderer: Renderer2d;
	sprites: Sprite[];
	_statics: Uint8Array;
	statics: ImageBitmap;

	constructor(canvas: HTMLCanvasElement){

	}
}