import { assert } from "../../utils";
import AseView from "./AseView";
import { rgbaNormal } from "./blendFunctions";
import { AsePair, AseLayer, AseColorProfile, AseCel, AseICCProfile, AseTags, AseExternalAssets, AseFrame, AseQuad, AseTileset } from "./types";

export default class Aseprite {
	frames: AseFrame[] = [];
	size: AsePair;
	constructor(frames: AseFrame[], size: AsePair){
		this.frames = frames;
		this.size = size;
	}
	static async init(buffer: ArrayBuffer): Promise<Aseprite>{
		const v = new AseView(buffer);
		const fileSize = v.dword();
		assert(v.word() === 0xa5e0, `Invalid File format`);
		const len = v.word();
		const size = v.pair(v.word);
		const colorDepth = v.word();
		const flags = v.dword();
		const speed = v.word(8);
		const paletteEntry = v.byte(3);
		const colorCount = v.word();
		const pixelSize = v.pair(v.byte);
		const position = v.pair(v.short);
		const gridSize = v.pair(v.word, 84);
		let tileset: AseTileset | undefined = undefined;
		const pixelFormat = colorDepth / 8;
		let colorProfile: (AseColorProfile | AseICCProfile)[] = []
		let colorPalette: AseQuad[] = [];
		const namedColors: Map<string, AseQuad> = new Map();
		const imgSize = size[0] * size[1];
		const layers: AseLayer[] = [];
		const externals: AseExternalAssets[] = [];
		const frames: AseFrame[] = []
		
		for(let i = 0; i<len; i++){
			const end = v.offset + v.dword();
			assert(v.word(2) === 0xF1FA, "Frame mismatch");
			const duration = v.word(2);
			const chunkLen = v.dword();
			const cels: Record<number, AseCel[]> = {};
			const tags: AseTags[] = [];
			for(let j = 0; j<chunkLen; j++){
				const chunk = v.chunk();
				if(!chunk) continue;
				switch (chunk.chunkType) {
					case 0x2004:
						//console.log("Got layer");
						chunk.cels = new Array(len); //this is a second frame representation to enable explicit linking without traversing the entire file.
						layers.push(chunk);
						if(chunk.tileIndex) console.log("Chunk with tileIndex", chunk);
						break;
					case 0x2005:
						//console.log("Got cel");
						//calculate the cells true layer by combining information
						const lyr = chunk.layerIndex + chunk.zIndex;
						layers[chunk.layerIndex].cels[i] = chunk; //in reality I should be able to resolve this link here (I cant imagine linking to the future being supported).
						if(!(lyr in cels)) {
							cels[lyr] = [chunk];
						} else {
							const ni = cels[lyr].findIndex(c=>c.zIndex > lyr);
							//cels[lyr].push(chunk);
							if(~ni) cels[lyr].splice(ni, 0, chunk);
							else cels[lyr].push(chunk);
						}
						if(chunk.celType === 2 && pixelFormat != 4) {
							if(pixelFormat === 1) chunk.pixels = v.indexedToRGBA(chunk.pixels, colorPalette);
							else if (pixelFormat === 2) chunk.pixels = v.greyToRGBA(chunk.pixels);
						}
						
						break;
					case 0x2006:
						break; //not used yet
					case 0x2007:
						if(colorProfile.length === 0) colorProfile.push(chunk); 
						else colorProfile[0] = chunk;
						break;
					case 0x2008:
						console.log("Got externals");
						externals.push(chunk);
						break;
					case 0x2018: 
						console.log("Got tags", i, chunk);
						tags.push(chunk);
						break; //tags are not necessary yet
					case 0x2019:
						if(chunk.lastIndex >= colorPalette.length){
							colorPalette = [...colorPalette, ...new Array(chunk.lastIndex-colorPalette.length-1)];
						}
						for(let j = 0; j<chunk.colors.length; j++){
							const pIndex = chunk.firstIndex+j;
							if(pIndex === paletteEntry) chunk.colors[j].color = [0,0,0,0]; //this is the transparent color... always
							colorPalette[chunk.firstIndex+j] = chunk.colors[j].color;
							if(chunk.colors[j].name) namedColors.set(chunk.colors[j].name, chunk.colors[j].color);
						}
						break;
					case 0x2020:
						//console.log("Got user data", chunk);
						break; //im not doing anything with user data just yet.
					case 0x2022:
						console.log("Got slice");
						const slice = v.slice();
						console.log(slice);
						break; //I am pretty sure a slice just describes a reusable set of frames to render the base frames this should be uncessary.
					case 0x2023:
						console.log("Got tileset", chunk);
						tileset = chunk;
						break; //I am not ready to support tilesets.
				}
			}
			let bm = new Uint8Array(size[0]*size[1]*4);
			if(tileset) {
				if(tileset.pixels){
					//bm = v.indexedToRGBA(tileset.pixels, colorPalette);
				} else {
					console.warn("External tilesets are not yet supported");
				}
			} else {
				const lyrs = Object.keys(cels).map(i=>parseInt(i)).sort();
				for(const i of lyrs){
					for(const lyr of cels[i]){
						if(!(layers[lyr.layerIndex].flags & 0x1))continue; //layer is not visible
						//console.log(lyr);
						if(lyr.celType === 0 || lyr.celType === 2){
							for(let j = 0; j<lyr.pixels.length; j+= 4){
								const color = lyr.pixels.slice(j, j+4);
								if(!color[3]) continue; //no alpha no pixel
								//calculate pixel position based on location

								const li = j/4;
								const lx = (li%lyr.pixelSize[0])+lyr.position[0];
								const ly = Math.floor(li/lyr.pixelSize[0])+lyr.position[1];
								if(lx < 0 || lx >= size[0] || ly < 0 || ly >= size[0]) continue; //clipped
								const bi = (ly*size[0]+lx)*4;
								//console.log("Setting color", color);
								bm.set(color, bi); //just replacing for now. This is where blendModes need to be calculated.
							}
						} else if (lyr.celType === 1) {
							//console.log("Linked", i, lyr, layers[lyr.frame]);
						} else {
							console.log(`Need additional render support 0x${lyr.celType.toString(16)}`);
						}
					}
				}
			}
			
			
			const bitmap = await createImageBitmap(new ImageData(
				new Uint8ClampedArray(bm.buffer),
				...size
			));
			frames.push({bitmap, duration, layers});
			v.offset = end

		}
		console.log("frames length", frames.length, colorDepth, colorPalette[0], paletteEntry, colorPalette[paletteEntry], layers);
		return new Aseprite(frames, size);
	}
}

export const loadAseprite = (filePath: string) => fetch(filePath)
.then(r=>r.arrayBuffer())
.then(r=>Aseprite.init(r));


