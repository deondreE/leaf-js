/**
 * A sprite in the client context is a list of values representing the frames to be rendered.
 * 
 * The value order
 * 0. The assetIndex,
 * 1. The frameIndex,
 * 2. The destination x
 * 3. The destination y
 * 5. The destination height
 * 6. The destination width
 */
export default class Sprite extends Array<number>{
	constructor(assetIndex: number, frameIndex: number = 0){
		super();
	}
}