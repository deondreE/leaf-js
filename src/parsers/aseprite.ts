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