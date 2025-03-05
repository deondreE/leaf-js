import { loadImgData } from "./img-tools";
import Renderer from "./renderer";
import { Renderable } from "./types";

/**
 * Just a POF... think precursor to a Sprite class. 
 */
export default class ImageFrames implements Renderable {
	imgPromise: Promise<ImageData>; //When I go to sprite this should be disposed of when bind is called.
	tileSize: number;

	uvSize: [width:number, height: number] = [1,1];
	uv: [u: number, v: number] = [0,1];
	//bindGroup: GPUBindGroup;


	constructor(url: string, tileSize: number){
		this.imgPromise = loadImgData(url);
		this.tileSize = tileSize;
	}

	async register(renderer: Renderer): Promise<void>{
		//Later this can emit an event like an onMount when a sprite has been "registered" with the renderer.

		const img = await this.imgPromise;
		this.uvSize = [this.tileSize/img.width, this.tileSize/img.height];

		console.log(this.uvSize);
	}

	render(renderer: Renderer, delta: number): void {
		
	}
}