import { LfPair } from "./parsers/types";

export type RedenderFrame = [duration: number, bitmap: ImageBitmap];
export default class Renderer2d {
	context: CanvasRenderingContext2D;
	frames: RedenderFrame[];
	size: LfPair;
	frame: number = 0;
	animationFrame: number = -1;
	lastUpdate: number = 0;
	currentFrame: RedenderFrame;
	constructor(context: CanvasRenderingContext2D, frames: RedenderFrame[], size: LfPair){
		this.context = context;
		this.frames = frames;
		this.size = size;
		this.currentFrame = this.frames[0];
		this.render = this.render.bind(this);
		this.start();

	}

	render(time: number){
		if(this.frames.length > 1) this.animationFrame = requestAnimationFrame(this.render);
		const [duration, bitmap] = this.currentFrame;
		if(!this.lastUpdate) this.lastUpdate = time;
		if(this.lastUpdate && time-this.lastUpdate < duration) return;
		this.lastUpdate = time;
		this.currentFrame = this.frames[this.frame];
		this.frame = (this.frame+1)%this.frames.length;
		this.context.reset();
		//this.context.clearRect(0, 0, ...this.size);
		//console.log(typeof bitmap, Array.isArray(bitmap), ArrayBuffer.isView(bitmap));
		//console.log(bitmap);
		//this.context.save();
		//this.context.beginPath();
		
		//this.context.rect(0, 0, ...this.size);
		//this.context.clip();
		//this.context.clearRect(0,0, ...this.size);
		this.context.drawImage(bitmap, 0, 0);
		//this.context.restore();
		
		//console.log(data);
		
		
		this.frame = (this.frame+1)%this.frames.length;
	}

	start(){
		this.animationFrame = requestAnimationFrame(this.render);
	}

	stop(){
		if(~this.animationFrame) cancelAnimationFrame(this.animationFrame);
		this.animationFrame = -1;
	}
}