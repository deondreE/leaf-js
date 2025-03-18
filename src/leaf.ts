import Renderer from './renderer.new';
import ParticleRenderer from './renderer.particle';
import Scene from './scene';
import { assert } from './utils/util';

/**
 * `Leaf` is a custom HTMLCanvasElement that extends the native HTMLCanvasElement.
 *
 * This class allows for enhanced or customized functionality for canvas elements,
 * providing additional methods or properties specific to the implementation.
 * It can be used like a regular canvas element in HTML, but with added capabilities
 * defined in this class.
 *
 * @extends HTMLCanvasElement
 */
class Leaf extends HTMLCanvasElement {
  static observedAttributes = ['src', 'particle'];
  is3D: boolean = false;
  static: boolean = false;
  particleSim: boolean = false;
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

        // =============
        // Dynamic Scene
        // =============
        if (typeof global[funcName] === 'function') {
          let scene = global[funcName]();
          assert(scene !== null);

          let dynScene = new Scene(scene, this);

          // TODO: Multiple model support. Not sure, maybe appending to the current pipeline.
          // FIXME: Should be able to append to the current scene pipeline.
          if (scene.particle) {
            this.startParticleRenderer(scene.particle);
          }
        }
      } else {
        // Render supported static file type.
        this.renderer = new Renderer(this);
        this.renderer.init(this.getAttribute('src')!);
      }
    }

    if (!this.renderer && this.is3D) {
      this.id = 'webgpu-canvas';
      if (this.hasAttribute('src')) {
        const src = this.getAttribute('src');
      }
    }
  }

  private startParticleRenderer(userParticleData: any) {
    const particleRenderer = new ParticleRenderer(this, userParticleData);
  }

  disconectedCallback() {
    console.log('Time to deinitialize the canvas');
  }

  adoptedCallback() {
    console.log('Time to transfer context');
  }

  checkFileType(possibleFile: string): boolean {
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
