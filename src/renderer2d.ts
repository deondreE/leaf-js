class Renderer2d extends Promise<Renderer2d> {
	#resolve: (renderer: Renderer2d)=>void;
	#reject: (error: unknown)=>void;
	constructor(){
		super((resolve, reject)=>{
			this.#resolve = resolve;
			this.#reject = reject;
			this.#init();
		});
	}

	async #init(){

	}

}