import Renderer from './renderer';

console.log('Loading leaf');
class Leaf extends HTMLCanvasElement {
  static observedAttributes = ['src'];
  is3D: boolean = false;
  static: boolean = false;
  renderer: Renderer | null = null;

  constructor() {
    console.log('Starting');
    super();
  }

  async initRenderer() {
    this.renderer = await Renderer.init({ canvas: this });
    this.renderer.render();
  }

  connectedCallback() {
    this.is3D = this.getOptimisticBoolAttribute('is3D');
    this.static = this.getOptimisticBoolAttribute('static');

    if (!this.hasAttribute('src'))
      return console.warn('leaf canvases rely on src attribute to populate');

    if (!this.renderer && this.is3D) {
      this.id = 'webgpu-canvas';
      queueMicrotask(async () => {
        this.renderer = await Renderer.init({ canvas: this });
        this.renderer.render();
      });
    }
  }

  disconectedCallback() {
    console.log('Time to deinitialize the canvas');
  }

  adoptedCallback() {
    console.log('Time to transfer context');
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
