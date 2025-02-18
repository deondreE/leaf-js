import Renderer from './renderer.new';
import { assert } from './utils/index';

console.log('Loading leaf');
class Leaf extends HTMLCanvasElement {
  static observedAttributes = ['src'];
  is3D: boolean = false;
  static: boolean = false;
  renderer: Renderer | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.is3D = this.getOptimisticBoolAttribute('is3D');
    this.static = this.getOptimisticBoolAttribute('static');

    if (!this.hasAttribute('src'))
      return console.warn('leaf canvases rely on src attribute to populate');

    if (this.hasAttribute('src')) {
      if (!this.checkFileType(this.getAttribute('src'))) {
        const funcName: string = this.getAttribute('src')!;
        const global = window as Record<string, any>;
        assert(funcName !== null);

        if (typeof global[funcName] === 'function') {
          let v = global[funcName]();
          console.log(v);
        }
      } else {
        // Render supported static file type.
        this.renderer = new Renderer(this);
        this.renderer.init(this.getAttribute('src'));
      }
    }

    if (!this.renderer && this.is3D) {
      this.id = 'webgpu-canvas';
      // FIXME: Recognize context.
      if (this.hasAttribute('src')) {
        const src = this.getAttribute('src');
      }
    }
  }

  disconectedCallback() {
    console.log('Time to deinitialize the canvas');
  }

  adoptedCallback() {
    console.log('Time to transfer context');
  }

  /** Returns a file type */
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
