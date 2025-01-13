import Renderer from './renderer';
import './style.css'
import { Model } from './types/scene.types';

async function start() {
  const models: Model[] = [
    {
      name: "Square Model",
      type: "square", // Type can be "square", "circle", or "custom"
      size: { w: 100, h: 100 },
      id: 0,
      position: undefined,
      verticies: undefined,
      shaders: [],
      startAnimation: false,
      applyTransformation: function (type: 'scale' | 'rotate' | 'translate', value: { x: number; y: number; z: number; }): void {
        throw new Error('Function not implemented.');
      }
    },
    {
      name: "Square Model",
      type: "square", // Type can be "square", "circle", or "custom"
      size: { w: 100, h: 100 },
      id: 0,
      position: undefined,
      verticies: undefined,
      shaders: [],
      startAnimation: false,
      applyTransformation: function (type: 'scale' | 'rotate' | 'translate', value: { x: number; y: number; z: number; }): void {
        throw new Error('Function not implemented.');
      }
    },
  ];
  
  const renderer = new Renderer({ models });
  await renderer.init();  // Initializes WebGPU and sets up the canvas

  renderer.render(); 
}

start();