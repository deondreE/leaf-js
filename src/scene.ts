import type {
    SceneTypes,
} from './types/sceneTypes';

/** Scene is the default class. */
class Scene {
    scene: SceneTypes;

    constructor(object: SceneTypes, canvas: HTMLCanvasElement) {
        this.scene = object;

        this.init();
        this.scene.canvas = canvas; 
    }   

    /**
     * Creates a cube inside of the current scene. 
     */
    Cube() {
        
    }

    Rectangle() {

    }

    /** Maybe we could avoid this just by initing in the constructor. */
    init() {
        /** requirements
         * 1. Redenering in its current state requires a canvas to be inside the given dom.
         * 2. Make sure the user is not curretly trying to move the camera in any way.
         * 3. Allow for the user to create any kind of shape through js.
         */

        // allows the renderer to know where to go.
        this.scene.canvas.setAttribute('id', 'canvas');
    }

    /** This is the so called 'render' call. */
    update() {

    }
}

export { Scene };