export interface LProfilerProps {
    targetId?: string;
};

export class Profiler extends HTMLCanvasElement {
    static observedAttributes = ["target-id", "width", "height"];
    targetCanvas: HTMLCanvasElement | null = null;
    ctx: CanvasRenderingContext2D | null = null;
    frameTimes: number[] = [];
    lastFrameNumber: number = performance.now();
    tracking = false;
    paused = false;
    type: "2d" | "gpu" = "2d";

    constructor() {
        super();
    }

    connectedCallback() {
        this.id = "profiler-canvas";
        this.ctx = this.getContext("2d");
        this.updateTarget();
        requestAnimationFrame(() => this.trackFrame());
    }

    disconnectedCallback() {
        console.log("Profiler canvas removed.");
    }

    adoptedCallback() {
        console.log("Profiler canvas moved to a new document.");
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (name === "target-id") {
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

       const targetCtx = this.targetCanvas.getContext("2d") ||
                          this.targetCanvas.getContext("webgl") ||
                          this.targetCanvas.getContext("webgpu");
    if (!targetCtx) {
        console.warn("Profiler: Unable to hook into canvas context.");
        return;
    }

    const originalDrawImage = targetCtx.drawImage;
    const originalClearRect = targetCtx.clearRect;

    const start =  performance.now();
    let frameCount = 0;

    const monitorFrame = () => {
        if (this.paused) return requestAnimationFrame(monitorFrame); // Skip

        ++frameCount;
        const now = performance.now();
        const elapsed = now - start;

        if (elapsed >= 1000) {
            const fps = frameCount;
            frameCount = 0;
            lastFrameNumber = now;
            this.frameTimes.push(fps);
            if (this.frameTimes.length > 100)
                this.frameTimes.shift();
            this.renderGraph();
        }

        requestAnimationFrame(monitorFrame);
    };

    monitorFrame();

    targetCtx.drawImage = (...args: any[]) => {
            originalDrawImage.apply(targetCtx, args);
            this.trackFrame();
    };

    targetCtx.clearRect = (...args: any[]) => {
        originalClearRect.apply(targetCtx, args);
        this.trackFrame();
    };
    }

    trackFrame() {
        if (this.paused) return;

        const now = performance.now() 
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        this.frameTimes.push(deltaTime);
        if (this.frameTimes.length > 100) {
            this.frameTimes.shift();
        }

        this.renderGraph();
    }

    renderGraph() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.width, this.height);

        const maxFrameTime = Math.max(...this.frameTimes, 16.67);
        const scaleY = this.height / (maxFrameTime * 1.2);

        ctx.strokeStyle = this.paused ? "gray" : "lime";
        ctx.beginPath();

        for (let i = 0; i < this.frameTimes.length; ++i) {
            const x = (i / this.frameTimes.length) * this.width;
            const y = this.height - (this.frameTimes[i] * scaleY);
            ctx.lineTo(x, y);
        }

        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.font = "12pxa Arial";
        ctx.fillText(this.paused ? "PAUSED" : `Max Frame Time: ${maxFrameTime.toFixed(2)}ms`, 10, 15);
    }

    pause() {
        this.paused = true;
        this.renderGraph();
    }

    resume() {
        this.paused = false;
        requestAnimationFrame(() => this.trackPerformance());
    }

};

customElements.define('l-profiler', Profiler, {extends: "canvas"});
