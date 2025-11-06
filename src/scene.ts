import type { Model, SceneConfig } from "./types/scene.types";
import EventDispatcher from "./eventdispatcher";
import Renderer3D from "./renderer";
import AnimationSystem from "./animation/AnimationSystem";

/** A Scene is defined as a collection of objects renderd in a single pass. */
class Scene {
  name: string | "" = "";
  canvas: HTMLCanvasElement | null = null;
  uData: any | null = null;
  children: Map<Model, string> = new Map<Model, string>();
  renderer: Renderer3D | null = null;
  eventDispatcher: EventDispatcher | null = null;
  
  private animationSystem: AnimationSystem | null = null;
  private lastFrameTime = 0;
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  constructor(uData: SceneConfig, canvas: HTMLCanvasElement) {
    this.uData = uData;
    if (uData.animations && uData.animations.enabled) {
      this.animationSystem = new AnimationSystem(uData.animations);
    }
    this.canvas = canvas;
    this.eventDispatcher = new EventDispatcher();
  }

  awake(f: () => void) {
    this.eventDispatcher?.on("onAwake", f);
  }

  start(f: () => void) {
    this.eventDispatcher?.on("onStart", f);
  }

  update(f: () => void) {
    this.eventDispatcher?.on("onUpdate", f);
  }

  run() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;

    this.eventDispatcher?.emit("onAwake");
    this.eventDispatcher?.emit("onStart");

    const loop = () => {
      if (!this.isRunning || this.isPaused) return;
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };

    loop();
  }

  pause() {
    this.isPaused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.run(); // will pick up from current state
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    console.log("Scene stopped");
  }

  /**
   * Render is the "true" render call, this will trigger update inside of it.
   */
  render() {
    // console.log("Render");
    // rendering logic would go here
  }

  /** Checks if the current context of the scene is static. */
  private checkStatic(): boolean {
    return true;
  }

  private export() {}
}

export default Scene;
