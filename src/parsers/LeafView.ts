export type ReaderFunc<T = number> = (s?: number) => T;
export default class LeafView extends DataView<ArrayBuffer> {
  offset: number = 0;
  decoder = new TextDecoder();
  littleEndian: boolean;
  constructor(buffer: ArrayBuffer, littleEndian: boolean = true) {
    super(buffer);
    this.littleEndian = littleEndian;
  }

  next<T>(v: T, s: number = 0): T {
    this.offset += s;

    return v;
  }

  byte(s: number = 0): number {
    return this.next(this.getUint8(this.offset), 1 + s);
  }

  word(s: number = 0): number {
    return this.next(this.getUint16(this.offset, this.littleEndian), 2 + s);
  }

  short(s: number = 0): number {
    return this.next(this.getInt16(this.offset, this.littleEndian), 2 + s);
  }

  dword(s: number = 0): number {
    return this.next(this.getUint32(this.offset, this.littleEndian), 4 + s);
  }

  long(s: number = 0): number {
    return this.next(this.getInt32(this.offset, this.littleEndian), 4 + s);
  }

  fixed(s: number = 0): number {
    return this.next(this.getInt32(this.offset, this.littleEndian) / 65536, 4 + s);
  }

  float(s: number = 0): number {
    return this.next(this.getFloat32(this.offset, this.littleEndian), 4 + s);
  }

  double(s: number = 0): number {
    return this.next(this.getFloat64(this.offset, this.littleEndian), 8 + s);
  }

  qword(s: number = 0): bigint {
    return this.next(this.getBigUint64(this.offset, this.littleEndian), 16 + s);
  }

  long64(s: number = 0): bigint {
    return this.next(this.getBigInt64(this.offset, this.littleEndian), 16 + s);
  }

  array(len: number, s: number = 0): Uint8Array {
    return this.next(new Uint8Array(this.buffer.slice(this.offset, this.offset + len)), len + s);
  }

  str(len: number, s: number = 0): string {
    return this.decoder.decode(this.array(len, s));
  }

  string(s: number = 0): string {
    return this.str(this.word(), s);
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

  rgb(width: number, height: number): Promise<ImageBitmap> {
    const len = width * height;
    const bitmap = new Uint8ClampedArray(width * height * 4);
    console.log('Populating bitmap', width * height);

    for (let i = 0; i < len; i) {
      const rgb = this.array(3);
      bitmap.set([...rgb, 255], i * 4);
    }

    console.log('bitmap', bitmap);

    return createImageBitmap(new ImageData(bitmap, width, height));
  }
}
