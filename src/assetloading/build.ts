import Scene from '../scene';
import { SceneTypes, Model } from '../types/scene.types';
import { AssetData } from './assetloading.types';
import { v4 as uuid } from 'uuid';

class AssetBuilder {
  currentScene: any;
  modelFileName: string;

  constructor() { 
  }
  
  /** This will only be called if a scene needs to be created from an imported file. */
 buildModelScene(model: Model): void {
   let importScene: SceneTypes = {
      name: model.name,
      type: 'staticimport',
      id: uuid(),
      models: [],
    };

    if (import.meta.env.MODE == 'production' || process.env.NODE_ENV == 'production') {
      // TODO: Figure out file reading and writing when it comes to the client.
      // This will write a src file to the client.
    } else {
      importScene.models.push(model);
      localStorage.setItem('staticimport', JSON.stringify(importScene)); 
    }
  }
}

export default AssetBuilder;
