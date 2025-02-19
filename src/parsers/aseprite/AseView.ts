
import { assert } from "../../utils";
import { ReaderFunc } from "./types";

export default class AseView extends DataView<ArrayBuffer> {
	offset: number = 0;
	decoder = new TextDecoder();
	constructor(buffer: ArrayBuffer){
		super(buffer);
	}
	next<T>(v:T,s:number = 0): T{
		this.offset += s;
		return v;
	}
	byte(s:number = 0): number {
		return this.next(this.getUint8(this.offset), 1+s);
	}
	word(s:number = 0): number {
		return this.next(this.getUint16(this.offset,true), 2+s);
	}
	short(s:number = 0): number {
		return this.next(this.getInt16(this.offset, true), 2+s);
	}
	dword(s:number = 0): number {
		return this.next(this.getUint32(this.offset, true), 4+s);
	}
	long(s:number = 0): number {
		return this.next(this.getInt32(this.offset, true), 4+s);
	}
	fixed(s:number = 0): number {
		return this.next(this.getInt32(this.offset, true)/65536, 4+s);
	}
	float(s:number = 0): number {
		return this.next(this.getFloat32(this.offset, true), 4+s);
	}
	double(s:number = 0): number {
		return this.next(this.getFloat64(this.offset, true), 8+s);
	}
	qword(s:number = 0): bigint {
		return this.next(this.getBigUint64(this.offset, true), 16+s);
	}
	long64(s:number = 0): bigint {
		return this.next(this.getBigInt64(this.offset, true), 16+s);
	}
	array(len: number, s:number = 0): Uint8Array {
		return this.next(new Uint8Array(this.buffer.slice(this.offset, this.offset+len)), len+s);
	}
	string(s: number = 0): string {
		return this.decoder.decode(this.array(this.word(), s))
	}
	uuid(s: number = 0): string {
		return this.decoder.decode(this.array(16, s));
	}
	pair<T>(fn: ReaderFunc<T>, s:number = 0): [T,T] {
		fn = fn.bind(this);
		return [fn(), fn(s)];
	}
}