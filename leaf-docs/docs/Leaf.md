# Leaf rundown

Leaf is a extension of the canvas html attribute, it takes advantage of the web component technology! **Currently you can use leaf for static imports _only_**.

The usage of the [web-component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) is all that is required no other setup in its current state, everything is controlled under the hood for basic file rendering. This is super useful if you just want to export a model from blender and render it say in a portfolio just install leaf and write this one web-component and your done.

## Usage

```html
<html>
  <body>
    <l-canvas src="initScene"></l-canvas>
  </body>
  <script lang="ts">
    import * from 'leaf';

    window.leaf.initScene = () => ({
      name: 'Demo Scene',

      camera: {
        type: 'orthographic',
        FOV: 45,
        cameraBounds: 1.0,
        near: 0.1,
        far: 100.0,
        zoom: 1.0,
      },

      particle: {
        enabled: false,
      },

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

      physics: {
        enabled: false,
      },

      animations: {
        enabled: true,
        duration: 5.0,
        tracks: [
          {
            target: 'camera',
            property: 'position.z',
            keyframes: [
              { time: 0, value: 10 },
              { time: 2.5, value: 5 },
              { time: 5, value: 10 },
            ],
            loop: true,
          },
          {
            target: 'light',
            property: 'rotation.y',
            keyframes: [
              { time: 0, value: 0 },
              { time: 5, value: 6.28 },
            ],
            loop: true,
          },
        ],
      },
    }); 
  </script>
</html>
```

---

```html
<!-- Vanilla js example -->
<html>
  <body>
    <leaf src="object.stl" editors="true"></leaf>
  </body>
</html>
```

## A Note on Leaf Editors

Leaf will eventually support

- [ ] Material Editor.
- [ ] Model Editor.
- [ ] Particle Editor.
- [ ] Node-Based Scripting.

## Supported File Formats

Currently we support for static file imports:

| File Format | Import Supported | Animation |
| ----------- | ---------------- | --------- |
| .fbx        | yes              | no        |
| .stl        | yes              | no        |
| .obj        | yes              | no        |
| .mtl        | yes              | no        |
| .aesprite   | yes              | yes       |
| .jpeg       | no               | no        |
| .png        | no               | no        |
| .gif        | no               | no        |
| .psd        | no               | no        |
