import { SceneTypes } from "../types/scene.types";

interface AssetData {
    saveLocation: 'local' | 'cloudflare' | 's3';
    currentScene: SceneTypes;
}

enum AssetType {
    Cube,
    Capsule,
    Quad,
};

export type { AssetData,  AssetType };