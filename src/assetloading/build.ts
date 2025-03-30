import Scene from '../scene';
import { SceneTypes, Model } from '../types/scene.types';
import { AssetData } from './assetloading.types';
import { v4 as uuid } from 'uuid';

/** @internal AssetBuilder is for later. */
class AssetBuilder {
  currentScene: Scene | null = null;
  modelFileName: string | null = null;

  constructor() {}
}

export default AssetBuilder;
