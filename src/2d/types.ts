import Renderer from "./renderer"
/**
 * Just a method that delegates draw operations. 
 */

/**
 * This is just to allow tuple length from 1-4;
 */
export type Single<T = number> = [T];
export type Pair<T = number> = [T, T];
export type Triplet<T = number> = [T,T,T];

export type Quad<T = number> = [T,T,T,T];

export type RenderOptions = {
	fps?:number;
	context?: CanvasRenderingContext2D;
	size?: Quad;
};

export type Scene2dConfiguration = {
  assets: [path: string, Scene2dImageAssetDescription[]];
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Scene2dImageAssetDescription = {
  slices: Pair;
} & Partial<Rect>;
/**
 * Sprites will be used for animated and sprite assets. 
 */
export type SpriteDescriptor = {
  animations: Record<string, Pair >; //if 3 values are provided the 3rd value will be used to describe a custom animation time.
};

export type SpriteAnimationDescriptor = {
  range: Pair;
  //The duration by default is 32ms per frame but may be changed by providing either a different value or an array specifying durations of each frame specifically. 
  duration?: number | number[];
};



