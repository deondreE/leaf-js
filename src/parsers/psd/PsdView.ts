import { assert } from "../../utils";
import LeafView from "../LeafView";

export default class PsdView extends LeafView {
	constructor(buffer: ArrayBuffer){
		super(buffer, false);
		
	}
};