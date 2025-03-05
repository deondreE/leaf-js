# Leaf rundown

Leaf is a extension of the canvas html attribute, it takes advantage of the web component technology! Currently you can use leaf for static imports _only_.

> Note: dynamic scenes are supported see the info below on how to use them.

The usage of the [web-component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) is all that is required no other setup in its current state, everything is controlled under the hood for basic file rendering. This is super useful if you just want to export a model from blender and render it say in a portfolio just instal leaf and write this one web-component and your done.

## Usage

```html
<!-- Vanilla js example -->
<html>
  <body>
    <!-- Leaf Supports -> .stl, .obj, .asesprite static file imports -->
    <leaf src="object.stl"></leaf>
  </body>
</html>
```

## Supported File Formats

Currently we support for static file imports:

| File Format | Import Supported | Animation |
| ----------- | ---------------- | --------- |
| .fbx        | no               | no        |
| .stl        | yes              | no        |
| .obj        | yes              | no        |
| .aesprite   | yes              | yes       |
| .jpeg       | no               | no        |
| .png        | no               | no        |
| .gif        | no               | no        |
| .psd        | no               | no        |

> Note: for .stl you need to check the ascii format inside of the blender output when exporting. Binary parsing for .stl does not work.

## Dynmaic Scenes

The process of creating dynamic scenes exists due to people wanting to create games, animation, viewing platforms, AR / VR visualization and more all in the web. Leaf takes a new approach to this complex problems simply by heavily relying on ObjectNotation to describe what you want the scene to do.

Think of this whole process as "I have a scene that contains different things, and those things can do this.". Bleow is what that looks like.

## Usage

```html
<html>
  <head>
    <title>Working site</title>
  </head>
  <body>
    <canvas is="leaf-js" src="createScene" width="800" height="600"></canvas>
  </body>
  <script lang="js">
    function createScene() {
      let scene = {
        models: [
          {
            type: 'cube',
            scale: 0.5,
            rotation: { x: 0, y: 0, z: 45 },
            color: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      };

      return scene;
    }
  </script>
</html>
```

Unlike the above example where leaf takes a static file and parses it. Here leaf takes primitive shapes and does actions like `resize`, `rotation`, and `changeColor` to a single shape.

This allows for developers to not have to think about the process of getting the cube on the screen, just thinking about what they are going to do with the cube.

## Scenes In Depth

_Currently Scenes support_:

- Scale
- Color
- Rotation
- Starting position
- Single Model Definitions

_Scenes Will Support_:

- Multi Model Definitions
  - WIP
- Animations
  - Scale
  - Rotation
  - Color
  - Position
- Physics
  - Collision
  - Velocity
- Particles
  - Techinically supported just not defined.

## Notes

> Warning: Leaf is still `pre-release` so a lot of this may not actually work.

> For full reference see the Scene section in the reference document.
