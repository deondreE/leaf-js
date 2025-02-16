import { assert } from '../utils';
import { AseChunk, AseChunkType, AseColorPalette, AseColorPaletteEntry, AseColorProfile, AseFrame, AseHeader, AseICCProfile, AseLayer, AseLayerBlendMode, AseLayerFlags, AseLayerType, AseLegacyPalette, AsePair, AsePropertyArray, AsePropertyMap, AsePropertyTypes, AseQuad, AseTag, AseTags, AseTriplet, AseUserData } from './aseprite.types';

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
  private decoder: TextDecoder = new TextDecoder();
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

  readFixed(skip: number = 0): number {
    const raw = this.view.getInt32(this.offset, true);
    this.offset += 4 + skip;
    return raw / 65536;
  }

  readFloat(skip: number = 0): number {
    const raw = this.view.getFloat32(this.offset, true);
    this.offset += 4 + skip;
    return raw;
  }

  readDouble(skip: number = 0): number {
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

  /*
  Pairs - Aseprite uses a variety of value pair types they all parse to a number but require different methods
  */
  private readPair(fn: (n?: number) => number, skip: number): AsePair {
    fn = fn.bind(this);
    return [fn(), fn(skip)];
  }

  readBytePair(skip: number = 0): AsePair {
    return this.readPair(this.readByte, skip);
  }

  readWordPair(skip: number = 0): AsePair {
    return this.readPair(this.readWord, skip);
  }

  readShortPair(skip: number = 0): AsePair {
    return this.readPair(this.readShort, skip);
  }

  readLongPair(skip: number = 0): AsePair {
	return this.readPair(this.readLong, skip);
  }

  private readTriplet(fn: (n?: number) => number, skip: number): AseTriplet {
    fn = fn.bind(this);
    return [fn(), fn(), fn(skip)];
  }

  readByteTriplet(skip: number = 0): AseTriplet {
	return this.readTriplet(this.readByte, skip);
  }

  private readQuad(fn: (n?: number) => number, skip: number): AseQuad {
    fn = fn.bind(this);
    return [fn(), fn(), fn(), fn(skip)];
  }

  readByteQuad(skip: number = 0): AseQuad {
	return this.readQuad(this.readByte, skip);
  }

  readLongQuad(skip: number = 0): AseQuad {
	return this.readQuad(this.readLong, skip);
  }
  //spec defines bytes[l] as a read type however this should be split into the necessary specialized types.

  readUint8Array(len: number, skip: number = 0): Uint8Array {
    const raw = new Uint8Array(this.buffer.slice(this.offset, this.offset + len));
    this.offset += len + skip;
    return raw;
  }
  private decode(len: number, skip: number = 0){
	return this.decoder.decode(this.readUint8Array(len, skip));
  }
  readString(skip: number = 0): string {
    return this.decode(this.readWord(), skip);
  }
  readUUID(skip: number = 0): string {
	return this.decode(16, skip);
  }
  readHeader(): AseHeader {
    const header: AseHeader = {
      fileSize: this.readDword(),
      magic: this.readWord(),
      frames: this.readWord(),
      size: this.readWordPair(),
      colorDepth: this.readWord(),
      flags: this.readDword(),
      speed: this.readWord(8),
      paletteEntry: this.readByte(3),
      colorCount: this.readWord(),
      pixelSize: this.readBytePair(),
      location: this.readShortPair(),
      gridSize: this.readWordPair(84),
    };
    assert(header.magic === 0xa5e0, 'Are you sure this is an aseprite file');
    return header;
  }
  readLegacyPalette(chunkType: AseLegacyPalette["chunkType"]): AseLegacyPalette {
	const len = this.readWord();
	const colors: AseTriplet[] = [];
	for(let i = 0; i<len; i++){
		const o = this.readByte(); //I dont think this will be necessary I think this is a way to overload a Byte length by having each packet have a smaller length size

		const colorCount = this.readByte(); //I think thats the purpose but we will see
		for(let i = 0; i<colorCount; i++){
			colors.push(this.readByteTriplet());
		}
	}
	return { chunkType, colors };
  }

  readColorProfile(): AseColorProfile | AseICCProfile {
	const profileType = this.readWord(2) as 0 | 1 | 2; //skip the flag
	const gamma = this.readFixed(8); //skip the 8 reserved
	if(profileType === 2) {
		const iccSize = this.readDword();
		const icc = new Uint8Array(this.buffer.slice(this.offset, this.offset+iccSize));
		this.offset += iccSize;
		return {chunkType: 0x2007, profileType, gamma, icc};
	}
	return {chunkType: 0x2007, profileType, gamma};
  }

  readColorPalette(): AseColorPalette{
	const palletSize = this.readDword();
	const firstIndex = this.readDword();
	const lastIndex = this.readDword(8);
	const colors = new Array<AseColorPaletteEntry>(palletSize).fill(null);
	for(let i = 0; i<palletSize; i++){
		const hasName = this.readWord() === 1;
		const color = this.readByteQuad()
		colors[i] = hasName ? {color, name:this.readString()}:{color};
	}
	return {chunkType: 0x2019, firstIndex, lastIndex, colors};
  }
  readTags(): AseTags {
	const len = this.readWord(8);
	const tags = new Array<AseTag>(len).fill(null);
	for(let i = 0; i<len; i++){
		tags[i] = {
			range: this.readWordPair(),
			direction: this.readByte(),
			repeat: this.readWord(6),
			tagColor: this.readByteTriplet(1),
			tagName: this.readString()
		}
	}
	return {chunkType: 0x2018, tags};
  }
  readPropertyList(): AsePropertyArray {
	const len = this.readDword();
	const elementType = this.readWord();
	const elements = new Array<AsePropertyTypes>(len).fill(null);
	for(let i = 0; i<len; i++){
		elements[i] = this.readPropertyValue();
	}
	return elements;
  }
  readPropertyValue(): AsePropertyTypes {
	const pType = this.readWord();
	switch (pType) {
		case 0x0001: return this.readByte() > 0;
		case 0x0002:
		case 0x0003: return this.readByte();
		case 0x0004: return this.readShort();
		case 0x0005: return this.readWord();
		case 0x0006: return this.readLong();
		case 0x0007: return this.readDword();
		case 0x0008: return this.readLong64();
		case 0x0009: return this.readQword();
		case 0x000A: return this.readFixed();
		case 0x000B: return this.readFloat();
		case 0x000C: return this.readDouble();
		case 0x000D: return this.readString();
		case 0x000E:
		case 0x000F: return this.readLongPair();
		case 0x0010: return this.readLongQuad();
		case 0x0011: return this.readPropertyList();
		case 0x0012: return this.readPropertyMap();
		case 0x0013: return this.readUUID();
		default:
			throw new Error("Prop type mismatch");
	}
  }
  readPropertyEntry(): [string, AsePropertyTypes] {
	const key = this.readString();
	return [key, this.readPropertyValue()];
  }
  readPropertyMap(): AsePropertyMap {
	const mapByteSize = this.readDword();
	const len = this.readDword();
	const props: AsePropertyMap = {};
	for(let i = 0; i<len; i++){
		const [key, value] = this.readPropertyEntry();
		props[key] = value;
	}
	return props;
  }
  readUserData(): AseUserData {
	const flags = this.readDword();
	return {
		chunkType: 0x2020,
		text: (flags & 1) === 1 ? this.readString():undefined,
		color: (flags & 2) === 2 ? this.readByteQuad():undefined,
		properties: (flags & 4) === 4 ? this.readPropertyMap():undefined
	}
  }
  readLayer(): AseLayer {
	const flags = this.readWord() as AseLayerFlags;
	const layerType = this.readWord() as AseLayerType;
	const layerChildLevel = this.readWord();
	const layerSize = this.readWordPair();
	const blendMode = this.readWord() as AseLayerBlendMode;
	const alpha = this.readByte();
	const name = this.readString();
	const tileIndex = layerType === 2 ? this.readDword():-1;

	return {
		chunkType: 0x2004,
		flags,
		layerType,
		layerChildLevel,
		layerSize,
		blendMode,
		alpha,
		name,
		tileIndex
	}
  }
  readChunk(): AseChunk {
	const chunkSize = this.readDword();
	const chunkType = this.readWord() as AseChunkType;
	switch(chunkType){
		case 0x0004: 
		case 0x0011: return this.readLegacyPalette(chunkType);
		case 0x2007: return this.readColorProfile();
		case 0x2018: return this.readTags();	
		case 0x2019: return this.readColorPalette();
		case 0x2020: return this.readUserData();
		default:
			console.log(`Chunk 0x${chunkType.toString(16)}`)
			return {chunkType:0x2017};
	}
	
  }

  readFrame(): AseFrame {
	const bytes = this.readDword() - 14;
	const magic = this.readWord(2);
	const duration = this.readWord(2);
	const chunkSizeNew = this.readDword();
	assert(magic === 0xF1FA, "Magic mismatch");
	//console.log(`Frame has ${bytes} bytes`, chunkSizeNew);
	var chunks = new Array(chunkSizeNew).fill(null);
	for(let i = 0; i<chunkSizeNew;i++){
		chunks[i] = this.readChunk();
		if(chunks[i].chunkType !== 0x2017) console.log("Chunk", chunks[i])
	}
	console.log("Chunks", chunks);
	return {duration, chunks};
  }
  static parse(buffer: ArrayBuffer) {
    const v = new AsepriteView(buffer);
    const header: AseHeader = v.readHeader();
    //assert(header.magic === 0xA5E0, `Header magic mismatch ${header.magic} ${0xA5E0}`);
    console.log(header, v.offset);
    const frame = v.readFrame();
    console.log(header, frame, v.offset);
  }
}

export const loadAseprite = (url: string) => {
  return fetch(url)
    .then((r) => r.arrayBuffer())
    .then(AsepriteView.parse);
};
//export default AsepriteView.parse; idk if this would be valid I would assume it would lose its context.
