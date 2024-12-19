// SceneManager.ts
declare var Module: any;  // This is the Emscripten-exported object

class SceneManager {
  private scene: any;

  constructor() {
    // Wait for the WASM module to load
    this.scene = null;
  }

  async initialize() {
    await Module.ready;
    this.scene = new Module.Scene();
  }

  addShape(shape: string) {
    if (this.scene) {
      switch (shape) {
        case "triangle":
          const triangle = new Module.Triangle(100, 100, 150, 150, 200, 100, { r: 255, g: 0, b: 0, a: 255 });
          this.scene.addEntity(triangle);
          break;
        case "circle":
          const circle = new Module.Circle(400, 300, 100, { r: 0, g: 255, b: 0, a: 255 });
          this.scene.addEntity(circle);
          break;
        default:
          console.error("Shape not recognized");
      }
    }
  }

  updateScene(deltaTime: number) {
    if (this.scene) {
      this.scene.update(deltaTime);
    }
  }

  renderScene(renderer: any) {
    if (this.scene) {
      this.scene.render(renderer);
    }
  }
}

const sceneManager = new SceneManager();
export default sceneManager;
  