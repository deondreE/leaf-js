# Leaf-js

Leaf is a 2D/3D library designed for creating games and simulations on the web. Its goal is to replace WebGL by simplifying the development of complex 3D environments. Leaf aims to make web-based games as powerful as traditional system games and improve sharing workflows for industries relying on visualizations.

> NOTE: Webgpu is currently marked expiramental and needs to be activated in the config of chrome.
> NOTE: Memory is still a large issue inside of the web.

# Future Goals

These goals are interconnected and designed to work in unison for optimal performance. The library aims to deliver a seamless experience where all components—rendering, lighting, physics, and animations—collaborate to create highly realistic simulations. Achieving 1080p at 120 FPS is the preferred standard for performance, ensuring smooth and visually appealing experiences.

1. Advanced Rendering with Lighting:
   A renderer is not just about drawing shapes; realistic lighting is fundamental to creating immersive visuals. Future updates will integrate robust lighting models to enhance depth and realism.

2. Physics-Based Interactions:
   Accurate physics simulations are crucial for modeling real-world interactions. These will be tightly coupled with rendering and animations to create cohesive and lifelike scenes.

3. High-Performance Optimization:
   Striving for 1080p resolution at 120 FPS will remain a core objective, with optimizations at every level—rendering pipeline, asset management, and scene updates.

4. Extensible Plugin System:
   Introduce a plugin architecture to allow users to expand functionality, including custom rendering pipelines, physics engines, or specialized lighting systems.

## Engine Features

## Theoretical Usage:

> Note: None of this is implemented currently just an idea of how I want it to work.

```typescript
import Leaf from 'leaf-js';

const Simulation = () => {
    Leaf.scene({
        name: 'simulation',
        models: {
            // Write custom cobe on the update allowing access directly to the rendering thread.
            waterparticle: {
                onUpdate: () => {

                },
            },
        }
    })
}

/// Some Entry point
const runCode = () => {
    // Anything will be able to be hardcoded.
    Leaf.scene({
        name: 'new Scene',
        subscenes: [
            simulation: Simulation,
        ],
        models: [
            cube: {
                name: 'new cube',
                x: 0,
                y: 0,
                w: 100,
                h: 100,
            },
            importedmodle: {
                // This will import the animation
                location: 'models/model.fbx',
                hasAnimation: true,
                startAnimation: true,
            }
        ],
        // Simple animations can be programmed by referencing the object name.
        animations: [
            rotation: {
                newcube: {
                    x: -90,
                    time: '1s',
                }
            }
        ]
    });
}
```
