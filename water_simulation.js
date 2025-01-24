async function main() {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('webgpu');

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();

    // Ensure the canvas fills the entire window and accounts for devicePixelRatio
    function resizeCanvas() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    context.configure({
        device: device,
        format: format,
        alphaMode: 'opaque',
        size: { width: canvas.width, height: canvas.height },
    });

    const particleCount = 10000;
    const particles = new Float32Array(particleCount * 2); // x, y for each particle

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        particles[i * 2] = Math.random() * 2 - 1; // x in range [-1, 1]
        particles[i * 2 + 1] = Math.random() * 2 - 1; // y in range [-1, 1]
    }

    const particleBuffer = device.createBuffer({
        size: particles.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(particleBuffer, 0, particles);

    const vertexShaderCode = `
    struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec4<f32>
    };

    @vertex
    fn vs_main(@location(0) position: vec2<f32>) -> VertexOutput {
        var output: VertexOutput;
        output.position = vec4<f32>(position, 0.0, 1.0); // Pass position as-is
        output.color = vec4<f32>(0.0, 0.5 + position.x, 1.0, 1.0); // Gradient blue color
        return output;
    }
    `;

    const fragmentShaderCode = `
    @fragment
    fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
        return color; // Pass the color from vertex shader
    }
    `;

    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [] });

    const pipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module: device.createShaderModule({ code: vertexShaderCode }),
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: 8,
                attributes: [{
                    format: 'float32x2',
                    offset: 0,
                    shaderLocation: 0,
                }],
            }],
        },
        fragment: {
            module: device.createShaderModule({ code: fragmentShaderCode }),
            entryPoint: 'fs_main',
            targets: [{ format }],
        },
        primitive: {
            topology: 'point-list',
        },
    });

    function updateParticles() {
        for (let i = 0; i < particleCount; i++) {
            particles[i * 2 + 1] -= 0.01; // Move down
            if (particles[i * 2 + 1] < -1) {
                particles[i * 2 + 1] = 1; // Reset to top
                particles[i * 2] = Math.random() * 2 - 1; // Random x in range [-1, 1]
            }
        }
        device.queue.writeBuffer(particleBuffer, 0, particles);
    }

    function render() {
        updateParticles();

        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();
        const renderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: [0.0, 0.0, 0.0, 1.0], // Clear to black
                loadOp: 'clear',
                storeOp: 'store',
            }],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setVertexBuffer(0, particleBuffer);
        passEncoder.draw(particleCount);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main().catch(console.error);
