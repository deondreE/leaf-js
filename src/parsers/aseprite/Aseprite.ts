import { assert } from "../../utils";
import AseView from "./AseView";
import { AsePair, AseLayer, AseColorProfile, AseCel, AseICCProfile, AseTags, AseColorPalette, AseExternalAssets, AseFrame } from "./types";

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
		const pixelFormat = colorDepth / 8;
		let colorProfile: (AseColorProfile | AseICCProfile)[] = []
		let colorPalette: AseColorPalette[] = []
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
						console.log("Got layer");
						layers.push(chunk);
						break;
					case 0x2005:
						console.log("Got cel");
						//calculate the cells true layer by combining information
						const lyr = chunk.layerIndex + chunk.zIndex;
						if(!(lyr in cels)) {
							cels[lyr] = [chunk];
						} else {
							const ni = cels[lyr].findIndex(c=>c.zIndex > lyr);
							cels[lyr].push(chunk);
							//if(~ni) cels[lyr].splice(ni, 0, chunk);
							//else cels[lyr].push(chunk);
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
						console.log("Got tags", i);
						tags.push(chunk);
						break; //tags are not necessary yet
					case 0x2019:
						console.log("Got color palette");
						if(colorPalette.length === 0) colorPalette.push(chunk);
						else colorPalette[0] = chunk; //I dont think they support more then 1 color palette; also it appears layers are stil comprised of rgba colors in most instances. (I think a future plan to reduce image size is to use color palette indices)
						break;
					case 0x2020:
						console.log("Got user data");
						break; //im not doing anything with user data just yet.
					case 0x2022:
						console.log("Got slice");
						const slice = v.slice();
						console.log(slice);
						break; //I am pretty sure a slice just describes a reusable set of frames to render the base frames this should be uncessary.
					case 0x2023:
						console.log("Got tileset");
						break; //I am not ready to support tilesets.
				}
			}
			console.log(layers, cels);
			let bm = new Uint8Array(size[0]*size[1]*4);
			const lyrs = Object.keys(cels).map(i=>parseInt(i)).sort();
			for(const i of lyrs){
				for(const lyr of cels[i]){
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
					} else {
						console.log(`Need additional render support 0x${lyr.celType.toString(16)}`);
					}
				}
			}
			const bitmap = await createImageBitmap(new ImageData(
				new Uint8ClampedArray(bm.buffer),
				...size
			));
			frames.push({bitmap, duration});
			v.offset = end

		}
		console.log("frames length", frames.length, colorDepth);
		return new Aseprite(frames, size);
	}
}

export const loadAseprite = (filePath: string) => fetch(filePath)
.then(r=>r.arrayBuffer())
.then(r=>Aseprite.init(r));
