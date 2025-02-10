# Api Reference

## Static Scenes
Scenes that are not modified at runtime will write to file at buildtime.
> Static scenes are built to .YAML. Depending on the parser.

Everytime a scene is created the `checkStatic` method is run. Then the correct checks are applied.

On a specific event there will be a valid handler depending on if it is a static context or a dynamic context.

## Rendering
The end-user, can communicated with the renderer, but by default will not have access to the "Renderer".

`On render`: a private `staticTransform` and public `transform` method should be used to apply static mutation from a 3rd party file and `transform` modifies the models buffer and marks model as dynamic.

`On render`: a private `checkSource` reads the source file type, and should return the type of rendering context needed. If it is a web-native supported context, it will return `null`. If it is unsupported it will throw an `UnsupportedTypeError`.

`OnLeafLoad`: checks all enqueued scenes for compliant pipelineDescriptor. 

`On initialization`: the type of renderer is just an enum, and a switch will be used to pick out "context".

`On intialization`: If there is no selector provided leaf will create a `default` canvas, and call `injectDOM` which would be identical to `document.querySelector`.

`On intialization`: The default canvas is a Leaf-Canvas which is specified as a web component allowing for all child scenes to read a default pipeline.
 

## Event System

> Required for MVP.

> Dynamic -> Static: Are the models being directly modified?

The event system will delegate events based on the rendering type `static` or `dynamic`

## Profiler 
> Model bounding profiler, collisions.
Vertexcount, fps count.

Lazy collection of every dataset required.

`on render`: context is rendered using console.trace().

`on error`: Translate the error so that they are not as scary.

## Model
Navigation Meshes:

- Cube -> Cube mesh default
- Capsule
- Plane

## File formats

Supported file formats MVP:

3d:
 - [Fbx](https://code.blender.org/2013/08/fbx-binary-file-format-specification/)
 - [Obj](https://www.loc.gov/preservation/digital/formats/fdd/fdd000507.shtml)
 - [Stl]()

2d:
 - GIF
 - PNG, JPEG
 - SVG
 - [Aesprite](https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md)