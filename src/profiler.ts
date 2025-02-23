import { Y } from 'vitest/dist/chunks/reporters.DTtkbAtP.js';
import { assert } from './utils/util';

export interface LProfilerProps {
  targetId?: string;
}

// TODO: add profiling for visualizing bounding boxes.

/*
 * Profiler is a web component built for understanding the performance of the canvas specifically.
 * */
export class Profiler extends HTMLCanvasElement {
  static observedAttributes = ['target-id', 'width', 'height'];
  targetCanvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  frameTimes: number[] = [];
  memoryUsage: number[] = [];
  lastFrameNumber: number = performance.now();
  tracking = false;
  paused = false;
  showBoundingBoxes = true;
  type: '2d' | 'gpu' = '2d';
  boundingBoxes: { x: number; y: number; width: number; height: number }[] = [];

  constructor() {
    super();
  }

  connectedCallback() {
    this.id = 'profiler-canvas';
    this.ctx = this.getContext('2d');
    this.updateTarget();
    requestAnimationFrame(() => this.trackFrame());
  }

  disconnectedCallback() {
    console.log('Profiler canvas removed.');
  }

  adoptedCallback() {
    console.log('Profiler canvas moved to a new document.');
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === 'target-id') {
      this.updateTarget();
    }
  }

  updateTarget() {
    const targetId = this.getAttribute('target-id');
    if (targetId) {
      this.targetCanvas = document.getElementById(targetId) as HTMLCanvasElement;
    }
    if (this.targetCanvas) {
      console.log(`Profiler Monitoring: ${targetId}`);
      this.hookCanvas();
    } else {
      console.warn(`Profiler: No canvas found with id ${targetId}`);
    }
  }

  hookCanvas() {
    if (!this.targetCanvas) return;

    const targetCtx = this.targetCanvas.getContext('webgpu');
    if (!targetCtx) {
      console.warn('Profiler: Unable to hook into canvas context.');
      return;
    }

    const start = performance.now();
    let frameCount = 0;

    const monitorFrame = () => {
      if (this.paused) return requestAnimationFrame(monitorFrame); // Skip

      ++frameCount;
      const now = performance.now();
      const elapsed = now - start;

      if (elapsed >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        this.lastFrameNumber = now;
        this.frameTimes.push(fps);
        if (this.frameTimes.length > 100) this.frameTimes.shift();

        this.trackMemory();
        this.render();
      }

      requestAnimationFrame(monitorFrame);
    };

    monitorFrame();

    // @ts-ignore
    const originalDrawImage = targetCtx.drawImage;
    // @ts-ignore
    const originalClearRect = targetCtx.clearRect;
    // @ts-ignore
    targetCtx.drawImage = function (...args) {
      originalDrawImage.apply(this, args);
      this.trackFrame();
    };
    // @ts-ignore
    targetCtx.clearRect = (...args: any[]) => {
      originalClearRect.apply(targetCtx, args);
      this.trackFrame();
    };

    requestAnimationFrame(() => this.trackFrame());
  }

  trackMemory() {
    // FIXME: perfomance.memory is techinically being deprecated.
    // @ts-ignore
    if (performance.memory) {
      // @ts-ignore
      const memInfo = performance.memory;
      const usedMemoryMB = memInfo.usedJSHeapSize;

      this.memoryUsage.push(usedMemoryMB);
      if (this.memoryUsage.length > 100) this.memoryUsage.shift();
    }
  }

  trackFrame() {
    if (this.paused) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameNumber;
    this.lastFrameNumber = now;

    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > 100) {
      this.frameTimes.shift();
    }

    this.render();
  }

  /** Takes the list of frames iterates them in a canvas as key-frames; */
  renderAnimationFrames(ctx: CanvasRenderingContext2D) {
    let animationFrame: any[] = [1, 1, 1, 1, 1, 1, 1];
    let padding: number = 10;
    let startX = padding + 2;
    let startY = this.height - 150 / 1.5;
    let radius = 3;

    ctx.fillStyle = 'white';
    ctx.fillText('Animation Key Frames', padding + 5, this.height - 160);


    ctx.strokeStyle = 'yellow';
    ctx.strokeRect(0 + padding, this.height - 150, (this.width - padding*2), 100);

    // render the frame
    for (let i = 0; i < animationFrame.length; ++i) {
      const x = startX + i * (2 * radius + padding) + 10;
      ctx.beginPath();
      ctx.arc(x, startY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
    }
  }

  // FIXME: I would love certain sections to be toggable, by the end user.
  render() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, this.width, this.height);

    const maxFrameTime = Math.max(...this.frameTimes, 16.67);
    const scaleY = this.height / (maxFrameTime * 1.2);

    ctx.strokeStyle = this.paused ? 'gray' : 'lime';
    ctx.beginPath();

    for (let i = 0; i < this.frameTimes.length; ++i) {
      const x = (i / this.frameTimes.length) * this.width;
      const y = this.height - this.frameTimes[i] * scaleY;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (this.memoryUsage.length > 0) {
      ctx.strokeStyle = 'orange';
      ctx.beginPath();
      const maxMemory = Math.max(...this.memoryUsage, 10);
      const scaleYMem = this.height / (maxMemory * 1.2);

      for (let i = 0; i < this.memoryUsage.length; ++i) {
        const x = (i / this.memoryUsage.length) * this.width;
        const y = this.height - this.memoryUsage[i] * scaleYMem;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    this.renderAnimationFrames(ctx);

    ctx.fillStyle = 'green';
    ctx.font = '12px Arial';
    ctx.fillText(this.paused ? 'PAUSED' : `Max Frame Time: ${maxFrameTime.toFixed(2)}ms`, 10, 15);

    if (this.memoryUsage.length > 0) {
      ctx.fillStyle = 'orange';
      const latestMemory = this.memoryUsage[this.memoryUsage.length - 1];
      ctx.fillText(`Memory Usage: ${latestMemory} MB`, 10, 30);
    }
  }

  BB() {
    this.showBoundingBoxes = !this.showBoundingBoxes;
    this.render();
  }

  pause() {
    this.paused = true;
    this.render();
  }

  resume() {
    this.paused = false;
    requestAnimationFrame(() => this.trackFrame());
  }
}

customElements.define('l-profiler', Profiler, { extends: 'canvas' });
