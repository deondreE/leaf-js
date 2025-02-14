import {
  cubeVertexArray,
  cubeVertexSize,
  cubePositionOffset,
  cubeColorOffset,
  cubeUVOffset,
  cubeVertexCount,
} from "./src/meshes/cube"; // Adjust the path
import {
  quadVertexArray,
  quadVertexSize,
  quadPositionOffset,
  quadColorOffset,
  quadUVOffset,
  quadVertexCount,
} from "./src/meshes/quad"; // Adjust the path
import {
  capsuleVertexArray,
  capsuleIndexArray,
  capsuleVertexSize,
  capsulePositionOffset,
  capsuleColorOffset,
  capsuleUVOffset,
  capsuleVertexCount,
  capsuleIndexCount,
} from "./src/meshes/capsule"; // Adjust the path

import { mat4, quat } from "gl-matrix"; // Import gl-matrix

async function renderScene() {
  if (!navigator.gpu) {
    console.error("WebGPU is not supported.");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error("No WebGPU adapter available.");
    return;
  }

  const device = await adapter.requestDevice();

  const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement; // Replace with your canvas ID
  const context = canvas.getContext("webgpu") as GPUCanvasContext;

  if (!context) {
    console.error("Failed to get WebGPU context.");
    return;
  }

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device: device,
    format: presentationFormat,
    alphaMode: "opaque",
  });

  // --- Buffer Creation ---
  // Cube
  const cubeVertexBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(cubeVertexBuffer.getMappedRange()).set(cubeVertexArray);
  cubeVertexBuffer.unmap();

  // Quad
  const quadVertexBuffer = device.createBuffer({
    size: quadVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(quadVertexBuffer.getMappedRange()).set(quadVertexArray);
  quadVertexBuffer.unmap();

  // Capsule
  const capsuleVertexBuffer = device.createBuffer({
    size: capsuleVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(capsuleVertexBuffer.getMappedRange()).set(
    capsuleVertexArray
  );
  capsuleVertexBuffer.unmap();

  const capsuleIndexBuffer = device.createBuffer({
    size: capsuleIndexArray.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint16Array(capsuleIndexBuffer.getMappedRange()).set(capsuleIndexArray);
  capsuleIndexBuffer.unmap();

  // --- Camera and Projection ---
  const fov = Math.PI / 4; // Field of view in radians
  const aspect = canvas.width / canvas.height;
  const near = 0.1;
  const far = 100;

  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fov, aspect, near, far);

  const viewMatrix = mat4.create();
  const eye = [4, 30, 6];
  const center = [0, 30, 0];
  const up = [0, 2, 0];
  mat4.lookAt(viewMatrix, eye, center, up);

  let cubeRotation = 0; // Rotation angle for the cube
  let capsuleRotation = 0; // Rotation angle for the capsule

  // Create uniform buffer
  const uniformBuffer = device.createBuffer({
    size: 16 * 4, // Size of mat4 (4x4 floats)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Shader
  const shaderModule = device.createShaderModule({
    code: `
      struct VertexInput {
        @location(0) position : vec4<f32>,
        @location(1) color : vec4<f32>,
        @location(2) uv : vec2<f32>,
      };

      struct VertexOutput {
        @builtin(position) position : vec4<f32>,
        @location(0) color : vec4<f32>,
        @location(1) uv : vec2<f32>,
      };

      @group(0) @binding(0) var<uniform> mvpMatrix : mat4x4<f32>;

      @vertex
      fn vertexMain(input : VertexInput) -> VertexOutput {
        var output : VertexOutput;
        output.position = mvpMatrix * input.position;
        output.color = input.color;
        output.uv = input.uv;
        return output;
      }

      @fragment
      fn fragmentMain(input : VertexOutput) -> @location(0) vec4<f32> {
        return input.color;
      }
    `,
  });

  // Pipeline
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: {
                type: "uniform",
              },
            },
          ],
        }),
      ],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: cubeVertexSize,
          attributes: [
            {
              shaderLocation: 0,
              offset: cubePositionOffset,
              format: "float32x4",
            },
            {
              shaderLocation: 1,
              offset: cubeColorOffset,
              format: "float32x4",
            },
            {
              shaderLocation: 2,
              offset: cubeUVOffset,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back", // Enable backface culling
    },
    depthStencil: {
      format: "depth32float", // Use a depth format that suits your needs
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

  // Pipeline for Quad (different vertex layout)
  const quadPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: {
                type: "uniform",
              },
            },
          ],
        }),
      ],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: quadVertexSize,
          attributes: [
            {
              shaderLocation: 0,
              offset: quadPositionOffset,
              format: "float32x4",
            },
            {
              shaderLocation: 1,
              offset: quadColorOffset,
              format: "float32x4",
            },
            {
              shaderLocation: 2,
              offset: quadUVOffset,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back", // Enable backface culling
    },
    depthStencil: {
      format: "depth32float", // Use a depth format that suits your needs
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

  // Pipeline for Capsule (different vertex layout and indexed drawing)
  const capsulePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: {
                type: "uniform",
              },
            },
          ],
        }),
      ],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: capsuleVertexSize,
          attributes: [
            {
              shaderLocation: 0,
              offset: capsulePositionOffset,
              format: "float32x4",
            },
            {
              shaderLocation: 1,
              offset: capsuleColorOffset,
              format: "float32x4",
            },
            {
              shaderLocation: 2,
              offset: capsuleUVOffset,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back", // Enable backface culling
    },
    depthStencil: {
      format: "depth32float", // Use a depth format that suits your needs
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

  // Create bind group
  // Create bind group layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "uniform",
        },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  // Create depth buffer
  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth32float",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // --- Toggling ---
  let drawCube = true;
  let drawQuad = true;
  let drawCapsule = true;

  // Function to toggle drawing of each object
  function toggleCube() {
    drawCube = !drawCube;
  }

  function toggleQuad() {
    drawQuad = !drawQuad;
  }

  function toggleCapsule() {
    drawCapsule = !drawCapsule;
  }

  // Add event listeners to buttons (assuming you have buttons with these IDs)
  const cubeButton = document.getElementById("toggle-cube");
  if (cubeButton) {
    cubeButton.addEventListener("click", toggleCube);
  } else {
    console.warn("Button with id 'toggle-cube' not found.");
  }

  const quadButton = document.getElementById("toggle-quad");
  if (quadButton) {
    quadButton.addEventListener("click", toggleQuad);
  } else {
    console.warn("Button with id 'toggle-quad' not found.");
  }

  const capsuleButton = document.getElementById("toggle-capsule");
  if (capsuleButton) {
    capsuleButton.addEventListener("click", toggleCapsule);
  } else {
    console.warn("Button with id 'toggle-capsule' not found.");
  }

  function render() {
    cubeRotation += 0.01; // Increment rotation angle for the cube
    capsuleRotation += 0.01; // Increment rotation angle for the capsule

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    // --- Draw Cube ---
    if (drawCube) {
      let modelMatrix = mat4.create();
      let mvpMatrix = mat4.create();
      mat4.rotateY(modelMatrix, modelMatrix, cubeRotation);
      mat4.translate(modelMatrix, modelMatrix, [0, 0, 0]); // Move cube to the left
      mat4.translate(modelMatrix, modelMatrix, [0, 15, 0]);
      mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
      mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
      device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix as Float32Array);

      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.setVertexBuffer(0, cubeVertexBuffer);
      passEncoder.draw(cubeVertexCount, 1, 0, 0);
    }

    // --- Draw Quad ---
    if (drawQuad) {
      let modelMatrix = mat4.create(); // Reset model matrix
      let mvpMatrix = mat4.create();
      mat4.translate(modelMatrix, modelMatrix, [5, 15, 0]); // Move quad to the right
      mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
      mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
      device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix as Float32Array);

      passEncoder.setPipeline(quadPipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.setVertexBuffer(0, quadVertexBuffer);
      passEncoder.draw(quadVertexCount, 1, 0, 0);
    }

    // --- Draw Capsule ---
    if (drawCapsule) {
      let modelMatrix = mat4.create();
      let mvpMatrix = mat4.create();
      mat4.rotateY(modelMatrix, modelMatrix, capsuleRotation);
      mat4.translate(modelMatrix, modelMatrix, [0, 0, 0]); // Move capsule back
      mat4.translate(modelMatrix, modelMatrix, [0, 30, 0]); // Move capsule up
      mvpMatrix = mat4.create();
      mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
      mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
      device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix as Float32Array);

      passEncoder.setPipeline(capsulePipeline);
      passEncoder.setVertexBuffer(0, capsuleVertexBuffer);
      passEncoder.setIndexBuffer(capsuleIndexBuffer, "uint16");
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.drawIndexed(capsuleIndexCount, 1, 0, 0, 0);
    }

    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

renderScene();
