import { Y } from "vitest/dist/chunks/reporters.DTtkbAtP.js";
import { assert } from "./utils/util";

export interface LProfilerProps {
  targetId?: string;
}

// TODO: add profiling for visualizing bounding boxes.

interface CallStackEvent {
  type: string;
  timestamp: number;
  args: any[];
}

/*
 * Profiler is a web component built for understanding the performance of the canvas specifically.
 * */
export class Profiler extends HTMLCanvasElement {
  static observedAttributes = ["target-id", "width", "height"];
  targetCanvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  frameTimes: number[] = [];
  fpsValues: number[] = []; // To store FPS values
  memoryUsage: number[] = [];
  lastFrameTime: number = performance.now(); // Renamed for clarity
  tracking = false;
  paused = false;
  showBoundingBoxes = true;
  type: "2d" | "gpu" = "2d";
  boundingBoxes: { x: number; y: number; width: number; height: number }[] = [];

  animationFrameProgress: number = 0;
  animationFrameCount: number = 0;
  lastAnimationUpdateTime: number = performance.now();

  private _currentTab: "performance" | "callstack" = "performance";
  displayCallStack: boolean = true; // Flag to toggle call stack display
  callStackEvents: CallStackEvent[] = [];
  callStackScrollOffset: number = 0; // New: Vertical scroll offset for the call stack

  constructor() {
    super();
  }

  connectedCallback() {
    this.id = "profiler-canvas";
    this.ctx = this.getContext("2d");
    this.updateTarget();

    // Add event listeners for tab switching
    this.addEventListener("click", (event) => {
      // Get mouse position relative to the canvas
      const rect = this.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const tabHeight = 30;
      const tabWidth = this.width / 2;
      const tabY = 0;

      // Check if click is within the tab area
      if (y >= tabY && y <= tabY + tabHeight) {
        if (x >= 0 && x < tabWidth) {
          // Clicked on Performance tab
          this.switchTab("performance");
        } else if (x >= tabWidth && x < this.width) {
          // Clicked on Call Stack tab
          this.switchTab("callstack");
        }
      }
    });

    // New: Add mouse wheel listener for scrolling the call stack
    this.addEventListener("wheel", this.handleScroll.bind(this), {
      passive: false,
    });
  }

  disconnectedCallback() {
    console.log("Profiler canvas removed.");
    // Remove event listener to prevent memory leaks
    this.removeEventListener("wheel", this.handleScroll.bind(this)); // Ensure same bound function is removed
  }

  adoptedCallback() {
    console.log("Profiler canvas moved to a new document.");
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    if (name === "target-id") {
      this.updateTarget();
    }
  }

