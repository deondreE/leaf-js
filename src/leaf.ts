import Renderer from './renderer.new';
import ParticleRenderer from './renderer.particle';
import Scene from './scene';
import { assert } from './utils/util';

class Leaf extends HTMLCanvasElement {
  static observedAttributes = ['src', 'particle'];
  is3D: boolean = false;
  static: boolean = false;
  particleSim: boolean = false;
  scene: Scene | null = null;
  renderer: Renderer | null = null;
  id: string = '';

  constructor() {
    super();
  }

  connectedCallback() {
    this.is3D = this.getOptimisticBoolAttribute('is3D');
    this.static = this.getOptimisticBoolAttribute('static');
    this.particleSim = this.getOptimisticBoolAttribute('particleSim');

    if (!this.hasAttribute('src'))
      return console.warn('leaf canvases rely on src attribute to populate');

    if (this.hasAttribute('src')) {
      if (!this.checkFileType(this.getAttribute('src')!)) {
        const funcName: string = this.getAttribute('src')!;
        const global = window as Record<string, any>;
        assert(funcName !== null);

        // Objective Scene -- Think game engine.
        if (typeof global[funcName] === 'function') {
          let scene = global[funcName]();
          assert(scene !== null);

          if (scene.particle) {
            // Particles should only render in the given scene, requires some scene level, activation.
            // TODO: Awake events;
          }
        }
      } else {
        this.renderer = new Renderer(this);
        this.renderer.init(this.getAttribute('src')!);
      }

      // create button container
      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.gap = '0.5rem';
      controls.style.marginTop = '0.5rem';
      controls.style.position = 'absolute';
      controls.style.top = '0';

      const startBtn = this.createButton('Start', () => this.startScene());
      const pauseBtn = this.createButton('Pause', () => this.startScene());
      const resumeBtn = this.createButton('Resume', () => this.startScene());
      const stopBtn = this.createButton('Stop', () => this.startScene());

      controls.append(startBtn, pauseBtn, resumeBtn, stopBtn);
      this.insertAdjacentElement('afterend', controls);
    }

    if (!this.renderer && this.is3D) {
      this.id = 'webgpu-canvas';
      if (this.hasAttribute('src')) {
        const src = this.getAttribute('src');
      }
    }
  }

  private createButton(label: string, handler: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.padding = '0.5rem 1rem';
    btn.style.fontSize = '1rem';
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
