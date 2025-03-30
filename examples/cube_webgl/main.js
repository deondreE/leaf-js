const canvas = document.getElementById("webgl-canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL not supported");
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

// Vertex Shader
const vertexShaderSource = `
    attribute vec4 a_position;
    attribute vec4 a_color;
    uniform mat4 u_matrix;
    varying vec4 v_color;
    void main() {
        gl_Position = u_matrix * a_position;
        v_color = a_color;
    }
`;

// Fragment Shader
const fragmentShaderSource = `
    precision mediump float;
    varying vec4 v_color;
    void main() {
        gl_FragColor = v_color;
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}
gl.useProgram(program);

// Cube Vertices
const positions = new Float32Array([
    // Front
    -0.5, -0.5,  0.5,  0, 0, 1,
     0.5, -0.5,  0.5,  0, 0, 1,
     0.5,  0.5,  0.5,  0, 0, 1,
    -0.5,  0.5,  0.5,  0, 0, 1,

    // Back
    -0.5, -0.5, -0.5,  1, 0, 0,
     0.5, -0.5, -0.5,  1, 0, 0,
     0.5,  0.5, -0.5,  1, 0, 0,
    -0.5,  0.5, -0.5,  1, 0, 0,
]);

const indices = new Uint16Array([
    0, 1, 2,  2, 3, 0,  // Front
    4, 5, 6,  6, 7, 4,  // Back
    0, 1, 5,  5, 4, 0,  // Bottom
    2, 3, 7,  7, 6, 2,  // Top
    0, 3, 7,  7, 4, 0,  // Left
    1, 2, 6,  6, 5, 1,  // Right
]);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

const a_position = gl.getAttribLocation(program, "a_position");
const a_color = gl.getAttribLocation(program, "a_color");

gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 6 * 4, 0);
gl.enableVertexAttribArray(a_position);

gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, 6 * 4, 3 * 4);
gl.enableVertexAttribArray(a_color);

const u_matrix = gl.getUniformLocation(program, "u_matrix");

function getRotationMatrix(angleX, angleY) {
    const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    return new Float32Array([
        cosY,  0, sinY, 0,
        sinX * sinY, cosX, -sinX * cosY, 0,
        -cosX * sinY, sinX, cosX * cosY, 0,
        0, 0, 0, 1
    ]);
}

let angleX = 0, angleY = 0;

function drawScene() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    angleX += 0.01;
    angleY += 0.01;
    const matrix = getRotationMatrix(angleX, angleY);
    gl.uniformMatrix4fv(u_matrix, false, matrix);

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(drawScene);
}

drawScene();