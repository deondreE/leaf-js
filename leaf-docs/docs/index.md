# Welcome to the leaf-js docs

Here in the docs you should find questions to any of the problems that you may face. And an understanding of how leaf does things under the hood.

## How does leaf work?

Leaf leverages WebGPU, a modern JavaScript API that provides low-level access to GPU rendering and compute capabilities, enabling a more native and efficient rendering experience.

At its core, Leaf structures rendering around pipelines—akin to conveyor belts in a factory. Each scene in Leaf is assigned its own rendering pipeline, which processes instructions and sends them to the GPU for execution. These instructions are stored in a command queue and dispatched efficiently to maximize performance.

Every shape within a scene is rendered with minimal overhead, both computationally and in terms of API complexity. To keep things performant and intuitive, Leaf ensures that pipelines are generated per scene and only recompiled when necessary—such as when a new shape is introduced that modifies the rendering state. This approach reduces unnecessary recomputations while maintaining flexibility.

## Leafjs Comparison

There are many existing 3D rendering solutions for the web, with Three.js being one of the most widely used. However, Three.js comes with significant complexity, requiring developers to understand intricate rendering concepts. LeafJS aims to simplify this by abstracting rendering details, allowing developers to create visually impressive experiences without deep knowledge of the underlying GPU operations.

WebGL was designed in an era when OpenGL was the dominant rendering API. However, modern web rendering has evolved beyond OpenGL-based solutions. Leaf takes advantage of WebGPU, which offers a more direct and efficient path to the GPU, significantly outperforming WebGL in both rendering speed and power efficiency.

For even greater performance, Leaf supports integration with WebAssembly (WASM), enabling near-native execution speeds. Since all web-based frameworks are ultimately constrained by the virtual GPU access granted by Chrome and other browsers, Leaf’s use of WebGPU ensures the best possible performance within these limits.

Additionally, Leaf utilizes WGSL, a shader language designed specifically for WebGPU. WGSL offers significant performance improvements over GLSL, optimizing shader execution for web environments. This results in lower latency, better memory efficiency, and improved compatibility with modern GPU architectures.

## Leafjs Build

Check the reference on how leaf actually works under the hood, it will also show you where and how to run leaf.