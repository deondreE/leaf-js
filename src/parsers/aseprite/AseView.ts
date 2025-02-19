import { assert } from '../../utils';
import { LEGACY_TYPES } from './constants';
import {
  AseCel,
  AseCelBase,
  AseCelExtra,
  AseCelTilemap,
  AseChunk,
  AseChunkType,
  AseColorPalette,
  AseColorPaletteEntry,
  AseColorProfile,
  AseExternalAsset,
  AseExternalAssets,
  AseICCProfile,
  AseImageCel,
  AseLayer,
  AseLayerBlendMode,
  AseLayerType,
  AseLinkedCel,
  AsePair,
  AsePropertyArray,
  AsePropertyMap,
  AsePropertyTypes,
  AseSlice,
  AseSliceElement,
  AseTag,
  AseTags,
  AseTileset,
  AseUserData,
  ReaderFunc,
} from './types';
import pako from 'pako';

export default class AseView extends DataView<ArrayBuffer> {
  offset: number = 0;
  decoder = new TextDecoder();
  constructor(buffer: ArrayBuffer) {
    super(buffer);
  }
  next<T>(v: T, s: number = 0): T {
    this.offset += s;
    return v;
  }
  byte(s: number = 0): number {
    return this.next(this.getUint8(this.offset), 1 + s);
  }
  word(s: number = 0): number {
    return this.next(this.getUint16(this.offset, true), 2 + s);
  }
  short(s: number = 0): number {
    return this.next(this.getInt16(this.offset, true), 2 + s);
  }
  dword(s: number = 0): number {
    return this.next(this.getUint32(this.offset, true), 4 + s);
  }
  long(s: number = 0): number {
    return this.next(this.getInt32(this.offset, true), 4 + s);
  }
  fixed(s: number = 0): number {
    return this.next(this.getInt32(this.offset, true) / 65536, 4 + s);
  }
  float(s: number = 0): number {
    return this.next(this.getFloat32(this.offset, true), 4 + s);
  }
  double(s: number = 0): number {
    return this.next(this.getFloat64(this.offset, true), 8 + s);
  }
  qword(s: number = 0): bigint {
    return this.next(this.getBigUint64(this.offset, true), 16 + s);
  }
  long64(s: number = 0): bigint {
    return this.next(this.getBigInt64(this.offset, true), 16 + s);
  }
  array(len: number, s: number = 0): Uint8Array {
    return this.next(new Uint8Array(this.buffer.slice(this.offset, this.offset + len)), len + s);
  }
  inflate(len: number, s: number = 0): Uint8Array {
    return pako.inflate(this.array(len, s));
  }
  string(s: number = 0): string {
    return this.decoder.decode(this.array(this.word(), s));
  }
  uuid(s: number = 0): string {
    return this.decoder.decode(this.array(16, s));
  }
  //TODO - pairs triplets and quads should just be fixed type arrays.

  pair<T>(fn: ReaderFunc<T>, s: number = 0): [T, T] {
    fn = fn.bind(this);
    return [fn(), fn(s)];
  }

  triplet<T>(fn: ReaderFunc<T>, s: number = 0): [T, T, T] {
    fn = fn.bind(this);
    return [fn(), fn(), fn(s)];
  }

  quad<T>(fn: ReaderFunc<T>, s: number = 0): [T, T, T, T] {
    fn = fn.bind(this);
    return [fn(), fn(), fn(), fn(s)];
  }

  userData(): Omit<AseUserData, 'chunkType'> {
    const flags = this.dword();
    return {
      text: (flags & 1) === 1 ? this.string() : undefined,
      color: (flags & 2) === 2 ? this.quad(this.byte) : undefined,
      properties: (flags & 4) === 4 ? this.propertyMap() : undefined,
    };
  }

  colorProfile(): Omit<AseColorProfile, 'chunkType'> | Omit<AseICCProfile, 'chunkType'> {
    const profileType = this.word(2) as 0 | 1 | 2;
    return {
      profileType,
      gamma: this.fixed(8),
      icc: profileType === 2 ? this.array(this.dword()) : undefined,
    };
  }

