// Canvas.tsx
import React, { useEffect, useRef, useState } from "react";
import sceneManager from "../sceneManager"; // Import your scene manager

interface CanvasProps {
  children?: React.ReactNode;
}

const Canvas: React.FC<CanvasProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<any>(null); // Reference to renderer (canvas or SDL_Renderer)

  useEffect(() => {
    const initializeScene = async () => {
      await sceneManager.initialize(); // Wait for WASM scene to initialize
      setIsInitialized(true);
    };

    initializeScene();

    return () => {
      // Optional cleanup when the component unmounts
      sceneManager.clear();
    };
  }, []);

  // Function to handle updating and rendering
  useEffect(() => {
    if (!isInitialized) return;

    const animate = () => {
      const deltaTime = 0.016; // Example deltaTime for 60 FPS
      sceneManager.updateScene(deltaTime);
      sceneManager.renderScene(rendererRef.current);
      requestAnimationFrame(animate);
    };

    animate(); // Start the animation loop

    return () => {
      cancelAnimationFrame(animate);
    };
  }, [isInitialized]);

  // Handle adding shapes from children
  const addShape = (shape: string) => {
    sceneManager.addShape(shape);
  };

  // Execute the children code to add shapes
  useEffect(() => {
    if (children) {
      // This will run the JSX code inside the Canvas component
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.props && child.props.shape) {
          addShape(child.props.shape); // Add the shape dynamically
        }
      });
    }
  }, [children]);

  return (
    <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
      <div
        ref={rendererRef}
        style={{ width: "100%", height: "100%", backgroundColor: "black" }}
      >
        {/* The canvas rendering area */}
      </div>
    </div>
  );
};

export default Canvas;
