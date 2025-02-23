import { LfPair, LfQuad, LfTriplet } from '../types';

export type ReaderFunc<T = number> = (s?: number) => T;

export type AseHeader = {
  fileSize: number;
  frames: number;
  size: LfPair;
  colorDepth: number;
  flags: number;
  speed: number;
  paletteEntry: number;
  colorCount: number;
  pixelSize: LfPair;
  location: LfPair;
  gridSize: LfPair;
};

export type AseChunk =
  | AseLegacyPalette
  | AseLayer
  | AseCel
  | AseCelExtra
  | AseColorProfile
  | AseICCProfile
  | AseExternalAssets
  | AseMask
  | AsePath
  | AseTags
  | AseColorPalette
  | AseUserData
  | AseSlice
  | AseTileset;

export type AseChunkType = AseChunk['chunkType'];

export type AseLegacyPalette = {
  chunkType: 0x0004 | 0x0011;
  colors: Uint8Array[];
};
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
  divide = 18,
}
export type AseLayer = {
  chunkType: 0x2004;
  flags: number;
  layerType: AseLayerType;
  depth: number;
  size: LfPair;
  blendMode: AseLayerBlendMode;
  alpha: number;
  name: string;
  tileIndex: number;
  cels: AseCel[];
};

export type AseCel = AseImageCel | AseLinkedCel | AseCelTilemap;

export type AseCelBase = {
  chunkType: 0x2005;
  layerIndex: number;
  position: LfPair;
  alpha: number;
  zIndex: number;
};

export type AseImageCel = {
  celType: 0 | 2;
  pixelSize: LfPair;
  pixels: Uint8Array;
} & AseCelBase;

export type AseLinkedCel = {
  celType: 1;
  frame: number;
} & AseCelBase;

export type AseCelTilemap = {
  celType: 3;
  tileMapSize: LfPair;
  tileBpt: number;
  bitmask: LfQuad;
  tiles: Uint8Array;
} & AseCelBase;

export type AseCelExtra = {
  chunkType: 0x2006;
  flags: number;
  preciseRect: LfQuad;
};

export type AseColorProfileBase = {
  chunkType: 0x2007;
  gamma: number; //fixed (the flag will be unecessary for now it will be skipped)
};

export type AseColorProfile = {
  profileType: 0 | 1; //no profile and sRGB will be treated the same
} & AseColorProfileBase;

export type AseICCProfile = {
  profileType: 2;
  icc: Uint8Array;
} & AseColorProfileBase;

export type AseExternalAsset = {
  assetId: number;
  assetType: 0 | 1 | 2 | 3;
  assetPath: string; //only relative paths are accepted this may be problematic if third party library extension.id's are needed to render
};

export type AseExternalAssets = {
  chunkType: 0x2008;
  assets: AseExternalAsset[];
};

export type AseMask = {
  /* deprecated but parsed for possible future support of legacy aseprite */ chunkType: 0x2016;
  position: LfPair;
  size: LfPair;
  name: string;
  bitmap: Uint8Array;
};

export type AsePath = {
  chunkType: 0x2017;
};

export type AseTags = {
  chunkType: 0x2018;
  tags: AseTag[];
};

export enum AseLoopDirection {
  forward = 0,
  reverse = 1,
  pingPong = 2,
  pingPongReverse = 3,
}

export type AseTag = {
  range: LfPair;
  direction: AseLoopDirection;
  repeat: number;
  tagColor: LfTriplet;
  tagName: string;
};

export type AseColorPalette = {
  chunkType: 0x2019;
  firstIndex: number;
  lastIndex: number;
  colors: AseColorPaletteEntry[];
};

export type AseColorPaletteEntry = {
  color: LfQuad;
  name?: string;
};

export type AsePropertyTypers =
  | 0x0001
  | 0x0002
  | 0x0003
  | 0x0004
  | 0x0005
  | 0x0006
  | 0x0008
  | 0x0009
  | 0x000a
  | 0x000b
  | 0x000c
  | 0x000d
  | 0x000e
  | 0x000f
  | 0x0010
  | 0x0011
  | 0x0012
  | 0x0013;

export type AsePropertyTypes =
  | boolean
  | number
  | string
  | bigint
  | LfPair
  | LfQuad
  | AsePropertyArray
  | AsePropertyMap;
export type AsePropType<T extends AsePropertyTypers | 0x0 = 0> = T extends 0x0001
  ? boolean
  : T extends 0x0002 | 0x0003 | 0x0004 | 0x0005 | 0x0006 | 0x0007 | 0x000a | 0x000b
    ? number
    : T extends 0x0008 | 0x0009 | 0x000c
      ? bigint
      : T extends 0x000d | 0x0013
        ? string
        : T extends 0x000e | 0x000f
          ? LfPair
          : T extends 0x0010
            ? LfQuad
            : T extends 0x0011
              ? AsePropertyArray
              : T extends 0x0012
                ? AsePropertyMap
                : AsePropertyTypes;

export interface AsePropertyArray extends Array<AsePropertyTypes> {}
export interface AsePropertyMap {
  [key: string]: AsePropertyTypes;
}
export type AseUserData = {
  chunkType: 0x2020;
  text?: string;
  color?: LfQuad;
  properties?: AsePropertyMap;
};

export type AseSlice = {
  chunkType: 0x2022;
  flags: number;
  name: string;
  slices: AseSliceElement[];
};

export type AseSliceElement = {
  frameIndex: number;
  location: LfPair; //long
  size: LfPair; //dword
  center?: LfPair; //long
  centerSize?: LfPair; //dword
  pivot?: LfPair; //long
};

export type AseTileset = {
  chunkType: 0x2023;
  tilesetId: number;
  tilesetFlags: number; //bitwise flag
  tilesetSize: LfPair;
  tilesLength: number;
  tilesetBaseIndex: number;
  tilesetName: string;
  externalChunkId?: number;
  externalId?: number;
  pixels?: Uint8Array;
};

export type AseFrame = {
  layers: AseCel[];
  bitmap: ImageBitmap;
  duration: number;
};