  colorPalette(): Omit<AseColorPalette, 'chunkType'> {
    const len = this.dword();
    const firstIndex = this.dword();
    const lastIndex = this.dword(8);
    const colors = new Array<AseColorPaletteEntry>(len).fill(null);
    for (let i = 0; i < len; i++) {
      const hasName = this.word() === 1;
      colors[i] = { color: this.quad(this.byte), name: hasName ? this.string() : undefined };
    }
    return { firstIndex, lastIndex, colors };
  }

  readTags(): Omit<AseTags, 'chunkType'> {
    const len = this.word(8);
    const tags = new Array<AseTag>(len).fill(null);
    for (let i = 0; i < len; i++) {
      tags[i] = {
        range: this.pair(this.word),
        direction: this.byte(),
        repeat: this.word(6),
        tagColor: this.triplet(this.byte, 1),
        tagName: this.string(),
      };
    }
    return { tags };
  }

  layer(): Omit<AseLayer, 'chunkType'> {
    const flags = this.word();
    const layerType = this.word() as AseLayerType;
    return {
      flags,
      layerType,
      depth: this.word(),
      size: this.pair(this.word),
      blendMode: this.word() as AseLayerBlendMode,
      alpha: this.byte(3),
      name: this.string(),
      cels: [],
      tileIndex: layerType === 2 ? this.dword() : undefined,
    };
  }

  cel(chunkEnd: number): Omit<AseCel, 'chunkType'> {
    const layerIndex = this.word();
    const position = this.pair(this.word);
    const alpha = this.byte(); //a cel belongs to a layer in a way allowing a one to many relationship with a layer. layers also have an alpha I may need to combine the alpha as well.
    const celType = this.word() as 0 | 1 | 2 | 3;
    const zIndex = this.short(5);
    const base: Omit<AseCelBase, 'chunkType'> = { layerIndex, position, alpha, zIndex };
    switch (celType) {
      case 0:
        return {
          celType,
          pixelSize: this.pair(this.word),
          pixels: this.array(chunkEnd - this.offset),
          ...base,
        } as AseImageCel;
      case 1:
        return {
          celType,
          frame: this.word(),
          ...base,
        } as AseLinkedCel;
      case 2:
        return {
          celType,
          pixelSize: this.pair(this.word),
          pixels: this.inflate(chunkEnd - this.offset),
          ...base,
        } as AseImageCel;
      case 3:
        return {
          celType,
          tileMapSize: this.pair(this.word),
          tileBpt: this.word(),
          bitmask: this.quad(this.dword),
          tiles: this.array(chunkEnd - this.offset),
        } as AseCelTilemap;
    }
  }
  celExtra(): Omit<AseCelExtra, 'chunkType'> {
    return {
      flags: this.dword(),
      preciseRect: this.quad(this.fixed, 16),
    };
  }

  external(): Omit<AseExternalAssets, 'chunkType'> {
    const len = this.dword(8);
    const assets = new Array<AseExternalAsset>(len).fill(null);
    for (let i = 0; i < len; i++) {
      assets[i] = {
        assetId: this.dword(),
        assetType: this.byte(7) as 0 | 1 | 2 | 3,
        assetPath: this.string(),
      };
    }
    return { assets };
  }

  tags(): Omit<AseTags, 'chunkType'> {
    const len = this.word(8);
    const tags = new Array<AseTag>(len).fill(null);
    for (let i = 0; i < len; i++) {
      tags[i] = {
        range: this.pair(this.word),
        direction: this.byte(),
        repeat: this.word(6),
        tagColor: this.triplet(this.byte, 1),
        tagName: this.string(),
      };
    }
    return { tags };
  }

