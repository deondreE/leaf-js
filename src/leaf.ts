import { Scene2dConfiguration, Renderer2d, Scene2d } from './2d';
import Renderer from './renderer.new';
import { assert, findGlobalFunc } from './utils/util';

console.log('Loading leaf');
class Leaf extends HTMLCanvasElement {
  static observedAttributes = ['src'];
  is3D: boolean = false;
  static: boolean = false;
  renderer: Renderer | Renderer2d | null = null;


  connectedCallback() {
    this.is3D = this.getOptimisticBoolAttribute('is3D');
    this.static = this.getOptimisticBoolAttribute('static');

    const src = this.getAttribute('src');
    if(!src) throw new Error("Canvases rely on the src attribute to work");

    if (this.hasAttribute('src')) {
      if (!this.checkFileType(src)) {
        const fn = findGlobalFunc<()=>Scene2dConfiguration | object>(src);
        assert(!!fn, "No src function found");
        const config = fn();
        if(!this.is3D){
          const scene = new Scene2d(this, config as Scene2dConfiguration);
          this.renderer = new Renderer2d(this, scene.render);
          this.renderer.start();
        }
      } else {
        // Render supported static file type.
        this.renderer = new Renderer(this);
        this.renderer.init(src);
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
    const ext = possibleFile.match(/\.[^\.]*$/);
    if(!ext) return false;
    const extension = ext[0].slice(1).toLowerCase();
    
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
      case 'ase':
      case 'aseprite':
        console.log("Detected aseprite");
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