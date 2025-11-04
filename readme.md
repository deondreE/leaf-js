# Leaf‑js

Leaf‑js is a next‑generation `2D/3D rendering engine` for creating games, simulations, and interactive experiences directly on the web. It builds upon modern browser graphics technologies—primarily `WebGPU`—to simplify the development of complex, high‑performance 3D environments.

Leaf’s ultimate goal is to make web‑based games as capable as native desktop or console titles, while also improving asset sharing workflows for industries that rely on advanced visualization (architecture, simulation, VFX, etc.).

> Note: WebGPU is currently experimental.
> It must be enabled manually in your browser settings (e.g., chrome://flags in Chrome).
> Note: Memory usage is currently a limiting factor—Web‑based GPUs are improving but still constrained compared to native APIs.

# 🌿 Vision

Leaf is designed around one core philosophy: power and simplicity should coexist.

Creating a high‑fidelity 3D world shouldn’t require pages of boilerplate boilerplate WebGL code. Leaf builds an abstract rendering layer that intelligently handles low‑level GPU optimization while keeping your experience as modern and developer‑friendly as possible.

# 🚀 Future Goals

These systems are designed to integrate tightly, providing smooth coordination between rendering, physics, lighting, and animation—targeting true high frame‑rate realism `(~1080p at 120 FPS)`.

1. Advanced Lighting & Rendering
   - Not just drawing triangles—lighting defines realism.
   - Leaf will feature physically‑based lighting and shading models to bring natural illumination, reflections, and atmospheric depth to the web.

2. Physics‑Based Interactions
   - Real‑world physics make digital worlds believable.
   - Leaf’s physics engine will synchronize with rendering and animation systems to produce dynamically accurate and visually cohesive scenes.

3. High-Performance Optimization:
   - A prioritized development goal is sustaining 1080p @ 120 FPS through:
     - Persistent GPU buffer mapping
     - Multi‑threaded asset streaming
     - Scene batched‑rendering and culling
     - Adaptive LOD (Level of Detail) pipelines

4. Extensible Plugin System:
   - Leaf will support a plugin architecture for expanding its capabilities:
     - Custom rendering pipelines
     - Specialized lighting or shadow engines
     - External physics or AI systems
   - This flexibility allows both developers and studios to tailor Leaf for their specific production needs.

## 🧠 Core Engine Features

- Unified Scene Management: 2D and 3D scenes live within the same runtime hierarchy.

- Dynamic Parsing: Supports OBJ, STL, FBX, and YAML scene definitions.

- Cross‑Context Rendering: Auto‑selects WebGPU → WebGL2 → Canvas fallback.

- Physics Integration: Lightweight PhysicsSystem supports gravity, collision, and rigid body mechanics.

- Profiler & Debugger: Collects FPS, vertex counts, and bounding data directly from GPU passes.

- Declarative Scene API: Scenes can be defined via TypeScript objects for clarity and composability.

- Web‑Component Canvas: Leaf provides a default <leaf‑canvas> element supporting all rendering contexts.

## 🧩 Theoretical Usage Example

> 🧪 Prototype concept — not yet implemented.

```html
<canvas is="leaf-js" src="initScene" width="800" height="800" id="webgpu-canvas"> </canvas>

<script lang="ts" type="module">
import Leaf from 'leaf';

window.leaf.initScene = () => ({
  name 'Test scene',
  objects: [
    {
      name: 'testMesh',
      shape: 'box',
      scale: {
        width: 20,
        height: 20,
        depth: 20,
      },
      color: { r: 255, g: 0, b: 255, a: 255 },
      rotation: { x: 0, y: 45, z: 45 },
      amount: 1,
    },
  ],
});
</script>
```

## ⚒️ Development Philosophy

| Principle                      | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| Declarative First              | Describe what you want rendered — Leaf handles how.                      |
| Low‑Level Access               | When Needed Direct access to pipelines or buffers is always possible.    |
| Zero‑Boilerplate Startup       | Leaf.scene() should be enough to start a new environment.                |
| Native‑Quality Web Performance | Aim for full parity with desktop APIs like Vulkan/DirectX.               |
| Open Design                    | Engine internals are modular, making extension and experimentation easy. |

## 🧩 Supported File Types

| Domain         | Formats                    |
| -------------- | -------------------------- |
| 3D Models      | FBX, OBJ, STL              |
| 2D Assets      | PNG, JPEG, GIF, SVG        |
| Sprite Systems | Aseprite (.ase, .aseprite) |
| Scene          | Definitions YAML           |

## 🧭 Quick Notes

- Enable WebGPU manually via chrome://flags/#enable-unsafe-webgpu (Chrome) or about:config in Firefox.
- Use TypeScript for best performance and autocompletion (Leaf provides full typings).
- The engine is designed with memory profiling and chunk streaming in mind for large scenes.

## 🌌 Summary

Leaf‑js strives to make high‑fidelity, physics‑enabled, real‑time 3D simulations accessible on the Web—

bridging the power of native rendering with the openness of browser platforms.

It’s not just another WebGL wrapper — it’s the beginning of the WebGPU era.
