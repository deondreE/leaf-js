/**
 * Loads an image and converts it into a bitmap ready to be used as a texture. 
 * @param path 
 * @returns 
 */
export const loadImgAsBitmap = (path: string): Promise<[bitmap:ImageData, size:[width:number, height:number, z:number]]> => {
	return new Promise((resolve, reject)=>{
		const img = new Image();
		img.onload = () => {
			const canvas = new OffscreenCanvas(img.width, img.height);
			const ctx = canvas.getContext('2d');
			if(!ctx) throw new Error("No context");
			ctx?.drawImage(img, 0, 0);
			resolve([ctx.getImageData(0, 0, img.width, img.height), [img.width, img.height, 1]]);
		};
		img.onerror = () => reject(new Error(`Failed to load image @: ${path}`));
		img.src = path;
	});
};