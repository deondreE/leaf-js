import Renderer from './renderer';
import ParticleRenderer from './renderer.particle';
import Scene from './scene';
import Camera from './camera';
import { assert } from './utils/util';

class Leaf extends HTMLCanvasElement {
  static observedAttributes = ['src', 'particle'];
  is3D: boolean = false;
  isStatic: boolean = false;
  particleSim: boolean = false;
  scene: Scene | null = null;
  renderer: Renderer | null = null;
  camera: Camera | null = null;
  id: string = '';

  constructor() {
    super();
  }

  connectedCallback() {
    this.is3D = this.getOptimisticBoolAttribute('is3D');
    this.isStatic = this.getOptimisticBoolAttribute('static');
    this.particleSim = this.getOptimisticBoolAttribute('particleSim');

    const src = this.getAttribute('src');
    if (!src) {
      console.warn('Leaf canveses rely on "src" attribute to populate.');
    }

    if (this.checkFileType(src!)) {
      this.renderer = new Renderer(this);
      const defaultCamera = new Camera(45, 1.0, 0.1, 100.0, 1.0, 'perspective');
      defaultCamera.setup();
      this.camera = defaultCamera;
      this.renderer.setCamera(defaultCamera);
      this.renderer.init(src!);
    } else {
      const global = window as Record<string, any>;
      const funcName = src;
      assert(funcName !== null);

      const sceneFactory = global[funcName];
      if (typeof sceneFactory === 'function') {
        const sceneInstance = sceneFactory();
        assert(sceneInstance !== null);
        this.scene = sceneInstance;

        if (sceneInstance.camera) {
          const {
            type = 'perspective',
            FOV = 45,
            cameraBounds = 1,
            near = 0.1,
            far = 100,
            zoom = 1,
          } = sceneInstance.camera;
          this.camera = new Camera(FOV, cameraBounds, near, far, zoom, type);
          this.camera.setup();
        }

        if (sceneInstance.particle) {
          // Particles should only render in the given scene, requires some scene level, activation.
          // TODO: Awake events;
        }

        if (!this.renderer) {
          this.renderer = new Renderer(this);
        }

        if (this.camera) {
          this.renderer.setCamera(this.camera);
        }
      }
    }

    if (!this.renderer && this.is3D) {
      this.id = 'webgpu-canvas';
    }

    this.createControls();
  }

  private createControls() {
    const controls = document.createElement('div');
    Object.assign(controls.style, {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '0.5rem',
      position: 'absolute',
      top: '0',
      zIndex: '10',
    });

    const buttons = [
      { label: 'Start', action: () => this.startScene() },
      { label: 'Pause', action: () => this.resumeScene() },
      { label: 'Resume', action: () => this.startScene() },
      { label: 'Stop', action: () => this.startScene() },
    ];

    buttons.forEach(({ label, action }) => {
      const btn = this.createButton(label, action);
      controls.appendChild(btn);
    });

    Object.assign(this, { position: 'relative' });
    this.appendChild(controls);
  }

  private createButton(label: string, handler: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      padding: `0.5rem 1rem`,
      fontSize: '1rem',
      cursor: 'pointer',
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

  disconectedCallback() {
    console.log('Time to deinitialize the canvas');
  }

  adoptedCallback() {
    console.log('Time to transfer context');
  }

  /**
   * The requirements for this would be importing a static file, src="static_file.{supported_file_type}"
   * @internal Returns a file type */
  private checkFileType(possibleFile: string): boolean {
    const parts = possibleFile.split('.');
    if (parts.length < 2) {
      console.warn('Not a valid file type');
      return false;
    }

    const extension = parts.pop()?.toLowerCase() || '';

    switch (extension) {
      case 'obj':
        console.log('Detected OBJ file');
        return true;
      case 'ase':
        console.log('Detected ASE file.');
        return true;
      case 'fbx':
        console.log('Detected FBX');
        return true;
      case 'stl':
        console.log('Detected SDL');
        return true;
      default:
        console.warn('Unsupported file type:', extension);
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
  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown) {
    console.log(`The attribute ${name} changed from ${oldValue} to ${newValue}`);
  }

  /**
   * Just a convenience method to handle bool attributes
   * @param attrName
   */
  private getBoolAttribute(attrName: string): boolean {
    const attr = this.getAttribute(attrName);
    return attr !== null && attr.toLowerCase() !== 'false';
  }

  /**
   * Always returns true unless prop is defined and is false
   * @param attrName
   * @returns
   */
  private getOptimisticBoolAttribute(attrName: string): boolean {
    return this.getAttribute(attrName) !== 'false';
  }
}

customElements.define('leaf-js', Leaf, { extends: 'canvas' });
