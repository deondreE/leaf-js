# Api Reference

This is a general reference of the inner workings of the leaf system.

## Static Scenes

Static scenes are driven directly by there paser. The user supplies a file format then a parse function is run on that specific file type. After that everything required for rendering is defined within the parsers class.

`parse{FileType}`: parses the data from the given file, currently loads it into memory will eventually stream into chunks for more efficient processing.

`getShaderString`: This is specifically for dyn scenes.

`createBuffers`: Returns all required buffers and their required data inside of them.

`createPipeline`: Creates a pipeline for the specific requirements of that file type.

`render`: Renders the object.

- VertexBuffer: Defined inside the parser class returned from the parsing of the file
- UniformBuffer: Shared across all models, but unqiue due to js implemenatation of buffer.
- MVPBuffer: The Model View Player buffer is a single defined buffer shared across a single instance.

> painpoints: Too much memory usage.

## Rendering
The end-user, can communicated with the renderer, but by default will not have access to the "Renderer".

`On render`: a private `staticTransform` and public `transform` method should be used to apply static mutation from a 3rd party file and `transform` modifies the models buffer and marks model as dynamic.

`On render`: a private `checkSource` reads the source file type, and should return the type of rendering context needed. If it is a web-native supported context, it will return `null`. If it is unsupported it will throw an `UnsupportedTypeError`.

`OnLeafLoad`: checks all enqueued scenes for compliant pipelineDescriptor. 

`On initialization`: the type of renderer is just an enum, and a switch will be used to pick out "context".

`On intialization`: If there is no selector provided leaf will create a `default` canvas, and call `injectDOM` which would be identical to `document.querySelector`.

`On intialization`: The default canvas is a Leaf-Canvas which is specified as a web component allowing for all child scenes to read a default pipeline.
 
`renderWireframe`: Wireframe version of the current context may have to be not traditional wireframe.

## Event System
> Required for MVP

Will extend the existing event system allowing for custom events only when needed, having our own dispatch / event system is more work then actually required in this use case.

> See: [This](https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events) for extending the event system.

## Profiler 

Vertexcount, fps count, memory.

Lazy collection of every dataset required.

`on render`: context is rendered using console.trace().

`on error`: Translate the error so that they are not as scary.

## Model
Navigation Meshes:

- Cube -> Cube mesh default
- Capsule
- Plane

## Particles

Particles are more complex then traditional rendering, I want to use icospheres the user provides some level of data that they want to render then some positional data and some color. Physics based functions are not supported in its current state.

Particles in thier final state wil use signals to communicate with some dispatcher about what they are going to do or are currrently doing.

## File formats

Supported file formats in leaf currently.

3d:

 - [Fbx](https://code.blender.org/2013/08/fbx-binary-file-format-specification/)
 - [Obj](https://www.loc.gov/preservation/digital/formats/fdd/fdd000507.shtml)
 - [Stl]()

2d:

 - GIF
 - PNG, JPEG
 - SVG
 - PSD
 - [Aesprite](https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md)