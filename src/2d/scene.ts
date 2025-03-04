import Renderer from "./renderer"

export default class Scene {
	renderer: Renderer | undefined;

	constructor(canvas: HTMLCanvasElement){
		Renderer.init({canvas})
	}

	
}