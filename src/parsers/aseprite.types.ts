export interface Aseprite {
  header: AseHeader;
}
/*
  Parsing ASE. 
  
  Like many parsers the issue to arise becomes size. an ASEprite document may have large amounts of data to load. 
  
  With a limited data pool and the requirement of the document being completely parsed it needs to be 
  */
export interface AseHeader {
  size: number; //dword
  magic: number; //word
  frames: number; //word
  width: number; //word
  height: number; //word
  colorDepth: number; // 8 | 16 | 32 (word)
  flags: number; //dword
  speed: number;
  paletteEntry: number; //this is a byte
  //read past the next 3 bytes
  colorCount: number; //word 0===256 in old sprites...?
  pixelWidth: number; //byte
  pixelHeight: number; //byte
  x: number; //short
  y: number; //short
  gridWidth: number; // word (described as grid with but each cell is square so this represents the size of a cell)
  gridHeight: number;
  //read the next 84 bytes
}

export interface AseFrame {
  size: number; //dword (number of bytes in the frame)
  magic: number; //word should always be 0xF1FA
  //chunksOld: number; //word (represents the number of chunks in the frame if overflow there are more chunks in the frame that cant be described in this field and should use new field. 0xFFFF is max). not supporting legacy for mvp
  duration: number; //word (in ms)
  //skip next byte[2]
  chunkSize: number; //dword (if 0 check old field)
  chunks: any[]; //for now
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

export type AseFrameChunk {

}
export type AseFrameChunkBase = {
  size: number; //dword
};

export type AseColorProfile = {
  type: AseChunkType.colorProfile;
  profileType: number; //0 no profile, 1 = sRGB, 2 = internal
  profileFlags: number; //1 = use special fixed gamma
  gamma: number; //fixed
  //[8]bytes reserved (should be 0)
  //if internal
  profileLength?: number;
} & AseFrameChunkBase;


/*
  Chunk data.
  
  Each chunk type has a specific schema its data conforms to.
  because chunks and frames describe dynamic content the spec is not a 1 to 1 description of the schema but the data necessary to construct array or dictionaries of information.
  */

/*
  Color Palettes
  Color Palettes are declared in rgb and rgba however has 3 different schemas
  That being said the legacy variations can be represented by a [3 or 4]Uint8
  */
export type AseLegacyPaletteChunkItem = Uint8Array;
export type AseLegacyPaletteChunk = {
  paletteSize: number;
  items: AseLegacyPaletteChunkItem[];
};

export type AsePaletteChunk = {
  paletteSize: number;
};

export type AseLayerChunk = {
  flags: number; //word 1=visible 2=editable 4=lockmovement 8=background 16=prefer-linked-cels 32=The layer should be displayed collapsed 64=The layer is a reference layer
  layerType: number; //word 0=Normal (image) 1=group 2=tilemap
  layer: number; //word numeric indication of layer depths
  //width: number, //word (currently ignored)
  //height: number, //word (also ignored)
  blendMode: number; //word (pixel addition effect)
  opacity: number; //byte (header must have the opacity flag (1))
  //[3]byte
  name: string; //string
  tilesetIndex?: number; //dword - tileset index (only applicable to groups)
};

export type AseCelChunk = {
  layerIndex: number; //word
  x: number; //short
  y: number; //short
  alpha: number; //byte
  celType: number; //word 0-raw image (deprecated) 1-linked cel 2-CompressedImage 3- Compressed Tilemap
  zIndex: number; //short 0 - default ordering +N - show this cell nlayers later -N show this cell N layers back.
  //skip [5]bytes
};

export type AseCelChunkRawImage = AseCelChunk & {
  width: number; //word
  height: number; //word
};

export type ICCProfile = {
  size: number; //DWord
  cMMType: number; //DWord
  versionNumber: number; //DWord
  deviceClass: number; //DWord
  colorSpace: number; //DWord
  connectionSpace: number; //DWord
  creationDate: number; //TODO Datetype for now [3]DWord
  acspSignature: number; //DWord
  primaryPlatformSignature: number; //DWord
  cMMFlags: number; //DWord
  deviceManufaturer: number; //DWord
  deviceAttribute: number; //DWord*2 8Bytes type unknown
  renderIntent: number; //DWord
  illuminantChannels: Uint32Array; //Should be 3 Uint32 values
  profileCreatorSignature: number; //DWord
  profileID: number; //DWord*4... maybe a short string
  //skip 28 bytes
};

export enum AseUserDataPropertyType {
	mixed  = 0x0000,
	bool   = 0x0001,
	int8   = 0x0002,
	uint8  = 0x0003,
	int16  = 0x0004,
	uint16 = 0x0005,
	int32  = 0x0006,
	uint32 = 0x0007,
	int64  = 0x0008,
	uint64 = 0x0009,
	fixed  = 0x000A,
	float  = 0x000B,
	double = 0x000C,
	string = 0x000D,
	point  = 0x000E,
	size   = 0x000F,
	rect   = 0x0010,
	vector = 0x0011,
	map    = 0x0012,
	uuid   = 0x0013
}
export type AseChunkUserData = {
	userDataFlags: number, //1 = has text, 2 = has color, 4; assuming bitwise comparison allows for 3 = has text and color 5 = has properties * text and 6 has props and color and 7 has props color and text
	text?: string //STRING
	color?: Uint8Array //color this should be [4]Uint8. 
	properties?: Record<string, 
}