import './App.css'
import Module from '../public/leaf.js';
import { useEffect, useRef } from 'react';

function App() {
  const canvasRef = useRef(null);
  const rectRef = useRef(null);

  useEffect(() => {
    // Load the WebAssembly module
    Module().then((ModuleInstance) => {
      const SDL_Color = ModuleInstance.SdlColor(0, 0, 100, 255); // { r: 255, g: 0, b: 0, a: 255 }
      const Rectangle = new ModuleInstance["Rectangle"](50, 50, 100, SDL_Color, true);

      // Create a rectangle instance
      rectRef.current = Rectangle;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Call Rectangle render
        // Use bindings to draw the rectangle manually if needed
        Rectangle.Render(ctx);
      };

      render();

      const handleMouseDown = (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (rectRef.current.IsWithinBounds(x, y)) {
          console.log("Clicked inside rectangle!");
        }
      };

      canvas.addEventListener("mousedown", handleMouseDown);

      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
      };
    }, []);
  })

  return (
    <>
      <div>
        <canvas ref={canvasRef} width={800} height={600} style={{ border: "1px solid black" }}></canvas>
      </div>
    </>
  )
}

export default App
