import { Scene2dConfiguration } from "./2d";

//@ts-ignore
window.src = (): Scene2dConfiguration => ({
  assets: [
    ["knights.png", {}]
  ]
})

//@ts-ignore
window.loaded = function () {
  console.log('Scene loaded');
};
