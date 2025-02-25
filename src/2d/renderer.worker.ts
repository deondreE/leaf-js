
import { Pair } from "./types";

const dist = ([x1, y1]: Pair, [x2, y2]: Pair) => Math.sqrt((x2-x1)**2+(y2-y1)**2);

const mkCircle =  (): ImageBitmap => {
  const oc = new OffscreenCanvas(64, 64);
  const ctx = oc.getContext('2d');
  if(!ctx) throw new Error("Unable to get context");
  ctx.fillStyle = '#1C80F8'
  ctx.roundRect(0,0,64,64, 32);
  ctx.fill();
  return oc.transferToImageBitmap();
  
}

const loadImage = async (path: string) => new Promise((resolve, reject)=>{
  const img = new Image();
  img.onload = ()=>{
    console.log("Loaded");
    return resolve(undefined);
  }
  img.onerror = (err)=>reject(err);
  img.src = path;

})
const render = (camX: number, camY: number, width: number, height: number, ...spriteStates: number[]) => {
  const image = mkCircle();
  //@ts-ignore
  self.postMessage(image, [image]);
}

/*
Worker actions 
 */
type RegisterCanvas = [0, canvas: OffscreenCanvas];
type LoadImage = [1, path: string]; //need to nail down the data structure for image asset options. an option may be sprites 
type MessageData = [0, canvas: OffscreenCanvas]
| [1, [path: string, ]];
self.onmessage = (e: MessageEvent) => {
  const [cmd, args] = e.data as MessageData;
  
};


