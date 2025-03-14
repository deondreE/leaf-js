# Api Reference

This is a general reference of the inner workings of the leaf system.

Leaf store all information in the form of TOML, allowing for data to be simply abstracted from one source of truth.

---

## Static Scenes

Scenes that are not modified at runtime will write to file at buildtime.

> Note: static scenes are built to a .TOML format making then about 2kb in size and it allows for us to store all information directly on the client instead of reading the info in realtime.

Static scenes are driven directly by there paser. The user supplies a file format then a parse function is run on that specific file type. After that everything required for rendering is defined within the parsers class.

`parse{FileType}`: parses the data from the given file, currently loads it into memory will eventually stream into chunks for more efficient processing.

`getShaderString`: returns the default shader in string form, by default it is setup to return ShaderModule.

`createBuffers`: Returns all required buffers and writes required data inside of them.

`createPipeline`: Creates a pipeline for the general requirements of that filetype, sometimes the buffers need to be scaled based on the number of verticies, or Ghost verticies need to be added.

- _UniformBuffer_: Shared across all models, shared across all buffers, is more of a dyn heap then a buffer. Stores color, rotation, scale. Anything that effects the overall object.

---

## Rendering

The end-user, can communicated with the renderer, but by default will not have access to the "Renderer".

`On render`: a private `staticTransform` and public `transform` method should be used to apply static mutation from a 3rd party file and `transform` modifies the models buffer and marks model as dynamic.

`On render`: a private `checkSource` reads the source file type, and should return the type of rendering context needed. If it is a web-native supported context, it will return `null`. If it is unsupported it will throw an `UnsupportedTypeError`.

`OnLeafLoad`: checks all enqueued scenes for compliant pipelineDescriptor.

`On intialization`: The default canvas is a Leaf-Canvas which is specified as a web component allowing for all child scenes to read a default pipeline.

---

## Event System

> Required for MVP

Will extend the existing event system allowing for custom events only when needed, having our own dispatch / event system is more work then actually required in this use case.

> See: [This](https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events) for extending the event system.

---

## Profiler

The profiler is required becuase the general `performance` api does not track the canvas context alone.

> Vertexcount, fps count, frame-time, memory usage.

---

## Particles

Particles are more complex then traditional rendering, I want to use icospheres the user provides some level of data that they want to render then some positional data and some color. Physics based functions are not supported in its current state.

Paticles will communicate with one another through the an implementation of the signal system. Making the process of creating and tracking particles seamless.

---

## Supported File formats

Supported file formats in leaf currently.

3d:

- [Fbx](https://code.blender.org/2013/08/fbx-binary-file-format-specification/)
- [Obj](https://www.loc.gov/preservation/digital/formats/fdd/fdd000507.shtml)
- [Stl]()

2d:

All default files formats supported by `<img>` are supported as texture2D context.

- GIF
- PNG, JPEG
- SVG
- [Aesprite](https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md)

---

# Scene

- `type`: Type is the type of primitive you want to apply the changes to.
  - `cube`: Cube primitive defined in the renderer.
- `scale`: A floating point value between 0 and 1.
- `color`: RGBA default color is a lilac purple. All RGB values are between 0 and 1 I think.
- `rotation`: XYZ dyn rotation, has support for math functions as long as they return a whole number, has support for radient rotation and quaternion rotation.
- `position`: XYZ must be whole number position.

---

### Dynmaic Scene API template

- `animation`: Support for animations applied to the object inisde of the scene.
  - `duration`: Time that animation takes
  - `effect`: Object that allows you to define the effect of an animation
    - `scale`: effect the scale over the alloted duration.
    - `rotation`: XYZ effect the rotation over the alloted time.
    - `color`: RGBA effect the color over the alloted duration.
- `particles`: This technically works its just not in the scene system yet.
  - `type`: The type of particle rendering.
    - `global`: Large amount of particles inside a single scene allows for more complex visualizations.
    - `emitter`: Emiited from a single location or multiple location naturally a smaller amount of particles.
  - `particleAmount`: The MAX amount of particles in a given scene.
  - `color`: The color of all particles, can be a mathmatical function just needs to return a definition of RGBA.
  - `startPos`: Starting poistion of global particles.
  - `shader`: Allows for custom compute shaders.
  - `emmitter`: The starting position of emmitter type particles
    - `shape`: The shape that the particles will conform to.
      - `cone`: Cone shape
      - `square`: Square shape
      - `sphere`: Sphere shape.
