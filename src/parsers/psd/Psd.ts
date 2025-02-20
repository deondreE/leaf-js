import PsdView from "./PsdView";

export default class Psd {
	constructor(buffer: ArrayBuffer){
		const v = new PsdView(buffer);
	}
}