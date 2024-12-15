# Leaf-js

3d / 2d rendering pipeline, for developers that want performent rendering on the web.

## Example usage

1. React

Problem: Issues currently you require acccess to some type of Module to be able to run the code inside of c++

Solution: Have a provider wrapper / runtime, that can have event loop based on the module the user wants to call at any given time. This provider will wrap the main app, and allows users to call functions that exist only in C++.

```typescript
// In it's current form the way you would use it is as follows.
import LeafModule from 'leaf-js'; 
import { useEffect, useRef } from 'react';

const Canvas () => {
  useEffect(() => {
    LeafModule.then((ModuleInstance) => {
      // This is where it depends on what you want to use.
      var Test = new ModuleInstance["Rectangle"](10, 10, 10, 10, true);

      Test.render();
    }); 
  });

  return (
    <div>
      <canvas id="canvas"></canvas>
    </div>
  )
};
```

The insteresting part of this all, is currently the only process of WebGL is the smooshing if you will into the canvas. Nothing is being translated when it comes to events, rendering, state, etc. So I can render text, cursors, basically anything with any API from c++ directly, and not have to worry about browser support as long as the 'GPU' can handle the load that I am giving it. 

Once we get into a space where `<canvas>` cannot immediatly process the data say with shaders and Webgl then will we start to see the performance drops we are used to seeing in larger scale applications. The way to fix this is by directly translating Vulkan->Webgl in a completly custom matter. Not allowing compilers to ruin / bloat what we are trying to implement.

> Note: The statement above does not apply to anything 2d related until you get to the relm of having things on top of each other.

### Folder Structure

-- Include: The c++ library itself called include beacuse it is included into react as a dependency.

-- SRC: Typescript source for any provider actions / translating to typescript.

## Current State

> Note: Update to gif to show the selecting and resizing of objects inside the 'Scene'.

![docs](docs/state.png)