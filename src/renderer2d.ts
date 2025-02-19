import type { AsePair } from "./parsers/aseprite";
export type RedenderFrame = [duration: number, bitmap: ImageBitmap];
export default class Renderer2d {
	context: CanvasRenderingContext2D;
	frames: RedenderFrame[];
	size: AsePair;
	frame: number = 0;
	animationFrame: number = -1;
	animationDelay: number = -1;
	lastUpdate: number = 0;
	currentFrame: RedenderFrame;
	constructor(context: CanvasRenderingContext2D, frames: RedenderFrame[], size: AsePair){
		this.context = context;
		this.frames = frames;
		this.size = size;
		this.currentFrame = this.frames[0];
		this.render = this.render.bind(this);
		this.start();

	}

	render(time: number){
		this.animationFrame = requestAnimationFrame(this.render);
		const [duration, bitmap] = this.currentFrame;
		if(!this.lastUpdate) this.lastUpdate = time;
		if(this.lastUpdate && time-this.lastUpdate < duration) return;
		this.lastUpdate = time;
		this.currentFrame = this.frames[this.frame];
		this.frame = (this.frame+1)%this.frames.length;
		this.context.reset();
		//console.log(typeof bitmap, Array.isArray(bitmap), ArrayBuffer.isView(bitmap));
		this.context.drawImage(bitmap, 0, 0);
		
		//console.log(data);
		
		
		this.frame = (this.frame+1)%this.frames.length;
	}

	start(){
		this.animationFrame = requestAnimationFrame(this.render);
	}

	stop(){
		if(~this.animationDelay) clearTimeout(this.animationDelay);
		if(~this.animationFrame) cancelAnimationFrame(this.animationFrame);
		this.animationFrame = -1;
		this.animationDelay = -1;
	}
}