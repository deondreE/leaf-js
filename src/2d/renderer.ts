import { assert } from "../utils/util";
import { Quad, RenderOptions } from "./types";

export type RenderDrawFunction = (renderer: Renderer, delta: number) => Promise<VoidFunction>;
/**
 * In 2d all this really does is clear the rect and redraw at a desired fps if possible.
 */
export default class Renderer {
	context: CanvasRenderingContext2D;
	rect: Quad;
	animationFrame: number = 0;
	fps: number;
	lastFrame: number = 0;
	draw: RenderDrawFunction
	
	constructor(canvas: HTMLCanvasElement, draw: RenderDrawFunction, {context, size, fps=64}:RenderOptions = {}){
		this.context = context ?? canvas.getContext('2d')!;
		assert(this.context != null, "Rendering context unavailable");
		this.draw = draw;
		this.fps = 1e3/fps;
		if(!size){
			const bounding = canvas.getBoundingClientRect()
			this.rect = [bounding.left, bounding.top, bounding.width, bounding.height];
		} else {
			this.rect = size;
		}
		this.render = this.render.bind(this);
	}

	async render(time: number) {
		this.animationFrame = requestAnimationFrame(this.render);
		const delta = time-this.lastFrame;
		if(delta < this.fps) return;
		this.lastFrame = time;
		const dr = await this.draw(this, delta);
		this.context.clearRect(...this.rect);
		dr();
	}

	start(){
		if(this.animationFrame) return;
		//this.animationFrame = requestAnimationFrame(this.render);
	}

	stop(){
		if(!this.animationFrame) return;
		cancelAnimationFrame(this.animationFrame);
		this.animationFrame = 0;
	}
}