import Renderer from "./renderer";
import ParticleRenderer from "./renderer.particle";
import Scene from "./scene";
import Camera from "./camera";
import { assert } from "./utils/util";
import global from "./types/global";
import {
  SceneConfig,
  SceneFactory,
  SceneObject,
  RandomAnimationType,
} from "./types/scene.types";
import Renderer3D from "./renderer";

/**
 * Global window augmentation for the Leaf engine.
 *
 * This interface extends the built-in `Window` object to include
 * application-specific properties and functions used by Leaf.
 *
 * @remarks
 * This extension is merged with the existing Window interface (it does not override it).
 * To ensure safe merging, keep this inside a module file (add `export {}` at top level).
 *
 * @example
 * ```ts
 * // Usage — user code must define this before the engine initializes.
 * leaf.initScene = () => ({
 *   name: "Demo Scene",
 *   camera: { type: "perspective", FOV: 45 },
 * });
 * ```
 *
 * @see https://developer.mozilla.org/docs/Web/API/Window
 * @see Leaf Engine Dynamic Scene Reference
 */
declare global {
  interface Window {
    /**
     * Initializes and returns a Leaf {@link SceneFactory} configuration.
     *
     * @returns {SceneFactory}
     * A `SceneFactory` object describing cameras, physics, animations,
     * and render parameters for the current scene.
     *
     * @remarks
     * This function is expected to be defined by user-land code
     * and made available before `<leaf-canvas>` or `<canvas is="leaf-js">`
     * elements initialize.
     *
     * The renderer calls this automatically when `src="initScene"` is detected.
     */
    leaf: {
      createScene?: () => SceneFactory;
      start?: () => void;
      stop?: () => void;
      awake?: () => void;
      update?: () => void;
    };
  }
}

class Leaf extends HTMLCanvasElement {
  static observedAttributes = ["src", "particle", "is3D", "static"];

  private renderer: Renderer3D | null = null;
  private scene: Scene | null = null;
  private camera: Camera | null = null;

  private is3D = false;
  private isStatic = false;
  private particleSim = false;

  constructor() {
    super();
  }

  connectedCallback() {
    this.is3D = this.getOptimisticBoolAttribute("is3D");
    this.isStatic = this.getOptimisticBoolAttribute("static");
    this.particleSim = this.getOptimisticBoolAttribute("particleSim");

    const srcAttr = this.getAttribute("src");
    if (!srcAttr) {
      console.warn('[Leaf] Missing "src" attribute on canvas.');
      return;
    }

    if (this.checkFileType(srcAttr)) {
      this.loadFileScene(srcAttr);
    } else {
      this.initializeDynamicScene(srcAttr);
    }

    this.createControls();
  }

  private async initializeDynamicScene(factoryName: string) {
    const sceneFactory = window.leaf?.createScene;

    if (typeof sceneFactory !== "function") {
      console.error(
        `[Leaf] Scene factory "${factoryName}" not found on window.`,
      );
      return;
    }

    const config: any = sceneFactory();
    if (!config) {
      console.error("[Leaf] Invalid SceneConfig returned by initScene().");
      return;
    }

    console.log("[Leaf] Dynamic Scene Config:", config);

    // Set up camera
    const {
      type = "perspective",
      FOV = 45,
      cameraBounds = 1,
      near = 0.1,
      far = 100,
      zoom = 1,
    } = config.camera || {};

    const camera = new Camera(FOV, cameraBounds, near, far, zoom, type);
    camera.setup();
    this.camera = camera;

    // Pick renderer
    this.renderer = new Renderer(this);
    this.renderer.setCamera(camera);
    await this.renderer.init("");

    if (config.objects && config.objects.length > 0) {
      console.log("[Leaf] Instantianting scene objects...");
      for (const obj of config.objects) {
        console.log(obj);
        this.createSceneObject(obj);
      }
    }

    // Launch scene
    this.scene = new Scene(config, this);
    this.scene.awake(() => console.log("[Scene] awake"));
    this.scene.start(() => console.log("[Scene] start"));
    this.scene.update(() => console.log("[Scene] update"));
    this.scene.run();
  }

