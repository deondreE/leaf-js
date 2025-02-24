
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
const render = () => {
  const image = mkCircle();
  //@ts-ignore
  self.postMessage(image, [image]);
}
mkCircle();
type MessageData = [0, never[]]
| [1];
self.onmessage = (e: MessageEvent) => {

  const [cmd, args] = e.data as MessageData;
  switch (cmd){
    case 0: return render();
    default: throw new Error(`Unsupported command ${cmd}`);
  }

  //console.log("Doing something");
  //const image = mkCircle()
  //@ts-ignore
  //self.postMessage(image, [image]);
};


