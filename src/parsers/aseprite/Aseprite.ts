import { assert } from "../../utils";
import AseView from "./AseView";
import { rgbaNormal } from "./blendFunctions";
import { AseLayer, AseColorProfile, AseCel, AseICCProfile, AseTags, AseExternalAssets, AseFrame, AseTileset, AseImageCel, AseTag } from "./types";
import { LfPair, LfQuad } from "../types";
export type AsepriteOptions = {
	layers?: string[];
	animations?: string[]
}
export default class Aseprite {
	frames: AseFrame[] = [];
	size: LfPair;
	tags: Record<string, AseTag>

	constructor(frames: AseFrame[], size: LfPair, tags){
		this.frames = frames;
		this.size = size;
	}
	static async init(buffer: ArrayBuffer, options:AsepriteOptions = {}): Promise<Aseprite>{
		const v = new AseView(buffer);
		const fileSize = v.dword();
		assert(v.word() === 0xa5e0, `Invalid File format`);
		const len = v.word();
		const size = v.pair(v.word);
		const colorDepth = v.word();
		const flags = v.dword();
		const speed = v.word(8);
		const paletteEntry = v.byte(3);
		//Do I really need all this...
		const colorCount = v.word();
		const pixelSize = v.pair(v.byte);
		const position = v.pair(v.short);
		const gridSize = v.pair(v.word, 84);
		let tileset: AseTileset | undefined = undefined;
		const pixelFormat = colorDepth / 8;
		let colorProfile: (AseColorProfile | AseICCProfile)[] = []
		let colorPalette: LfQuad[] = [];
		const namedColors: Map<string, LfQuad> = new Map();
		const layers: AseLayer[] = [];
		const externals: AseExternalAssets[] = [];
		const frames: AseFrame[] = []
		const tags: Record<string,AseTag> = {};
		for(let i = 0; i<len; i++){
			const end = v.offset + v.dword();
			assert(v.word(2) === 0xF1FA, "Frame mismatch");
			const duration = v.word(2);
			const chunkLen = v.dword();
			const cels: Record<number, AseCel[]> = {};
			for(let j = 0; j<chunkLen; j++){
				let chunk = v.chunk();
				if(!chunk) continue;
				switch (chunk.chunkType) {
					case 0x2004:
						//console.log("Got layer");
						chunk.cels = new Array(len); //this is a second frame representation to enable explicit linking without traversing the entire file.
						layers.push(chunk);
						if(chunk.tileIndex) console.log("Chunk with tileIndex", chunk);
						break;
					case 0x2005:{
						//console.log("Got cel");
						//calculate the cells true layer by combining information
						const lyr = chunk.layerIndex + chunk.zIndex;
						layers[chunk.layerIndex].cels[i] = chunk; //in reality I should be able to resolve this link here (I cant imagine linking to the future being supported).
						frames[i].layers.push(chunk);
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
						
						if(chunk.celType === 3){
							console.log("Tilecel", chunk)
						}
						break;
					}
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
					case 0x2018:{ 
						console.log("Got tags", i, chunk);
						for(const tag of chunk.tags){
							tags[tag.tagName.replace(/\s/g, '')] = tag;
						}
						break; //tags are not necessary yet
					}
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
			const lyrs = Object.keys(cels).map(i=>parseInt(i)).sort();
			for(const i of lyrs){
				for(const lyr of cels[i]){
					if(options.layers && !options.layers.includes(layers[lyr.layerIndex].name)) continue;
					//console.log(options.layers, layers[lyr.layerIndex].name)
					if(lyr.celType === 0 || lyr.celType === 2){
						//if(!(layers[lyr.layerIndex].flags & 0x1))continue; //layer is not visible
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
							if(bi < bm.length-4){
								bm.set(color, bi); //just replacing for now. This is where blendModes need to be calculated.
							}
						}
					} else if (lyr.celType === 1) {
						if(layers[lyr.layerIndex].cels[lyr.frame].celType !== 0 && layers[lyr.layerIndex].cels[lyr.frame].celType !== 2) {
							console.warn("Only image references are supported");
							continue;
						}
						const l = layers[lyr.layerIndex].cels[lyr.frame] as AseImageCel;
						for(let j = 0; j<l.pixels.length; j+=4){
							const color = l.pixels.slice(j, j+4);
							if(!color[3]) continue; //no alpha no pixel
							//calculate pixel position based on location

							const li = j/4;
							const lx = (li%l.pixelSize[0])+lyr.position[0];
							const ly = Math.floor(li/l.pixelSize[0])+lyr.position[1];
							if(lx < 0 || lx >= size[0] || ly < 0 || ly >= size[0]) continue; //clipped
							const bi = (ly*size[0]+lx)*4;
							//console.log("Setting color", color);
							bm.set(color, bi); //just replacing for now. This is where blendModes need to be calculated.
						}
						//console.log("Linked", i, lyr, layers[lyr.frame]);
					} else {
						console.log(`Need additional render support 0x${lyr.celType.toString(16)}`);
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
		console.log(tags);
		if(options.animations){
			const nf: AseFrame[] = [];
			for(const anim of options.animations){
				const tg = tags[anim];
				if(!tg) continue;
				nf.push(...frames.slice(...tg.range));
			}
			return new Aseprite(nf, size, tags);
		}
		return new Aseprite(frames, size, tags);
	}
}

export const loadAseprite = (filePath: string, options:AsepriteOptions) => fetch(filePath)
.then(r=>r.arrayBuffer())
.then(r=>Aseprite.init(r, options));


