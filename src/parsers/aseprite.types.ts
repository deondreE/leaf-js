export interface Aseprite {
  header: AseHeader;
}
/*
  Parsing ASE. 
  
  Like many parsers the issue to arise becomes size. an ASEprite document may have large amounts of data to load. 
  
  With a limited data pool and the requirement of the document being completely parsed it needs to be 
  */
export interface AseHeader {
  fileSize: number; //dword
  magic: number; //word
  frames: number; //word
  size: AsePair; //word pair
  colorDepth: number; // 8 | 16 | 32 (word)
  flags: number; //dword
  speed: number;
  paletteEntry: number; //this is a byte
  //read past the next 3 bytes
  colorCount: number; //word 0===256 in old sprites...?
  pixelSize: AsePair; //byte pair
  location: AsePair; //short pair
  gridSize: AsePair; //word pair
  //read the next 84 bytes
}

export type AseFrame = {
	duration: number; //word
	chunks: AseChunk[];
}

export type AseChunk = AseLegacyPalette | AseColorProfile | AseICCProfile | AsePath | AseColorPalette | AseTags | AseUserData;

export type AseChunkType = AseChunk['chunkType'];

export type AseLegacyPalette = {
	chunkType: 0x0004 | 0x0011;
	colors: AseTriplet[];
}
export type AseLayerFlags = 1 | 2 | 4 | 8 | 16 | 32 | 64;
export type AseLayerType = 0 | 1 | 2;
export enum AseLayerBlendMode {
	normal = 0,
	multiply = 1,
	screen = 2,
	overlay = 3,
	darken = 4,
	lighten = 5,
	colorDodge = 6,
	colorBurn = 7,
	hardLight = 8,
	softLight = 9,
	difference = 10,
	exclusion = 11,
	hue = 12,
	saturation = 13,
	color = 14,
	lumnosity = 15,
	addition = 16,
	subtract = 17,
	divide = 18
}
export type AseLayer = {
	chunkType: 0x2004;
	flags: AseLayerFlags;
	layerType: AseLayerType;
	layerChildLevel: number;
	layerSize: AsePair;
	blendMode: AseLayerBlendMode;
	alpha: number;
	name: string;
	tileIndex: number;
}
export type AsePath = {
	chunkType: 0x2017
}

export type AseColorProfileBase = {
	chunkType: 0x2007;
	gamma: number; //fixed (the flag will be unecessary for now it will be skipped)
}

export type AseColorProfile = {
	profileType: 0 | 1; //no profile and sRGB will be treated the same
} & AseColorProfileBase;

export type AseICCProfile = {
	profileType: 2;
	icc: Uint8Array;
} & AseColorProfileBase;

export type AseColorPaletteEntry = {
	color: AseQuad;
	name?: string
}
export type AseColorPalette = {
	chunkType: 0x2019;
	firstIndex: number;
	lastIndex: number;
	colors: AseColorPaletteEntry[];
}
export enum AseLoopDirection {
	forward = 0,
	reverse = 1,
	pingPong = 2,
	pingPongReverse = 3
}
export type AseTag = {
	range: AsePair;
	direction: AseLoopDirection;
	repeat: number;
	tagColor: AseTriplet;
	tagName: string
}

export type AseTags = {
	chunkType: 0x2018;
	tags: AseTag[]
}

export type AsePropertyTypers = 0x0001 | 0x0002 | 0x0003 | 0x0004 | 0x0005 | 0x0006 | 0x0008 | 0x0009 | 0x000A | 0x000B | 0x000C | 0x000D | 0x000E | 0x000F | 0x0010 | 0x0011 | 0x0012 | 0x0013;

export type AsePropertyTypes = boolean | number | string | bigint | AsePair | AseQuad | AsePropertyArray | AsePropertyMap
export type AsePropType<T extends AsePropertyTypers | 0x0 = 0> = T extends 0x0001 ? boolean
: T extends 0x0002 | 0x0003 | 0x0004 | 0x0005 | 0x0006 | 0x0007 | 0x000A | 0x000B ? number
: T extends 0x0008 | 0x0009 | 0x000C ? bigint
: T extends 0x000D | 0x0013 ? string
: T extends 0x000E | 0x000F ? AsePair
: T extends 0x0010 ? AseQuad
: T extends 0x0011 ? AsePropertyArray
: T extends 0x0012 ? AsePropertyMap
: AsePropertyTypes;

export interface AsePropertyArray extends Array<AsePropertyTypes> {};
export interface AsePropertyMap {
	[key: string]: AsePropertyTypes
}
export type AseUserData = {
	chunkType: 0x2020;
	text?: string,
	color?: AseQuad,
	properties?: AsePropertyMap
}
export type AsePair = [number, number];
export type AseTriplet = [number, number, number];
export type AseQuad = [number, number, number, number];
