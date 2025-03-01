# Welcome to the leaf-js docs

Here in the docs you should find questions to any of the problems that you may face. And an understanding of how leaf does things under the hood.

## How does leaf work?

Leaf leverages WebGPU, a modern JavaScript API that provides low-level access to GPU rendering and compute capabilities, enabling a more native and efficient rendering experience.

At its core, Leaf structures rendering around pipelines—akin to conveyor belts in a factory. Each scene in Leaf is assigned its own rendering pipeline, which processes instructions and sends them to the GPU for execution. These instructions are stored in a command queue and dispatched efficiently to maximize performance.

Every shape within a scene is rendered with minimal overhead, both computationally and in terms of API complexity. To keep things performant and intuitive, Leaf ensures that pipelines are generated per scene and only recompiled when necessary—such as when a new shape is introduced that modifies the rendering state. This approach reduces unnecessary recomputations while maintaining flexibility.