export interface StageProps {
  src?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * The stage is just a custom canvas based web component we can use to control typing and properties in a declarative way from html
 * This also reduces setup as we can set our own id identifier if necessary however we also have direct access to the node without querying the dom.
 *
 * Web components are very widely accepted and in addition to being usable without direct import. Web components can be represented in html in SSR allowing for usage in any html/js context.
 */
class Stage extends HTMLCanvasElement {
  /**
   * Here we can define properties we pay attention to
   *
   * these are just examples for now
   */
  static observedAttributes = ['type', 'width', 'height'];
  type: '2d' | '3d';
  connectedCallback() {
    this.id = 'webgpu-canvas';
    console.log('Time to initialize the canvas');
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
}

customElements.define('stage', Stage);