  updateTarget() {
    const targetId = this.getAttribute("target-id");
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

    const targetCtx =
      this.targetCanvas.getContext("2d") ||
      this.targetCanvas.getContext("webgl") ||
      this.targetCanvas.getContext("webgl2");

    if (!targetCtx) {
      console.warn("Profiler: Unable to hook into canvas context.");
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
      if (animationElapsed > 50) {
        // Update animation progress every 50ms
        this.animationFrameProgress = (this.animationFrameProgress + 0.1) % 1;
        this.lastAnimationUpdateTime = now;
      }

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

    if (targetCtx instanceof CanvasRenderingContext2D) {
      // @ts-ignore
      targetCtx.fillRect = (...args) => {
        this.addEventToCallStack("fillRect", args);
        originalFillRect.apply(targetCtx, args);
      };
      // @ts-ignore
      targetCtx.strokeRect = (...args) => {
        this.addEventToCallStack("strokeRect", args);
        originalStrokeRect.apply(targetCtx, args);
      };
      // @ts-ignore
      targetCtx.drawImage = (...args) => {
        this.addEventToCallStack("drawImage", args);
        originalDrawImage.apply(targetCtx, args);
      };
      // @ts-ignore
      targetCtx.clearRect = (...args: any[]) => {
        this.addEventToCallStack("clearRect", args);
        originalClearRect.apply(targetCtx, args);
      };
    } else {
      console.warn(
        "Profiler: Context is not 2D. Method patching may not be effective.",
      );
    }

    monitorFrame(); // Start the monitoring loop
  }

  addEventToCallStack(type: string, args: any[]) {
    this.callStackEvents.push({
      type,
      timestamp: performance.now(),
      args: args.map((arg) => {
        // Simple serialization for display
        if (arg instanceof HTMLCanvasElement || arg instanceof Image) {
          return `<${arg.tagName.toLowerCase()} id="${arg.id}">`;
        }
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }),
    });

    const lineHeight = 20;
    const maxVisibleLines = Math.floor((this.height - 30) / lineHeight);

    if (this._currentTab === "callstack") {
      const contentHeight = this.callStackEvents.length * lineHeight;
      const visibleContentHeight = this.height - 30; // 30px for tabs

      // If we are at the very bottom or not much content yet
      if (
        this.callStackScrollOffset >= contentHeight - visibleContentHeight ||
        contentHeight < visibleContentHeight
      ) {
        this.callStackScrollOffset = Math.max(
          0,
          contentHeight - visibleContentHeight,
        );
      }
    }

    if (this.callStackEvents.length > 500) {
      this.callStackEvents.shift();
    }
  }

  trackMemory() {
    // @ts-ignore
    if (performance.memory) {
      // @ts-ignore
      const memInfo = performance.memory;
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
    const graphHeight = this.height * 0.5 - 30; // Adjusted for tab height
    const graphYOffset = 0; // Relative to the translated context

    const maxFrameTime = Math.max(...this.frameTimes, 16.67); // Include 60fps target
    const scaleY = graphHeight / (maxFrameTime * 1.2); // Scale to fit, with some padding

    ctx.strokeStyle = this.paused ? "#666" : "#00ff00"; // Gray when paused, otherwise green
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
    const targetFPSLineY = graphYOffset + graphHeight - 16.67 * scaleY;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; // White dashed line
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, targetFPSLineY);
    ctx.lineTo(this.width, targetFPSLineY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Text labels
    ctx.fillStyle = "#00ff00"; // Green for frame time
    ctx.font = "12px Arial";
    ctx.fillText(
      `Frame Time (ms) - Max: ${maxFrameTime.toFixed(2)}`,
      10,
      graphYOffset + 15,
    );
    ctx.fillText("16.67ms (60 FPS)", 10, targetFPSLineY - 5);

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
    const tabContentHeight = this.height - 30; // Total height for content below tabs
    const graphHeight = tabContentHeight * 0.3; // Use a portion for memory
    const graphYOffset = tabContentHeight * 0.55; // Position below frame time graph

    ctx.fillStyle = "#1a1a1a"; // Dark background for this section
    ctx.fillRect(0, graphYOffset, this.width, graphHeight);

    // Draw a border for the memory graph section
    ctx.strokeStyle = "#333";
    ctx.strokeRect(0, graphYOffset, this.width, graphHeight);

    const maxMemory = Math.max(...this.memoryUsage, 50); // Minimum 50MB for scaling
    const barWidth = this.width / this.memoryUsage.length;
    const scaleY = graphHeight / (maxMemory * 1.2);

    ctx.fillStyle = "#ff8c00"; // Orange for memory bars
    for (let i = 0; i < this.memoryUsage.length; ++i) {
      const barHeight = this.memoryUsage[i] * scaleY;
      const x = i * barWidth;
      const y = graphYOffset + graphHeight - barHeight;
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);
    }

    // Text labels
    ctx.fillStyle = "#ff8c00";
    ctx.font = "12px Arial";
    ctx.fillText("Memory Usage (MB)", 100, graphYOffset + 10);

    if (this.memoryUsage.length > 0) {
      const latestMemory = this.memoryUsage[this.memoryUsage.length - 1];
      ctx.fillText(
        `Current: ${latestMemory.toFixed(2)} MB`,
        10,
        graphYOffset + 30,
      );
    }
  }

  /**
   * Renders a conceptual animation frame progress visualization.
   * @param ctx The 2D rendering context.
   */
  renderAnimationFrameVisualization(ctx: CanvasRenderingContext2D) {
    const tabContentHeight = this.height - 30; // Total height for content below tabs
    const sectionHeight = tabContentHeight * 0.1;
    const sectionYOffset = tabContentHeight * 0.9;

    ctx.fillStyle = "#0a0a0a"; // Even darker background
    ctx.fillRect(0, sectionYOffset, this.width, sectionHeight);

    ctx.strokeStyle = "#333";
    ctx.strokeRect(0, sectionYOffset, this.width, sectionHeight);

    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("Animation Frame Progress", 10, sectionYOffset + 15);

    // Simple progress bar
    const barPadding = 20;
    const barWidth = this.width - barPadding * 2;
    const barHeight = 10;
    const barX = barPadding;
    const barY = sectionYOffset + sectionHeight - barHeight - 10;

    ctx.strokeStyle = "#444";
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#00ffff"; // Cyan for progress
    ctx.fillRect(barX, barY, barWidth * this.animationFrameProgress, barHeight);

    ctx.fillStyle = "white";
    ctx.fillText(
      `Frames Rendered: ${this.animationFrameCount}`,
      barX,
      barY - 5,
    );
  }

  renderTabs(ctx: CanvasRenderingContext2D) {
    const tabHeight = 30;
    const tabWidth = this.width / 2;
    const tabY = 0;

    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Performance Tab
    ctx.fillStyle = this._currentTab === "performance" ? "#333" : "#1a1a1a";
    ctx.fillRect(0, tabY, tabWidth, tabHeight);
    ctx.strokeStyle = "#555";
    ctx.strokeRect(0, tabY, tabWidth, tabHeight);
    ctx.fillStyle = "white";
    ctx.fillText("Performance", tabWidth / 2, tabY + tabHeight / 2);

    // Call Stack Tab
    ctx.fillStyle = this._currentTab === "callstack" ? "#333" : "#1a1a1a";
    ctx.fillRect(tabWidth, tabY, tabWidth, tabHeight);
    ctx.strokeStyle = "#555";
    ctx.strokeRect(tabWidth, tabY, tabWidth, tabHeight);
    ctx.fillStyle = "white";
    ctx.fillText("Call Stack", tabWidth + tabWidth / 2, tabY + tabHeight / 2);
  }

  renderCallStack(ctx: CanvasRenderingContext2D) {
    const contentRegionY = 0; // Relative to the translated context
    const contentRegionHeight = this.height - 30; // Available height for call stack content

    ctx.fillStyle = "black";
    ctx.fillRect(0, contentRegionY, this.width, contentRegionHeight);

    ctx.fillStyle = "white";
    ctx.font = "12px Monospace";
    ctx.textAlign = "left";

    const lineHeight = 20;
    const totalContentHeight = this.callStackEvents.length * lineHeight;

    const maxScroll = Math.max(0, totalContentHeight - contentRegionHeight);

    this.callStackScrollOffset = Math.min(
      this.callStackScrollOffset,
      maxScroll,
    );
    this.callStackScrollOffset = Math.max(0, this.callStackScrollOffset);

    const lineIndexStart = Math.floor(this.callStackScrollOffset / lineHeight);
    // End drawing at `lineIndexEnd`
    const lineIndexEnd = Math.min(
      this.callStackEvents.length,
      lineIndexStart + Math.ceil(contentRegionHeight / lineHeight) + 2, // +2 for buffer
    );

    for (let i = lineIndexStart; i < lineIndexEnd; i++) {
      const event = this.callStackEvents[i];
      if (!event) continue; // Safety check

      const displayTime = (event.timestamp - this.lastFrameTime).toFixed(2);
      const argsString = event.args
        .map((arg) => {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        })
        .join(", ");

      const text = `[${displayTime}ms] ${event.type}(${argsString})`;

      const y =
        (i - lineIndexStart) * lineHeight +
        lineHeight -
        (this.callStackScrollOffset % lineHeight);
      if (
        y >= contentRegionY &&
        y + lineHeight <= contentRegionY + contentRegionHeight + lineHeight
      ) {
        ctx.fillText(text, 10, contentRegionY + y);
      }
    }

    if (this.callStackEvents.length === 0) {
      ctx.fillStyle = "#666";
      ctx.fillText("No events recorded yet.", 10, contentRegionY + lineHeight);
    }

    if (maxScroll > 0) {
      const scrollbarWidth = 5;
      const scrollbarX = this.width - scrollbarWidth - 5;
      const scrollbarTrackHeight = contentRegionHeight - 10;
      const scrollbarTrackY = contentRegionY + 5;

      ctx.fillStyle = "#333";
      ctx.fillRect(
        scrollbarX,
        scrollbarTrackY,
        scrollbarWidth,
        scrollbarTrackHeight,
      );

      const thumbHeight = Math.max(
        20,
        (contentRegionHeight / totalContentHeight) * scrollbarTrackHeight,
      );
      const thumbY =
        scrollbarTrackY +
        (this.callStackScrollOffset / maxScroll) *
          (scrollbarTrackHeight - thumbHeight);

      ctx.fillStyle = "#888";
      ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
    }
  }

  handleScroll(event: WheelEvent) {
    if (this._currentTab === "callstack") {
      event.preventDefault();

      const scrollSpeed = 20;
      this.callStackScrollOffset +=
        event.deltaY > 0 ? scrollSpeed : -scrollSpeed;

      const lineHeight = 20;
      const totalContentHeight = this.callStackEvents.length * lineHeight;
      const contentRegionHeight = this.height - 30;
      const maxScroll = Math.max(0, totalContentHeight - contentRegionHeight);

      this.callStackScrollOffset = Math.min(
        this.callStackScrollOffset,
        maxScroll,
      );
      this.callStackScrollOffset = Math.max(0, this.callStackScrollOffset);

      this.render();
    }
  }

  render() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderTabs(ctx);
    const tabContentStartY = 30;
    ctx.save();
    ctx.translate(0, tabContentStartY);

    switch (this._currentTab) {
      case "performance":
        this.renderFrameTimeGraph(ctx);
        this.renderMemoryUsageGraph(ctx);
        this.renderAnimationFrameVisualization(ctx);
        break;
      case "callstack":
        this.renderCallStack(ctx);
        break;
    }
    ctx.restore();

    ctx.fillStyle = this.paused ? "gray" : "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(this.paused ? "PAUSED" : "RUNNING", this.width - 10, 20); // Still 20px from top
  }

  switchTab(tab: "performance" | "callstack") {
    if (this._currentTab !== tab) {
      this._currentTab = tab;
      if (tab === "callstack") {
        const lineHeight = 20;
        const totalContentHeight = this.callStackEvents.length * lineHeight;
        const contentRegionHeight = this.height - 30;
        this.callStackScrollOffset = Math.max(
          0,
          totalContentHeight - contentRegionHeight,
        );
      }
      this.render();
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
    if (this.targetCanvas) {
      this.hookCanvas();
    } else {
      this.render();
    }
  }
}

customElements.define("l-profiler", Profiler, { extends: "canvas" });
