import { assert } from "../utils";
import { AseChunkType, AseColorProfile, AseFrame, AseFrameChunk, AseHeader } from "./aseprite.types";


export class Aseprite {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }
}

class AsepriteView {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;
  private constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  readByte(skip: number = 0): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1 + skip;
    return value;
  }

  readWord(skip: number = 0): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2 + skip;
    return value;
  }

  readShort(skip: number = 0): number {
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2 + skip;
    return value;
  }

  readDword(skip: number = 0): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4 + skip;
    return value;
  }

  readString(skip: number = 0): string {
    const length = this.readWord();
    const bytes = new Uint8Array(this.buffer.slice(this.offset, this.offset + length));
    this.offset += length + skip;
    return new TextDecoder().decode(bytes);
  }
  readFixed(skip: number = 0){
	const raw = this.view.getInt32(this.offset, true);
	this.offset += 4 + skip;
	return raw / 65536;
  }
  readColorProfile(len){
	const profile: AseColorProfile = {
		profileType: this.readWord(),
		profileFlags: this.readWord(),
		gamma: this.readFixed(),
	}
	this.offset += len - 14
	console.log(profile, this.offset);
	return profile
  }
  readICCProfile(){
	//https://www.color.org/ICC1V42.pdf
	throw new Error("ICC profiles not yet supported");
  }
  readChunk(): AseFrameChunk<{}>{
	const chunkHeader: AseFrameChunk<{}> = {
		size: this.readDword(),
		type: this.readWord(),
	}
	switch(chunkHeader.type){
		case AseChunkType.oldPalette1:
			console.log("Old palette 1");
			break;
		case AseChunkType.oldPalette2:
			console.log("Old palette 2");
			break;
		case AseChunkType.layer:
			console.log("layer");
			break;
		case AseChunkType.cel:
			console.log("cell");
			break;
		case AseChunkType.celExtra:
			console.log("cel extra");
			break;
		case AseChunkType.colorProfile:
			console.log("Color profile", chunkHeader);
			return {...chunkHeader, ...this.readColorProfile(chunkHeader.size)};
			break;
		case AseChunkType.external:
			console.log("Externals");
			break;
		case AseChunkType.mask:
			console.log("Mask");
			break;
		case AseChunkType.pth:
			console.log("Path");
			break;
		case AseChunkType.tags:
			console.log("Tags");
			break;
		case AseChunkType.palette:
			console.log("Palette");
			break;
		case AseChunkType.userData:
			console.log("User data");
			break;
		case AseChunkType.slice:
			console.log("Slice");
			break;
		case AseChunkType.tileset:
			console.log("Tileset");
			break;
	}
	this.offset += chunkHeader.size-6;
	//if it made it here the offset is wrong
	console.log("Got chunk", chunkHeader);
	return chunkHeader;
  }

  readChunks(len: number) {
	console.log("Reading chunks", len);
	while (len > 0){
		const chunk = this.readChunk();
		console.log("Got chunk", chunk);
		len -= chunk.size;
	}
	this.readChunk();

  }
  
  
  readFrames(len: number){
	this.readFrame();
  }

  readFrame() {
	const frame: AseFrame = {
		size: this.readDword(),
		magic: this.readWord(2),
		//chunksOld: this.readWord(),
		duration: this.readWord(2),
		chunkSize: this.readDword(),
		chunks: []
	}
	this.readChunks(frame.size);
	assert(frame.magic === 0xF1FA, "Magic mismatch")
	console.log("Frame", frame);
  }

  readHeader(): AseHeader {
	const header: AseHeader = {
		size: this.readDword(),
		magic: this.readWord(),
		frames: this.readWord(),
		width: this.readWord(),
		height: this.readWord(),
		colorDepth: this.readWord(),
		flags: this.readDword(),
		speed: this.readWord(8),
		paletteEntry: this.readByte(3),
		colorCount: this.readWord(),
		pixelWidth: this.readByte(),
		pixelHeight: this.readByte(),
		x: this.readShort(),
		y: this.readShort(),
		gridWidth: this.readWord(),
		gridHeight: this.readWord(84),
	  };
	  assert(header.magic === 0xA5E0, "Are you sure this is an aseprite file");
	  return header;
  }
  

  static parse(buffer: ArrayBuffer) {
    const v = new AsepriteView(buffer);
    const header: AseHeader = {
      size: v.readDword(),
      magic: v.readWord(),
      frames: v.readWord(),
      width: v.readWord(),
      height: v.readWord(),
      colorDepth: v.readWord(),
      flags: v.readDword(),
      speed: v.readWord(8),
      paletteEntry: v.readByte(3),
	  colorCount: v.readWord(),
      pixelWidth: v.readByte(),
      pixelHeight: v.readByte(),
      x: v.readShort(),
      y: v.readShort(),
      gridWidth: v.readWord(),
	  gridHeight: v.readWord(84),
    };
	//assert(header.magic === 0xA5E0, `Header magic mismatch ${header.magic} ${0xA5E0}`);
	console.log(header, v.offset);
	v.readFrame();
	console.log(header, v.offset);
    
  }
}

export const loadAseprite = (url: string) => {
  return fetch(url)
    .then((r) => r.arrayBuffer())
    .then(AsepriteView.parse);
};
//export default AsepriteView.parse; idk if this would be valid I would assume it would lose its context.