  private async createSceneObject(obj: SceneObject) {
    const count = obj.amount ?? 1;

    for (let i = 0; i < count; ++i) {
      const x = obj.random_spawn_pos
        ? (Math.random() - 0.5) * 100
        : (obj.startPos?.x ?? 0);
      const y = obj.random_spawn_pos
        ? Math.random() * 50
        : (obj.startPos?.y ?? 0);
      const z = obj.random_spawn_pos
        ? (Math.random() - 0.5) * 100
        : (obj.startPos?.z ?? 0);

      const color = obj.color_random
        ? { r: Math.random(), g: Math.random(), b: Math.random(), a: 1 }
        : (obj.color ?? {
            r: 220,
            g: 1,
            b: 1,
            a: 1,
          });

      // Object Type
      switch (obj.shape) {
        case "box":
          await this.renderer?.createPrimitive("box");
          break;
        case "sphere":
          await this.renderer?.createPrimitive("sphere");
          break;
        case "torus":
          await this.renderer?.createPrimitive("torus");
          break;
        case "cone":
          await this.renderer?.createPrimitive("cone");
          break;
      }

      if (obj.random_animation) {
        this.applyRandomAnimation(obj.random_animation.type, { x, y, z });
      }
    }
  }

  private applyRandomAnimation(
    type: RandomAnimationType,
    pos: { x: number; y: number; z: number },
  ) {
    switch (type) {
      case "rotation":
        console.log(`[Leaf] rotating object at`, pos);
        break;
      case "bounce":
        console.log(`[Leaf] bouncing object at`, pos);
        break;
      case "collide":
        console.log(`[Leaf] collision animation at`, pos);
        break;
    }
  }

  private loadFileScene(src: string) {
    console.log(`[Leaf] Loading static scene from file: ${src}`);

    this.renderer = new Renderer(this);

    const aspect = this.width / this.height;
    const camera = new Camera(45, aspect, 0.1, 100.0, 1.0, "perspective");
    camera.setup();

    this.camera = camera;
    this.renderer.setCamera(camera);
    this.renderer.init(src);
  }

  private createControls() {
    const controls = document.createElement("div");
    Object.assign(controls.style, {
      display: "flex",
      gap: "0.5rem",
      marginTop: "0.5rem",
      position: "absolute",
      top: "0",
      zIndex: "10",
    });

    const buttons = [
      { label: "Start", action: () => this.startScene() },
      { label: "Pause", action: () => this.resumeScene() },
      { label: "Resume", action: () => this.startScene() },
      { label: "Stop", action: () => this.startScene() },
    ];

    buttons.forEach(({ label, action }) => {
      const btn = this.createButton(label, action);
      controls.appendChild(btn);
    });

    Object.assign(this, { position: "relative" });
    this.appendChild(controls);
  }

  private createButton(label: string, handler: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    Object.assign(btn.style, {
      padding: `0.5rem 1rem`,
      fontSize: "1rem",
      cursor: "pointer",
    });

    btn.onclick = handler;
    return btn;
  }

  startScene() {
    this.scene?.run();
  }

  pauseScene() {
    this.scene?.pause();
  }

  resumeScene() {
    this.scene?.resume();
  }

  stopScene() {
    this.scene?.stop();
  }

  disconnectedCallback() {
    console.log("[Leaf] Disconnected: cleanup logic here if needed.");
  }

  adoptedCallback() {
    console.log("Time to transfer context");
  }

  /**
   * The requirements for this would be importing a static file, src="static_file.{supported_file_type}"
   * @internal Returns a file type */
  private checkFileType(possibleFile: string): boolean {
    const parts = possibleFile.split(".");
    if (parts.length < 2) {
      console.warn("Not a valid file type");
      return false;
    }

    const extension = parts.pop()?.toLowerCase() || "";

    switch (extension) {
      case "obj":
        console.log("Detected OBJ file");
        return true;
      case "ase":
        console.log("Detected ASE file.");
        return true;
      case "fbx":
        console.log("Detected FBX");
        return true;
      case "stl":
        console.log("Detected SDL");
        return true;
      default:
        console.warn("Unsupported file type:", extension);
        return false;
    }
  }

  /**
   * Anytime a value changed. Unfortunately the attributeChangedCallback doesnt know what the type is accepting as unknown allows for simple coercion.
   *
   * @param name
   * @param oldValue
   * @param newValue
   */
  attributeChangedCallback(name: string, oldVal: unknown, newVal: unknown) {
    console.log(
      `[Leaf] Attribute "${name}" changed from ${oldVal} to ${newVal}`,
    );
  }

  /**
   * Just a convenience method to handle bool attributes
   * @param attrName
   */
  private getBoolAttribute(attrName: string): boolean {
    const attr = this.getAttribute(attrName);
    return attr !== null && attr.toLowerCase() !== "false";
  }

  /**
   * Always returns true unless prop is defined and is false
   * @param attrName
   * @returns
   */
  private getOptimisticBoolAttribute(attrName: string): boolean {
    return this.getAttribute(attrName) !== "false";
  }
}

customElements.define("leaf-js", Leaf, { extends: "canvas" });
