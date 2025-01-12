/** A Scene is defined as a collection of objects renderd in a single pass. */
class Scene {
    sceneName: string;
    objects: any;
    initialized: boolean;

    constructor (sceneName: string) {
        this.sceneName = sceneName;
        this.objects = [];
        this.initialized = false;
    }

    /**
    * Initialize the scene and its objects.
    */
    start() {
        console.log(`Initialize the scene: ${this.sceneName}`);
        this.objects.forEach((object) => {
            if (object.init) {
                object.init();
            }
        });
        this.initialized = true;
    }

     /**
     * Update the scene and its objects (e.g., game logic).
     */
     update(deltaTime: number) {
        if (!this.initialized) {
            console.warn(`Scene "${this.sceneName}" is not initialized!`);
            return;
        }

        this.objects.forEach((object) => {
            if (object.update) {
                object.update(deltaTime);
            }
        });
    }

    /**
     * Add a game object to the scene.
     */
    addObject(gameObject: any) {
        this.objects.push(gameObject);
    }

     /**
     * Remove a game object from the scene.
     */
     removeObject(gameObject: any) {
        const index = this.objects.indexOf(gameObject);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
    }

    /**
     * Clear the scene and its objects.
     */
    clear() {
        this.objects = [];
        this.initialized = false;
    }
};