import Renderer from "./renderer.old";
import type { Model } from "./types/scene.types";

/** A Scene is defined as a collection of objects renderd in a single pass. */
class Scene {
    name: string;
    subscenes: [];
    animations: [];
    models: Model[];
    initialized: boolean;
    renderer: Renderer;

    constructor ({name, subscenes, models, animations}: Scene) {
        this.name = name;
        this.initialized = false;
        this.subscenes = subscenes || [];
        this.animations = animations || [];
        this.models = models || [];
    }

    /**
    * Initialize the scene and its objects.
    */
    start() {
        console.log(`Initialize the scene: ${this.name}`);
        this.initialized = true;
        this.renderer = new Renderer({models: this.models});
        this.renderer.init();

        this.renderer.render();
    }
};

export default Scene;