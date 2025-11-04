import { assert } from "../../utils/util";
import { LfPair } from "../types";
import PsdView from "./PsdView";

export default class Psd {
  size: LfPair;
  frames: ImageBitmap[];

  constructor(size: LfPair, frames: ImageBitmap[]) {
    this.size = size;
    this.frames = frames;
  }

  static async init(buffer: ArrayBuffer) {
    const v = new PsdView(buffer);
    const sig = v.str(4);
    const ver = v.word(6);

    assert(sig === "8BPS", "Invalid file format");
    assert(ver === 1, `File version mismatch ${ver}`);

    const channels = v.word();
    const size = v.pair(v.dword);
    const depth = v.word();
    const colorMode = v.word();

    const colorData = v.dword();
    v.offset += colorData;
    if (colorData)
      console.warn("Only rgb and rgba formats are supported at this time");

    const lmEnd = v.offset + v.dword();
    const layersLength = v.dword();
    const layerCount = v.word();
    //parse layers info first

    v.offset = lmEnd;
    const imgCompression = v.word();
    if (imgCompression !== 0)
      throw new Error("Compression formats not yet supported");

    if (channels === 3) {
      console.log("Rendering rgb image");
      const bm = await v.rgb(...size);
      console.log("got bitmap");
      return new Psd(size, [bm]);
    }
    console.log(channels, size, depth, colorMode, colorData, imgCompression);
  }
}

export const loadPsd = (filePath: string) =>
  fetch(filePath)
    .then((r) => r.arrayBuffer())
    .then((r) => Psd.init(r));
