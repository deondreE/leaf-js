import Renderer2d from "./renderer";
import Sprite from "./sprite";

export default class Scene2d {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	renderer: Renderer2d;
	sprites: Sprite[];

	constructor(canvas: HTMLCanvasElement){
		this.canvas = canvas;
		this.context = canvas.getContext('2d');
		this.renderer = new Renderer2d(canvas, (rndr, time)=>{
			
		},{context: this.context})
	}

}