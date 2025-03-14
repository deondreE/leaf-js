import Renderer3D from './renderer.new';
import type { Model } from './types/scene.types';
import EventDispatcher from './eventdispatcher';

// NOTE: you can define a large pipeline, and there is a clean step that removes most of the unused garbage.

/** A Scene is defined as a collection of objects renderd in a single pass. */
class Scene {
  name: string | '' = '';
  canvas: HTMLCanvasElement | null = null;
  uData: any | null = null;
  children: Map<Model, string> = new Map<Model, string>();
  renderer: Renderer3D | null = null;
  eventDispatcher: EventDispatcher | null = null;

  constructor(uData: any, canvas: HTMLCanvasElement) {
    this.uData = uData;
    this.canvas = canvas;
    this.renderer = new Renderer3D(canvas);
    this.eventDispatcher = new EventDispatcher();

    this.processUserData(uData);
    this.createScene();
  }

  awake(f: () => {}) {
    this.eventDispatcher?.on('onAwake', () => {
      console.log('Awake');
    });
  }

  /** Start is called after awake. */
  start() {
    this.eventDispatcher?.on('onStart', () => {
      console.log('test');
      this.saveModelData(this.uData);
      // TODO: cache the given sceneData, so we don't request for it every frame.
    });
  }

  /** Update is called everyframe based on deltatime.
   * @param dt is the time in between frames.
   */
  update(dt: number) {
    this.eventDispatcher?.on('onUpdate', () => {
      console.log('Update');
    });
  }

  /**
   * Render is the "true" render call, this will trigger update inside of it.
   */
  render() {
    let dt = 120 / 0.1;
    this.update(dt);
  }

  // FIXME: Add Types for both Udata, And Model
  // TOOD: Add Play, Pause Buttons for playing custom animations.
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
      );
    } else {
      this.renderer?.primitiveCube();
    }
  }

  private saveModelData(uData: any): void {
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

  // FIXME: All additions to the HTML here should be appended to the canvas.
  private showSaveLoader() {
    console.log('Showing Loader');

    const saveLoaderContainer = document.createElement('div');
    saveLoaderContainer.className = 'save-loader';

    const loader = document.createElement('div');
    loader.className = 'loader';

    saveLoaderContainer.appendChild(loader);

    const scene = document.getElementById('scene-controls');
    scene?.appendChild(saveLoaderContainer);
  }

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
