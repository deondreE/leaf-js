import Renderer from "./renderer";

export type Render2dDescription = {
  canvas: HTMLCanvasElement;
}

/*
2D image processing

*/


export type AssetDescriptorBase = {
  /**
   * The url is used to fetch and identify the image asset throughout the parsing process.
   * 
   * In the event a url contains multiple SceneAssets that cannot be described in a single descriptor multiple descriptors using the same url should result in the image being recalled from the browsers cache. 
   */
  url: string;

}

/**
 * An image asset will typically be sliced into tiles to generate frames. 
 */
export type ImageTileAssetDescriptor = {
  tileSize: number | [width: number, height: number];
} & AssetDescriptorBase;



export type SceneAssetDescriptor = {};

export interface Renderable {
  render(renderer: Renderer, delta: number): void;
}


