import Renderer from "./renderer";

console.log("Loading leaf");
class Leaf extends HTMLCanvasElement {
	/**
		 * Here we can define properties we pay attention to
		 * 
		 * these are just examples for now
		 */
	static observedAttributes = ["type", "width", "height"];
	type: "2d" | "3d"
	renderer: Renderer
	constructor(){
		console.log("Starting");
		super();
	}
	connectedCallback(){
		console.log("Connected");
		this.id = "webgpu-canvas";
		if(!this.renderer) this.initRenderer();
		console.log("Time to initialize the canvas")
	}

	async initRenderer() {
		this.renderer = await Renderer.init({canvas: this});
		this.renderer.render();
	}

	disconectedCallback(){
		console.log("Time to deinitialize the canvas");
	}

	adoptedCallback(){
		console.log("Time to transfer context");
	}
	/**
	 * Anytime a value changed. Unfortunately the attributeChangedCallback doesnt know what the type is accepting as unknown allows for simple coercion. 
	 * 
	 * @param name 
	 * @param oldValue 
	 * @param newValue 
	 */
	attributeChangedCallback(name:string, oldValue: unknown, newValue: unknown){
		console.log(`The attribute ${name} changed from ${oldValue} to ${newValue}`);
	}
}

customElements.define('leaf-js', Leaf, {extends: "canvas"});