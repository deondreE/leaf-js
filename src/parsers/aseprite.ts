import { assert } from "../utils";
import { AseChunkType, AseColorProfile, AseFrame, AseFrameChunk, AseHeader, AsePoint, AseRect } from "./aseprite.types";


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

  readLong(skip: number = 0): number {
	const value = this.view.getInt32(this.offset, true);
	this.offset += 4 + skip;
	return value;
  }

  readFixed(skip: number = 0):number{
	const raw = this.view.getInt32(this.offset, true);
	this.offset += 4 + skip;
	return raw / 65536;
  }

  readFloat(skip: number = 0):number{
	const raw = this.view.getFloat32(this.offset, true);
	this.offset += 4 + skip;
	return raw;
  }

  readDouble(skip: number = 0):number{
	const raw = this.view.getFloat64(this.offset, true);
	this.offset += 8 + skip;
	return raw;
  }

  readQword(skip: number = 0): bigint {
	const raw = this.view.getBigUint64(this.offset, true);
	this.offset += 16 + skip;
	return raw;
  }

  readLong64(skip: number = 0): bigint {
	const raw = this.view.getBigInt64(this.offset, true);
	this.offset += 16 + skip;
	return raw;
  }

  //spec defines bytes[l] as a read type however this should be split into the necessary specialized types. 

  readUint8Array(len: number, skip: number = 0): Uint8Array {
	const raw = new Uint8Array(this.buffer.slice(this.offset, this.offset + len));
	this.offset += len + skip;
	return raw;
  }

  readString(skip: number = 0): string {
    const length = this.readWord();
    const bytes = new Uint8Array(this.buffer.slice(this.offset, this.offset + length));
    this.offset += length + skip;
    return new TextDecoder().decode(bytes);
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
	//v.readFrame();
	console.log(header, v.offset);
    
  }
}

export const loadAseprite = (url: string) => {
  return fetch(url)
    .then((r) => r.arrayBuffer())
    .then(AsepriteView.parse);
};
//export default AsepriteView.parse; idk if this would be valid I would assume it would lose its context.
