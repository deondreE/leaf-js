import { assert } from "../../utils";
import AseView from "./AseView";
import { AsePair } from "./types";

export default class Aseprite {
	fileSize: number;
	size: AsePair;
	colorDepth: number;
	flags: number;
	speed: number;
	paletteEntry: number;
	colorCount: number;
	pixelSize: AsePair;
	position: AsePair;
	gridSize: AsePair;
	pixelFormat: number;
	constructor(buffer: ArrayBuffer){
		const v = new AseView(buffer);
		this.fileSize = v.dword();
		assert(v.word() === 0xa5e0, `Invalid File format`);
		const len = v.word();
		this.size = v.pair(v.word);
		this.colorDepth = v.word();
		this.flags = v.dword();
		this.speed = v.word(8);
		this.paletteEntry = v.byte(3);
		this.colorCount = v.word();
		this.pixelSize = v.pair(v.byte);
		this.position = v.pair(v.short);
		this.gridSize = v.pair(v.word, 84);
		this.pixelFormat = this.colorDepth / 8;

		for(let i = 0; i<len; i++){
			let o = v.offset;
			const sz = v.dword();
			const mg = v.word();
			assert(mg === 0xF1FA, "Frame mismatch");
			v.offset = o+sz;
		}
	}
}

export const loadAseprite = (filePath: string) => fetch(filePath)
.then(r=>r.arrayBuffer())
.then(r=>new Aseprite(r));