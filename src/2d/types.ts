import Renderer from "./renderer"
export type RenderOptions = {
	fps?:number;
	context?: CanvasRenderingContext2D;
	size?: Quad;
}
/**
 * Just a method that delegates draw operations. 
 */
export type RenderDrawFunction = (renderer: Renderer, delta: number) => void;
export type Pair<T = number> = [T, T];
export type Triplet<T = number> = [T,T,T];
export type Quad<T = number> = [T,T,T,T];