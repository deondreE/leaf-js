import { loadAseprite } from "./parsers/aseprite";
import Renderer from "./renderer";



class Leaf extends HTMLCanvasElement {
	/**
		 * Here we can define properties we pay attention to
		 * 
		 * these are just examples for now
		 */
	static observedAttributes = ["src"];
	is3D: boolean = true;
	renderer: Renderer
	constructor(){
		
		super();
	}
	/**
	 * Just a convenience method to handle bool attributes
	 * @param attrName 
	 */
	private getBoolAttribute(attrName: string): boolean {
		const attr = this.getAttribute(attrName);
		return attr !== null && attr.toLowerCase() !== "false";
	}
	/**
	 * Always returns true unless prop is defined and is false
	 * @param attrName 
	 * @returns 
	 */
	private getOptimisticBoolAttribute(attrName): boolean {
		return this.getAttribute(attrName) !== "false"; 
	}

	/**
	 * Parser will be made more dynamic this is just to test the parser
	 */
	parseAseprite(){
		const src = this.getAttribute("src");
		loadAseprite(src);
	}
	connectedCallback(){
		this.is3D = this.getOptimisticBoolAttribute("is3D");
		//improvement opportunity 
		if(!this.hasAttribute("src")) return console.warn("leaf canvases rely on src attribute to populate");
		this.parseAseprite();
		if(!this.renderer) {
			queueMicrotask(async () => {
				this.renderer = await Renderer.init({canvas: this});
				this.renderer.render();
			});
		}
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