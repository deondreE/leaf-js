# Leaf rundown

Leaf is a extension of the canvas html attribute, it takes advantage of the web component technology! Currently you can use leaf for static imports _only_.

The usage of the [web-component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) is all that is required no other setup in its current state, everything is controlled under the hood for basic file rendering. This is super useful if you just want to export a model from blender and render it say in a portfolio just instal leaf and write this one web-component and your done.

## Usage

```html
<html>
  <body>
    <l-canvas src=""></l-canvas>
  </body>
  <script src="replace with leaf package"></script>
</html>
```

---

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
