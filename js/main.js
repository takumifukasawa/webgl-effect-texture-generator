// ---------------------------------------------------------------
// constants
// ---------------------------------------------------------------

const RESOLUTION = 512;
const GRID_SIZE = 8;

const fullQuadVertexShaderSrc = `#version 300 es

precision highp float;

layout (location = 0) in vec2 position;
layout (location = 1) in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const postprocessFragmentShaderSrc = `#version 300 es

precision highp float;

uniform sampler2D uTexture;

in vec2 vUv;

out vec4 outColor;

void main() {
    vec4 textureColor = texture(uTexture, vUv);
    outColor = textureColor;
}
`;

/**
 *
 * @param path
 * @returns {Promise<string>}
 */
const fetchShaderSrc = async (path) => {
    const response = await fetch(path);
    return response.text();
}

/**
 * 
 * @param gl
 * @param data
 * @returns {WebGLBuffer | AudioBuffer}
 */
const createVBO = (gl, data) => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
}

/**
 *
 * @param gl
 * @param vertexShader
 * @param fragmentShader
 * @returns {WebGLProgram}
 */
const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        return program;
    } else {
        console.error(gl.getProgramInfoLog(program));
    }
}

/**
 *
 * @param gl
 * @param type
 * @param src
 * @returns {WebGLShader}
 */
const createShader = (gl, type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    } else {
        console.error(gl.getShaderInfoLog(shader));
    }
}

const createFramebuffer = (gl, texture) => {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return framebuffer;
}

const createTexture = (gl, width, height) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
    );
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

// -----------------------------------------------------------------


// const textarea = document.getElementById("js-input-code");
// 
// textarea.addEventListener("input", () => {
//     console.log(textarea.value);
// });

const canvas = document.getElementById("js-canvas");
const gl = canvas.getContext("webgl2");


const materialPrograms = new Map();

let currentTargetMaterialProgram = null;
let postProcessProgram = null;

const offScreenTexture = createTexture(gl, RESOLUTION, RESOLUTION);
const framebuffer = createFramebuffer(gl, offScreenTexture);

/**
 * 
 * @param program
 */
const createFullQuadGeometry = (program) => {
    const attributes = {
        // 0
        leftBottom: {
            position: [-1, -1],
            uv: [0, 0]
        },
        // 1
        rightBottom: {
            position: [1, -1],
            uv: [1, 0]
        },
        // 2
        leftTop: {
            position: [-1, 1],
            uv: [0, 1]
        },
        // 3
        rightTop: {
            position: [1, 1],
            uv: [1, 1]
        },
    };

    const positions = new Float32Array([
        // triangle 0
        ...attributes.leftBottom.position,
        ...attributes.rightBottom.position,
        ...attributes.leftTop.position,
        // triangle 1
        ...attributes.rightBottom.position,
        ...attributes.rightTop.position,
        ...attributes.leftTop.position,
    ]);
    const uvs = new Float32Array([
        // triangle 0
        ...attributes.leftBottom.uv,
        ...attributes.rightBottom.uv,
        ...attributes.leftTop.uv,
        // triangle 1
        ...attributes.rightBottom.uv,
        ...attributes.rightTop.uv,
        ...attributes.leftTop.uv,
    ]);

    const positionVBO = createVBO(gl, positions);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionVBO);
    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uvVBO = createVBO(gl, uvs);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvVBO);
    const uvLocation = gl.getAttribLocation(program, "uv");
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
}

const setSize = () => {
};

/**
 * 
 * @param time
 */
const tick = (time) => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    if (currentTargetMaterialProgram != null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(currentTargetMaterialProgram);
        const uniformLocationResolution = gl.getUniformLocation(currentTargetMaterialProgram, "uResolution");
        gl.uniform2fv(uniformLocationResolution, new Float32Array([RESOLUTION, RESOLUTION]));
        const uniformLocationGridSize = gl.getUniformLocation(currentTargetMaterialProgram, "uGridSize");
        gl.uniform2fv(uniformLocationGridSize, new Float32Array([GRID_SIZE, GRID_SIZE]));
        const uniformLocationTime = gl.getUniformLocation(currentTargetMaterialProgram, "uTime");
        gl.uniform1f(uniformLocationTime, time / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.useProgram(postProcessProgram);
    let activeTextureIndex = 0;
    gl.activeTexture(gl.TEXTURE0 + activeTextureIndex);
    gl.bindTexture(gl.TEXTURE_2D, offScreenTexture);
    const uniformLocationTexture = gl.getUniformLocation(postProcessProgram, "uTexture");
    gl.uniform1i(uniformLocationTexture, activeTextureIndex);
    activeTextureIndex++;
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();
    
    window.requestAnimationFrame(tick);
}

/**
 * 
 * @returns {Promise<void>}
 */
const main = async () => {
    const shadersPath = "/shaders";
    const randomNoiseFragmentShaderPath = `${shadersPath}/random-noise.glsl`;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, fullQuadVertexShaderSrc);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, await fetchShaderSrc(randomNoiseFragmentShaderPath));
    const program = createProgram(gl, vertexShader, fragmentShader);

    const postProcessVertexShader = createShader(gl, gl.VERTEX_SHADER, fullQuadVertexShaderSrc);
    const postProcessFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, postprocessFragmentShaderSrc);
    postProcessProgram = createProgram(gl, postProcessVertexShader, postProcessFragmentShader);

    createFullQuadGeometry(program);
    createFullQuadGeometry(postProcessProgram);

    materialPrograms.set("random-noise", program);
    currentTargetMaterialProgram = program;

    window.requestAnimationFrame(tick);
}

await main();
