import Renderer3D from './renderer.new';
import type { Model } from './types/scene.types';
import EventDispatcher from './eventdispatcher';

enum SceneState {
  ACTIVE,
  PAUSED,
  AWAKE,
  START,
  UPDATE,
}

/** A Scene is defined as a collection of objects renderd in a single pass. */
class Scene {
  name: string | '' = '';
  canvas: HTMLCanvasElement | null = null;
  uData: any | null = null;
  children: Map<Model, string> = new Map<Model, string>();
  renderer: Renderer3D | null = null;
  eventDispatcher: EventDispatcher | null = null;
  state: SceneState;

  constructor(uData: any, canvas: HTMLCanvasElement) {
    this.uData = uData;
    this.canvas = canvas;
    this.renderer = new Renderer3D(canvas);
    this.eventDispatcher = new EventDispatcher();
    this.state = SceneState.AWAKE;

    this.processUserData(uData);
    this.createScene();
  }

  /** Can be user provided, but often won't be.
   * @internal
   */
  awake(f: () => {}) {
    this.eventDispatcher?.on('onAwake', () => {
      console.log('Awake');
    });
  }

  /* Can be user provided, but currently just adds to the event stack.
   @internal
  */
  start() {
    this.eventDispatcher?.on('onStart', () => {
      this.saveModelData(this.uData);
    });
  }

  /* Can be user provided, but currently just adds to the event stack.
   * @internal
   */
  update(dt: number) {
    this.eventDispatcher?.on('onUpdate', () => {
      console.log('Update');
    });
  }

  /** Calls the user render function
    @internal
  */
  render() {
    let dt = 120 / 0.1;
    this.update(dt);
  }

  private processUserData(uData: any): void {
    uData.models.forEach((model: any) => {
      console.log(model);
      switch (model.type) {
        case 'cube': {
          this.cube(model);
          break;
        }
        default:
          console.log('Unsupported Model Type');
      }
    });
  }

  private cube(modelData: any) {
    if (modelData.scale <= 1 && modelData.rotation !== undefined && modelData.color !== undefined) {
      this.renderer?.primitiveCube(
        modelData.scale,
        modelData.rotation,
        modelData.color,
        modelData.animation,
        modelData.interactable,
      );
    } else {
      this.renderer?.primitiveCube();
    }
  }

  private saveModelData(uData: any, method?: string): void {
    const storedData = localStorage.getItem('UserDefinedScene');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (JSON.stringify(parsedData) === JSON.stringify(uData)) {
          console.log('No Changes to scene data');
          return;
        }
      } catch (error) {
        console.error(error);
      }
    }

    const saveData = JSON.stringify(uData);
    localStorage.setItem('UserDefinedScene', saveData);
    this.showSaveLoader();
  }

  private showSaveLoader() {
    const saveLoaderContainer = document.createElement('div');
    saveLoaderContainer.className = 'save-loader';

    const loader = document.createElement('div');
    loader.className = 'loader';

    saveLoaderContainer.appendChild(loader);

    const scene = document.getElementById('scene-controls');
    scene?.appendChild(saveLoaderContainer);
  }

  // ================
  // User Interface
  // ================
  private createScene() {
    const container = document.createElement('div');
    const sceneDiv = document.createElement('div');
    sceneDiv.id = 'scene-controls';
    sceneDiv.className = 'scene-controls';

    const pauseButton = document.createElement('button');
    pauseButton.innerHTML = `Pause`;
    pauseButton.addEventListener('click', () => {
      console.log('Pause button clicked');
    });

    const playButton = document.createElement('button');
    playButton.innerHTML = `Play`;
    playButton.addEventListener('click', () => {
      console.log('Play button clicked');
      this.start();
    });

    sceneDiv.appendChild(pauseButton);
    sceneDiv.appendChild(playButton);

    document.body.appendChild(sceneDiv);
  }

  private export() {}
}

export default Scene;
