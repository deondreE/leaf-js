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
export type Scene2dImageAssetDescription = Scene2dSlicedImageAssetDescription;
export type Scene2dSlicedImageAssetDescription = {
  slices: Pair;
  sprites: SpriteDescriptor[]
} & Partial<Rect>;

/**
 * Sprites will be used for animated and sprite assets. 
 */
export type SpriteDescriptor = {
  name: string;
  animations: SpriteAnimationDescriptor[];
};


export type SpriteAnimationDescriptor = {
  name: string;
  range: Pair;
  duration?: number | number[];
}



