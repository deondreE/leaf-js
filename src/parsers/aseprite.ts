export interface AseHeader {
  size: number; //dword
  magic: number; //word
  frames: number; //word
  width: number; //word
  height: number; //word
  colorDepth: number; // 8 | 16 | 32 (word)
  flags: number; //dword
  //read past speed (word)
  //read past the next dword *2
  paletteEntry: number; //this is a byte
  //read past the next 3 bytes
  pixelWidth: number; //byte
  pixelHeight: number; //byte
  x: number //short
  y: number //short
  gridCell: number // word (described as grid with but each cell is square so this represents the size of a cell)
  //read the next 84 bytes
}

export interface AseFrame{
	size: number; //dword (number of bytes in the frame)
	magic: number; //word should always be 0xF1FA
	chunksOld: number; //word (represents the number of chunks in the frame if overflow there are more chunks in the frame that cant be described in this field and should use new field. 0xFFFF is max).
	duration:number; //word (in ms)
	//skip next byte[2]
	chunksNew: number; //dword (if 0 check old field)
}

export interface AseFrameChunk {
	size: number; //dword
	type: number; //todo map to enum
}

export enum AseChunkType {
	oldPalette1 = 0x0004, //should only be used if newPalette does not also exist.
	oldPalette2 = 0x0011, //ignore if newPallet exists
	layer = 0x2004,
	cel = 0x2005,
	celExtra = 0x2006,
	colorProfile = 0x2007,
	external = 0x2008,
	mask = 0x2016, //deprecated
	pth = 0x2017, //never used
	tags = 0x2018,
	palette = 0x2019, //newPalette
	userData = 0x2020, //data to be appended 
	slice = 0x2022, //slice frame
	tileset = 0x2023, //tileset chunk
	
}