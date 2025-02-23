import Scene from "../scene";
import { SceneTypes } from "../types/scene.types";
import { AssetData } from "./assetloading.types";

class AssetBuilder {
    currentScene: any;
    modelFileName: string;

    constructor(fileName: string, currentScene: any) {
        this.currentScene = currentScene;
        this.modelFileName = fileName;
    }

    start() {
        // @ts-ignore
        if (import.meta.env.MODE == 'production' || process.env.NODE_ENV == 'production') {
          // being built by vite, or node_env  
        }
    }

    /** This will only be called if a scene needs to be created from an imported file. */
    processData(sceneData: any, saveLocation: string): AssetData {
        let scene: SceneTypes = {
            models: [],
            name: "test",
            id: "1",
        };
        
        let result: AssetData = {
            saveLocation: 'local',
            currentScene: scene
        };

        return result;
    }  
}

export default AssetBuilder;