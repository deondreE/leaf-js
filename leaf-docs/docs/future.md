# Future of Leaf

The future of leaf is as follows, remove complexity and verbosity from rendering apis a whole. A unified solution to simplify all rendering apis.

Take [Vulkan](https://www.vulkan.org/), [DirectX](https://en.wikipedia.org/wiki/DirectX), [Metal](https://developer.apple.com/metal/), [OpenGl](https://www.opengl.org/), [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API). Then create an api that is fast and easy to use, across multiple platforms / languages. This will be a large and complex problem to solve with many hours of contemplation put into each decision. But Overall the return will allow people to create rendering environments that are simple, composable and most importantly efficient in all environments.

Allowing for support of all major runtimes in one place is super important for smaller scale projects, and newbies who have never touched rendering before are then able to digest rendering at a slower rate, which then in turn makes them better rendering developers.

> Note: Leaf is not and will never be a game engine, just another rendering api that works cross platform.

## Suported Languages

Leaf will be abstracted into general language binaries, overall leaf will be written in [zig](), but there will be languages availible if you don't want to use leaf in zig; These languages are: - [Python](https://www.python.org/) - [Rust](https://www.rust-lang.org/) - [Javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - [Zig](https://ziglang.org/documentation/0.13.0/) - [C++](https://en.cppreference.com/w/) - [C](<https://en.wikipedia.org/wiki/C_(programming_language)>)

## Why Zig

Zig allows for a unified codebase which in turn allows for simplicity across the api. It has many advantages in the context of binary parsing which happens with `.fbx`, `.stl`, `.psd`, and `.aseprite` files. It also allows for allocator definitions that I personally think are more contributor friendly. Zig solves some of my common griefs with C++ and C, and also allows me to import C, and C++ libraries with little to no headache at all. This control of my environment and multiplatform support out of the box is why we chose zig for this project.

There will be some system level accessors that will be written likely in C just to stick with the zig like environment, and each major lang implementation will take its own interfaces to work overall.

Zig also allows us to create a super simple import scheme for people who want to import leaf into there game engines as a rendering layer. Basically taking the work out of supporting multiple major rendering libraries.

## Challenges to face

1. Cross platform support, operating systems act differently that why these libraries exist. Taking advantage of that will be difficult while staying in the context of leaf.
2. Giving control to the developer outside of Zig. -> Languauge abstractions can be tricky, normally its like run this function not nesssisary run this process.
3. Tastefull verbosity -> Somethings are just meant to look super crazy and complex when in reality they really are not at all.
4. Bigendian vs Littleendian
5. Making the api share a schema rather then making abstractions per lang supported.

## Roadmap to leaf

> Starting out leaf will support [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) mostly to get a hang of the way we want the api to work, and show off the powers of what leaf could be. After the MVP release of the typescript version of leaf, we will then move to finishing that version completly. Support for [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) in typescript will then be added, after this we will move to the bigger picture of leaf to reach more hands.

1. We will start overall with research and development, making a large api like this takes time but at the same time if we can't identify issues with current apis leaf serves no purpose.

2. Moving foward leaf will be written in [Zig](https://ziglang.org/documentation/0.13.0/), then the entire project before will be ported to the new system, after this Vulkan will be added and the larger journy begins.

3. Super excited to see where leaf heads in its future.
