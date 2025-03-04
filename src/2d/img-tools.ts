/*
Moving all image manipulation to a separate file so it can just be imported to a worker when I make the switch.
*/

import { SceneAssetDescriptor } from "./types";


export const loadImg = (path: string): Promise<HTMLImageElement> => new Promise((resolve, reject)=>{
	const img = new Image();
	img.onload = () => resolve(img);
	img.onerror = () => reject(new Error("Image failed to load"));
	img.src = path;
});

export const toCanvas = (img: HTMLImageElement): [canvas: OffscreenCanvas, context: OffscreenCanvasRenderingContext2D] => {
	const canvas = new OffscreenCanvas(img.width, img.height);
	const context = canvas.getContext('2d');
	if(!context) throw new Error("No context");
	context.drawImage(img, 0, 0);
	return [canvas, context];
};

export const toImageData = (img: HTMLImageElement): ImageData => {
	const [, ctx] = toCanvas(img);
	return ctx.getImageData(0,0,img.width, img.height);
};

export const toBitmapData = (img: HTMLImageElement): [bitmap:ImageBitmap, size: [width: number, height: number]] => {
	const [canvas] = toCanvas(img);
	return [canvas.transferToImageBitmap(), [img.width, img.height]];
};
/**
 * Loads an image and converts it into a bitmap ready to be used as a texture. 
 * @param path 
 * @returns 
 */
export const loadImgData = (path: string): Promise<ImageData> => loadImg(path)
.then(toImageData);

export const loadImgAsBitmap = (path: string): Promise<[bitmap:ImageBitmap, size:[width:number, height:number]]> => loadImg(path)
.then(toBitmapData);


