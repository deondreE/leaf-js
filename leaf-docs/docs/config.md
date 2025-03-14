# Leaf Configuration

Leaf has multiple ways to communicate with the core API. One of them is through the definition of a Function ReturnConfig, and the other is through [TOML](https://toml.io/en/) file definitions. Both the these configs are interchangable and actually communicate with eachother.

--- 

## TOML Config

TOML is a somple format that allows for leaf to keep configuration extremly simple.

---

### TOML scene config

```toml
[[example.scene]]
models = [
    { name = "exmaple_cube", position =[0, 0,0], color=[1,1,1,1] },
] 

[[example.scene.animation]]
name = "example_cube"
animation = "rotation"
from = [0, 0, 0]
to = [0, 90, 0]
```

---

> Change example.scene to your scene name. 

---

## Function Return Config

This is the most common form of configuration inside of leaf, all you have to do is write a function and return a fcreated scene from it.

> Note: Arrow functions are currently not supported it has to be a function in the global scope.

```html
<html>
    <canvas is="leaf-js" src="initScene" width="800" height="600"></canvas>
</html>
<script lang="js">
function initScene() {
    let newScene = {};
    
    return newScene;
}
</script>
```
