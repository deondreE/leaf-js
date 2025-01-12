import { assert } from "./utils/util";

class Renderer {
    constructor() {}

    async init() {
        if (navigator.gpu === undefined) {
            const h = document.querySelector('#title') as HTMLElement;
            h.innerHTML = 'WebGPU is not supported in this browser';
            return;
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter === null) {
            const h = document.querySelector('#title') as HTMLElement;
            h.innerHTML = 'No adapter is availible for WebGPU';
            return;
        }
        const device = await adapter.requestDevice();
    
        // Setup resize observer.
        const canvas = document.querySelector<HTMLCanvasElement>('#webgpu-canvas');
        assert(canvas != null);
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        });
        observer.observe(canvas);
        const context = canvas.getContext('webgpu') as GPUCanvasContext;
        const presenstationFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device,
            format: presenstationFormat,
            alphaMode: 'opaque',
        });
    }
};