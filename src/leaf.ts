import Renderer2d from './2d/renderer';
import Scene2d from './2d/scene';
import Renderer from './renderer.new';
import { assert, findGlobalFunction } from './utils/index';

export type LeafConfig = {};
class Leaf extends HTMLCanvasElement {
  static observedAttributes = ['onleaf-load'];
  is3D: boolean = false;
  static: boolean = false;
  renderer: Renderer | Renderer2d | null = null;
  scene: Scene2d | null = null;
  id: string;

  constructor() {
    super();
  }

  connectedCallback() {
    this.is3D = this.getOptimisticBoolAttribute('is3D');
    this.static = this.getOptimisticBoolAttribute('static');

    const src = this.getAttribute('src');
    if (!src) return console.warn('leaf canvases rely on src attribute to populate');
    if (!this.checkFileType(src)) {
      const fn = findGlobalFunction<() => LeafConfig | undefined | void>(src);
      if (fn) {
        const config = fn(); //i havent built any support for this... thats next
        if (!this.is3D) {
          this.scene = new Scene2d(this);
          this.renderer = new Renderer2d(this, this.scene.render);
          //this next bit should be performed after the conditional once the scene has been
        } else {
          console.warn('3d scene not yet implemented');
          this.renderer = new Renderer(this);
        }
      }
    }
    if (this.hasAttribute('src')) {
      if (!this.checkFileType(this.getAttribute('src'))) {
        const funcName: string = this.getAttribute('src')!;
        const global = window as Record<string, any>;
        assert(funcName !== null, 'No startup function found');

        if (typeof global[funcName] === 'function') {
          let v = global[funcName]();
          console.log(v);
        }
      } else {
        const fileName = this.getAttribute('src');
        if (fileName.endsWith('ase') || fileName.endsWith('aseprite')) {
          const scene = new Scene2d(this);
          this.renderer = new Renderer2d(this, scene.render);
        }
        // Render supported static file type.
        this.renderer = new Renderer(this);
        this.renderer.init(fileName);
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
    const ext = possibleFile.match(/\.[^\.]*$/); //dont care about number of . in file . notation is common in a file
    if (!ext) return false;
    const extension = ext[0];

    switch (extension) {
      case '.obj':
        console.log('Detected OBJ file');
        return true;
      case '.fbx':
        console.log('Detected FBX');
        return true;
      case '.stl':
        console.log('Detected STL');
        return true;
      case '.aseprite':
      case '.ase':
        console.log('Detected aseprite');
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
    if (name.startsWith('on')) {
      console.log(window);
      if (oldValue) {
        console.log('old event value', oldValue);
        this.removeEventListener(name.slice(2), oldValue as () => void);
      }
      if (newValue) {
        const fn = findGlobalFunction(newValue as string);
        assert(!!fn, `Event handler not found - ${name} : ${newValue}`);
        this.addEventListener(name.slice(2), fn as () => void);
      }
    }
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
