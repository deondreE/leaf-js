# Leaf Engine – API Reference

## Overview

This document provides an overview of the core systems that make up the Leaf Renderer API, describing file parsing, scene management, and rendering architecture.

## Static Scenes

Static scenes are prebuilt environments that remain unchanged at runtime.

At build time, they are serialized into .YAML files depending on the active parser.

Static scenes are driven directly by their associated parser.

The user supplies a known file type, and the system runs the parse{FileType} function to extract its data.

All buffers, materials, and pipelines required for rendering are then defined within that parser class.

| Method            | Description                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `parse{FileType}` | Parses the data from the given file. Currently loads the file entirely into memory. Will support chunk-based streaming for more efficient processing in future versions. |
| `getShaderString` | Returns the shader source string for dynamic scenes (used by runtime-generated pipelines)                                                                                |
| `createBuffers`   | Prepares all CPU-to-GPU buffer data such as vertex, index, and uniform buffers for rendering.                                                                            |
| `createPipeline`  | Creates a GPU render pipeline with state objects that match the requirements of that specific file format.                                                               |
| `render`          | Executes draw commands for the prepared object.                                                                                                                          |

## Primitives

### Overview

Primitives are dynamically generated geometric shapes created entirely on the GPU or CPU at runtime, without the need for file‑based asset ingestion. They are ideal for procedural scenes, rapid prototyping, or simulation objects that do not require importing from disk. Primitives share the same render pipeline architecture as static models, allowing them to coexist with imported assets seamlessly within the same WebGPU or WebGL2 context.

### Supported Primitive Types

|Shape |	Description|
| ----------------- | --------------------------------------------------------- |
|box	|Basic cube mesh with 6 faces, 24 vertices, full normal shading supported.|
|sphere|	UV‑sphere generated parametrically using latitude / longitude subdivision.|
|plane|	XZ‑aligned ground surface used for floors and terrain patches.|
|quad|	XY‑aligned billboard oriented toward +Z; useful for 2D sprites or decals.|
|torus|	Donut‑shaped parametric surface defined by major and minor radii.|
|cone|	Conical mesh with configurable height and base radius; includes base cap.|
|custom|	Future extension: user‑supplied procedural vertex function.|

---

## Geometry Generation

Each primitive defines a parametric vertex generator. Vertices are computed on a background WebWorker thread to avoid blocking the main render loop.

Generated data includes 
  - `positions`: Array of vertex positions [x, y, z]
  
  - `normals`: Array of surface normals [nx, ny, nz]
  
  - `indices`: Triangle connectivity for efficient drawing
  
  - `optional`: color, UVs, tangents (future)
The main thread receives binary buffers (Float32Array / Uint16Array) via transferable objects and uploads them directly into GPU buffers.

---

## Instance Rendering

All primitives are rendered through instancing, allowing thousands of copies to share one geometry set and shader pipeline.

|Buffer Type |	Contents |	Step Mode |
| ----------------- | ---------------------------|------------------------------ |
|Geometry Buffer|	Vertex + normal data	| `vertex`|
|Instance| Buffer	Model transform (mat4) + color (vec4)|	`instance`|

Each frame uses one draw call per primitive type:

```glsl
drawIndexed(indexCount, instanceCount);
```
This architecture enables 1‑to‑10000 simultaneous instances without CPU bottlenecks.

---

## Runtime Properties

Each primitive accepts runtime‑configurable parameters that mirror your SceneObject schema:

|Property	|Type|	Description|
| ----------------- | ---------------------------|------------------------------ |
|color|	Vec4| (0–1 or 0–255)	Base RGBA color normalized automatically.|
|width / height / depth	|number	| Physical dimensions applied as model scale.|
| rotation |	{x, y, z} (deg)	| Static rotation applied per instance. |
|position|	{x, y, z}	|World translation; randomized if random_spawn_pos is true. |
|amount	|number	|Number of instances to generate for this object. |
|color_random|	boolean|	Randomizes instance color within HSV or RGB range.|
|random_animation	|`{ type: 'rotation'	'bounce'|------ |

---

## Data Responsibilities

- `VertexBuffer`: Defined within the parser class; produced directly from parsed file data.
- `UniformBuffer`: Shared by all models but unique per JavaScript memory reference.
- `MVPBuffer`(Model‑View‑Projection Buffer): A shared transform buffer used by all model instances of a scene.

> Pain Points:

> Streaming and lazy loading (chunking) is a planned optimization.

## Rendering

| Stage                   | Behavior                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnRender (internal)     | Uses staticTransform() for applying static file-based modifications and transform() for runtime mutations. Any call to transform() marks the model as dynamic.    |
| checkSource()           | Inspects file type to determine which rendering context or backend to use. Returns the proper render context if supported; throws UnsupportedTypeError otherwise. |
| onLeafLoad()            | Validates that all loaded scenes comply with required pipelineDescriptor definitions.                                                                             |
| Renderer Initialization | Uses an enum (e.g., RendererType.WEBGPU, RendererType.WEBGL2) to select and configure the rendering context.                                                      |
| Canvas Handling         | When no canvas is provided, Leaf creates a default <leaf-canvas> web component automatically via injectDOM(). All child scenes inherit its default pipeline.      |

## Event System

> Required for MVP

Leaf extends the DOM Event system to enable lightweight, custom scene events without re‑implementing an internal dispatcher.

Events like scene loaded, model clicked, and physics updated can dispatch through standard DOM `EventTarget` APIs.

Reference:

See [MDN – Creating and triggering events](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Events)

Example:

```js
const event = new CustomEvent('leaf:modelLoaded', { detail: { modelName } });
window.dispatchEvent(event);
```

## Profiler

> Model bounding profiler, collisions.
> Vertexcount, fps count.

Lazy collection of every dataset required.

`on render`: context is rendered using console.trace().

`on error`: Translate the error so that they are not as scary.

## Model

Navigation Meshes:

- Cube -> Cube mesh default
- Capsule
- Plane

## Particles

Particle systems are currently experimental and use icosphere instancing for simplicity.

Users provide:

- Per‑particle color and position data,

- Optional procedural distribution setup.

Physics-based particle simulation is not yet supported in the current build.

> Later iterations will use a signal-based dispatcher for inter>

> system communication (e.g., linking emitters or dynamic light sources).

## File Format Support

Leaf supports multi‑format asset ingest for both 3D and 2D pipelines.

### 3D

| Format | Specification                                                         |
| ------ | --------------------------------------------------------------------- |
| FBX    | Autodesk FBX Specification (Blender Reference)                        |
| OBJ    | Wavefront OBJ Specification – Library of Congress                     |
| STL    | Stereolithography geometry format, used for lightweight mesh imports. |

### 2D

| Format     | Notes                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| GIF        | Animated 2D texture atlas (future support)                                   |
| PNG / JPEG | Standard raster formats for textures                                         |
| SVG        | Native vector shape rendering support (planned)                              |
| Aseprite   | Aseprite File Specification – used for sprite‑sheet animation and frame data |

## Summary

Leaf provides a modular, file‑centric rendering pipeline.

Each parser defines its own buffers, materials, and shaders, while the renderer manages lifecycle events and profiling transparently.

Upcoming improvements include memory streaming, advanced event management, and extended editor‑mode support.
