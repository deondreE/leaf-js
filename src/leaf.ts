import {loadAseprite} from "./parsers/aseprite";
import Renderer from "./renderer";
import Renderer2d from "./renderer2d";



class Leaf extends HTMLCanvasElement {
	/**
		 * Here we can define properties we pay attention to
		 * 
		 * these are just examples for now
		 */
	static observedAttributes = ["src"];
	is3D: boolean = true;
	renderer: Renderer | Renderer2d
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
	async parseAseprite(){
		const src = this.getAttribute("src");
		const aseprite = await loadAseprite(src);
		return aseprite;
	}

	async parsePsd(){
		const src = this.getAttribute("src");
		
	}
	connectedCallback(){
		this.is3D = this.getOptimisticBoolAttribute("is3D");
		//improvement opportunity 
		if(!this.hasAttribute("src")) return console.warn("leaf canvases rely on src attribute to populate");
		const src = this.getAttribute("src").toLowerCase();
		if(!this.renderer) {
			queueMicrotask(async () => {
				if (src.endsWith('.aseprite')) {
					this.parseAseprite()
					.then(aseprite => {
						this.renderer = new Renderer2d(this.getContext('2d'), aseprite.frames.map(f=>[f.duration, f.bitmap]), aseprite.size);
					});
				} else if (src.endsWith('.psd')) {

				} else {
					this.renderer = await Renderer.init({canvas: this});
					this.renderer.render();
				}
				
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