  slice(): Omit<AseSlice, 'chunkType'> {
    const len = this.dword();
    const flags = this.dword(4);
    const name = this.string();
    const is9Patch = (flags & 1) === 1;
    const hasPivotInfo = (flags & 2) === 2;
    const slices = new Array<AseSliceElement>(len).fill(null);
    for (let i = 0; i < len; i++) {
      slices[i] = {
        frameIndex: this.dword(),
        location: this.pair(this.long),
        size: this.pair(this.dword),
      };
      if (is9Patch) {
        slices[i].center = this.pair(this.long);
        slices[i].centerSize = this.pair(this.dword);
      }
      if (hasPivotInfo) {
        slices[i].pivot = this.pair(this.long);
      }
    }
    return { flags, slices, name };
  }
  tileset(): Omit<AseTileset, 'chunkType'> {
    const tilesetId = this.dword();
    const tilesetFlags = this.dword();
    const tilesLength = this.dword();
    const tilesetSize = this.pair(this.word);
    const tilesetBaseIndex = this.short(14);
    const tilesetName = this.string();

    const tileset: Omit<AseTileset, 'chunkType'> = {
      tilesetId,
      tilesetBaseIndex,
      tilesetFlags,
      tilesLength,
      tilesetName,
      tilesetSize,
    };

    if ((tilesetFlags & 1) === 1) {
      tileset.externalChunkId = this.dword();
      tileset.externalId = this.dword();
    }

    if ((tilesetFlags & 2) === 2) {
      tileset.pixels = this.inflate(this.dword());
    }
    return tileset;
  }
  chunker(type: AseChunkType, end): Omit<AseChunk, 'chunkType'> {
    switch (type) {
      case 0x2004:
        return this.layer();
      case 0x2005:
        return this.cel(end);
      case 0x2006:
        return this.celExtra();
      case 0x2007:
        return this.colorProfile();
      case 0x2008:
        return this.external();
      case 0x2018:
        return this.tags();
      case 0x2019:
        return this.colorPalette();
      case 0x2020:
        return this.userData();
      case 0x2022:
        return this.slice();
      case 0x2023:
        return this.tileset();
    }
  }

  chunk(): AseChunk | undefined {
    const end = this.offset + this.dword();
    const chunkType = this.word() as AseChunkType;
    if (LEGACY_TYPES.has(chunkType)) {
      this.offset = end;
      return undefined;
    }
    const props = this.chunker(chunkType, end);
    this.offset = end;
    return { chunkType, ...props } as AseChunk;
  }

  chunks(len: number): AseChunk[] {
    const chunks: AseChunk[] = [];
    for (let i = 0; i < len; i++) {
      const chunk = this.chunk();
      if (!chunk) continue;
      chunks.push(chunk);
    }
    return chunks;
  }

  propertyList(): AsePropertyArray {
    const len = this.dword();
    const elementType = this.word();
    const elements = new Array<AsePropertyTypes>(len).fill(null);
    for (let i = 0; i < len; i++) {
      elements[i] = this.propertyValue();
    }
    return elements;
  }

  propertyValue(): AsePropertyTypes {
    const pType = this.word();
    switch (pType) {
      case 0x0001:
        return this.byte() > 0;
      case 0x0002:
      case 0x0003:
        return this.byte();
      case 0x0004:
        return this.short();
      case 0x0005:
        return this.word();
      case 0x0006:
        return this.long();
      case 0x0007:
        return this.dword();
      case 0x0008:
        return this.long64();
      case 0x0009:
        return this.qword();
      case 0x000a:
        return this.fixed();
      case 0x000b:
        return this.float();
      case 0x000c:
        return this.double();
      case 0x000d:
        return this.string();
      case 0x000e:
      case 0x000f:
        return this.pair(this.long);
      case 0x0010:
        return this.quad(this.long);
      case 0x0011:
        return this.propertyList();
      case 0x0012:
        return this.propertyMap();
      case 0x0013:
        return this.uuid();
      default:
        throw new Error('Prop type mismatch');
    }
  }
  propertyMap(): AsePropertyMap {
    const mapByteSize = this.dword();
    const len = this.dword();
    const props: AsePropertyMap = {};
    for (let i = 0; i < len; i++) {
      const key = this.string();
      const value = this.propertyValue();
      props[key] = value;
    }
    return props;
  }
}
