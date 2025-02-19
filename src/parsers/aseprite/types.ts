export type ReaderFunc<T = number> = (s?:number)=>T
export type AsePair<T = number> = [T, T];
export type AseTriplet<T = number> = [T, T, T];
export type AseQuad<T = number> = [T, T, T, T];

export type AseHeader = {
	fileSize: number;
	frames: number;
	size: AsePair;
	colorDepth: number;
	flags: number;
	speed: number;
	paletteEntry: number;
	colorCount: number;
	pixelSize: AsePair;
	location: AsePair;
	gridSize: AsePair;
}

export type AseFrame = {
	
}