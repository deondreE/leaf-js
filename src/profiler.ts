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
  fpsValues: number[] = []; // To store FPS values
  memoryUsage: number[] = [];
  lastFrameTime: number = performance.now(); // Renamed for clarity
  tracking = false;
  paused = false;
  showBoundingBoxes = true;
  type: '2d' | 'gpu' = '2d';
  boundingBoxes: { x: number; y: number; width: number; height: number }[] = [];

  // Animation frame visualization specific properties
  animationFrameProgress: number = 0;
  animationFrameCount: number = 0;
  lastAnimationUpdateTime: number = performance.now();

  constructor() {
    super();
  }

  connectedCallback() {
    this.id = 'profiler-canvas';
    this.ctx = this.getContext('2d');
    this.updateTarget();
    // No need for an initial requestAnimationFrame here, hookCanvas will handle monitoring
  }

  disconnectedCallback() {
    console.log('Profiler canvas removed.');
  }

  adoptedCallback() {
    console.log('Profiler canvas moved to a new document.');
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    if (name === 'target-id') {
      this.updateTarget();
    }
  }

  updateTarget() {
    const targetId = this.getAttribute('target-id');
    if (targetId) {
      this.targetCanvas = document.getElementById(
        targetId,
      ) as HTMLCanvasElement;
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

    // We need to decide which context to hook. For now, let's assume '2d' as 'webgpu' isn't standard context.
    // If it's truly webgpu, the profiling will be different.
    const targetCtx =
      this.targetCanvas.getContext('2d') ||
      this.targetCanvas.getContext('webgl') ||
      this.targetCanvas.getContext('webgl2');

    if (!targetCtx) {
      console.warn('Profiler: Unable to hook into canvas context.');
      return;
    }

    let frameCount = 0;
    let lastFPSCheckTime = performance.now();

    const monitorFrame = () => {
      if (this.paused) return requestAnimationFrame(monitorFrame);

      ++frameCount;
      const now = performance.now();
      const elapsed = now - lastFPSCheckTime;

      if (elapsed >= 1000) {
        // Every second, calculate FPS and update
        const fps = frameCount;
        frameCount = 0;
        lastFPSCheckTime = now;

        this.fpsValues.push(fps);
        if (this.fpsValues.length > 100) this.fpsValues.shift(); // Keep last 100 seconds

        this.trackMemory();
        this.render(); // Re-render after a second to update FPS/memory
      }

      // Track individual frame times
      const deltaTime = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.frameTimes.push(deltaTime);
      if (this.frameTimes.length > 100) {
        this.frameTimes.shift();
      }

      // Update animation progress for visual effect
      this.animationFrameCount++;
      const animationElapsed = now - this.lastAnimationUpdateTime;
      if (animationElapsed > 50) { // Update animation progress every 50ms
        this.animationFrameProgress = (this.animationFrameProgress + 0.1) % 1;
        this.lastAnimationUpdateTime = now;
      }

      // Ensure rendering happens on every frame update, not just every second for FPS/Memory
      this.render();

      requestAnimationFrame(monitorFrame);
    };

    // Original drawing methods for 2D context
    // @ts-ignore - We are patching native methods
    const originalFillRect = targetCtx.fillRect;
    // @ts-ignore
    const originalStrokeRect = targetCtx.strokeRect;
    // @ts-ignore
    const originalDrawImage = targetCtx.drawImage;
    // @ts-ignore
    const originalClearRect = targetCtx.clearRect;

    // Patching methods to track when drawing occurs.
    // Note: This approach might not capture all rendering activities,
    // especially if direct pixel manipulation or other methods are used.
    // It also adds overhead to every drawing call.
    if (targetCtx instanceof CanvasRenderingContext2D) {
      // @ts-ignore
      targetCtx.fillRect = (...args) => {
        originalFillRect.apply(targetCtx, args);
        // We're already monitoring frames in `monitorFrame`, no need to call trackFrame here too
      };
      // @ts-ignore
      targetCtx.strokeRect = (...args) => {
        originalStrokeRect.apply(targetCtx, args);
      };
      // @ts-ignore
      targetCtx.drawImage = (...args) => {
        originalDrawImage.apply(targetCtx, args);
      };
      // @ts-ignore
      targetCtx.clearRect = (...args: any[]) => {
        originalClearRect.apply(targetCtx, args);
      };
    } else {
      console.warn(
        'Profiler: Context is not 2D. Method patching may not be effective.',
      );
      // For WebGL/WebGPU, you'd typically look for `requestAnimationFrame` calls or
      // instrument `gl.present()` or command buffer submissions.
    }

    monitorFrame(); // Start the monitoring loop
  }

  trackMemory() {
    // FIXME: performance.memory is technically being deprecated.
    // Use window.performance.memory for now, as it's still widely available
    // and provides useful approximate data. For more accurate data, one would
    // need to use browser-specific dev tools APIs or WASM memory reporting.
    // @ts-ignore
    if (performance.memory) {
      // @ts-ignore
      const memInfo = performance.memory;
      // usedJSHeapSize is in bytes, convert to MB
      const usedMemoryMB = (memInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2);

      this.memoryUsage.push(parseFloat(usedMemoryMB));
      if (this.memoryUsage.length > 60) this.memoryUsage.shift(); // Keep last 60 seconds (assuming 1 update/sec)
    }
  }

  /**
   * Renders the main performance graph (frame times).
   * @param ctx The 2D rendering context.
   */
  renderFrameTimeGraph(ctx: CanvasRenderingContext2D) {
    const graphHeight = this.height * 0.5; // Use top half for frame time
    const graphYOffset = 0;

    const maxFrameTime = Math.max(...this.frameTimes, 16.67); // Include 60fps target
    const scaleY = graphHeight / (maxFrameTime * 1.2); // Scale to fit, with some padding

    ctx.strokeStyle = this.paused ? '#666' : '#00ff00'; // Gray when paused, otherwise green
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    if (this.frameTimes.length > 0) {
      ctx.moveTo(0, graphYOffset + graphHeight - this.frameTimes[0] * scaleY);
      for (let i = 0; i < this.frameTimes.length; ++i) {
        const x = (i / this.frameTimes.length) * this.width;
        const y = graphYOffset + graphHeight - this.frameTimes[i] * scaleY;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw 16.67ms (60 FPS) line
    const targetFPSLineY =
      graphYOffset + graphHeight - 16.67 * scaleY;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // White dashed line
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, targetFPSLineY);
    ctx.lineTo(this.width, targetFPSLineY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Text labels
    ctx.fillStyle = '#00ff00'; // Green for frame time
    ctx.font = '12px Arial';
    ctx.fillText(
      `Frame Time (ms) - Max: ${maxFrameTime.toFixed(2)}`,
      10,
      graphYOffset + 15,
    );
    ctx.fillText('16.67ms (60 FPS)', 10, targetFPSLineY - 5);

    if (this.fpsValues.length > 0) {
      const latestFPS = this.fpsValues[this.fpsValues.length - 1];
      ctx.fillText(`FPS: ${latestFPS}`, 10, graphYOffset + 30);
    }
  }

  /**
   * Renders the memory usage as a bar chart.
   * @param ctx The 2D rendering context.
   */
  renderMemoryUsageGraph(ctx: CanvasRenderingContext2D) {
    const graphHeight = this.height * 0.3; // Use a portion for memory
    const graphYOffset = this.height * 0.55; // Position below frame time graph

    ctx.fillStyle = '#1a1a1a'; // Dark background for this section
    ctx.fillRect(0, graphYOffset, this.width, graphHeight);

    // Draw a border for the memory graph section
    ctx.strokeStyle = '#333';
    ctx.strokeRect(0, graphYOffset, this.width, graphHeight);

    const maxMemory = Math.max(...this.memoryUsage, 50); // Minimum 50MB for scaling
    const barWidth = this.width / this.memoryUsage.length;
    const scaleY = graphHeight / (maxMemory * 1.2);

    ctx.fillStyle = '#ff8c00'; // Orange for memory bars
    for (let i = 0; i < this.memoryUsage.length; ++i) {
      const barHeight = this.memoryUsage[i] * scaleY;
      const x = i * barWidth;
      const y = graphYOffset + graphHeight - barHeight;
      ctx.fillRect(x, y, barWidth * 0.8, barHeight); // Slightly narrower bars
    }

    // Text labels
    ctx.fillStyle = '#ff8c00'; // Orange for memory
    ctx.font = '12px Arial';
    ctx.fillText('Memory Usage (MB)', 10, graphYOffset + 15);

    if (this.memoryUsage.length > 0) {
      const latestMemory = this.memoryUsage[this.memoryUsage.length - 1];
      ctx.fillText(`Current: ${latestMemory.toFixed(2)} MB`, 10, graphYOffset + 30);
    }
  }

  /**
   * Renders a conceptual animation frame progress visualization.
   * @param ctx The 2D rendering context.
   */
  renderAnimationFrameVisualization(ctx: CanvasRenderingContext2D) {
    const sectionHeight = this.height * 0.1;
    const sectionYOffset = this.height * 0.9;

    ctx.fillStyle = '#0a0a0a'; // Even darker background
    ctx.fillRect(0, sectionYOffset, this.width, sectionHeight);

    ctx.strokeStyle = '#333';
    ctx.strokeRect(0, sectionYOffset, this.width, sectionHeight);

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText('Animation Frame Progress', 10, sectionYOffset + 15);

    // Simple progress bar
    const barPadding = 20;
    const barWidth = this.width - barPadding * 2;
    const barHeight = 10;
    const barX = barPadding;
    const barY = sectionYOffset + sectionHeight - barHeight - 10;

    ctx.strokeStyle = '#444';
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = '#00ffff'; // Cyan for progress
    ctx.fillRect(barX, barY, barWidth * this.animationFrameProgress, barHeight);

    ctx.fillStyle = 'white';
    ctx.fillText(
      `Frames Rendered: ${this.animationFrameCount}`,
      barX,
      barY - 5,
    );
  }

  // FIXME: I would love certain sections to be togglable, by the end user.
  render() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'black'; // Overall background
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderFrameTimeGraph(ctx);
    this.renderMemoryUsageGraph(ctx);
    this.renderAnimationFrameVisualization(ctx);

    // Global status text
    ctx.fillStyle = this.paused ? 'gray' : 'white';
    ctx.font = '14px Arial';
    ctx.fillText(this.paused ? 'PAUSED' : 'RUNNING', this.width - 80, 20);
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
    // When resuming, restart the monitorFrame loop
    if (this.targetCanvas) {
      this.hookCanvas();
    } else {
      // If no target canvas, just call render
      this.render();
    }
  }
}

customElements.define('l-profiler', Profiler, { extends: 'canvas' });