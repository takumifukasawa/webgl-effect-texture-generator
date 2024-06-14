// ---------------------------------------------------------------
// constants
// ---------------------------------------------------------------

const RESOLUTION = 512;
const GRID_SIZE = 8;

const SCROLL_SPEED = 60;
// const SCROLL_SPEED = 0;

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

uniform sampler2D uSrcTexture;

in vec2 vUv;

out vec4 outColor;

const float EPS = .00001;

mat2 rot2(float rad) {
    return mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
}

float circularMask(in vec2 uv) {
    vec2 p = uv - vec2(0.5);
    return max((.5 - length(p)) / .5, .01);
}

float edgeMask(in vec2 uv, float band, float rate) {
    vec2 p = abs(rot2(3.14 / 4.) * (uv - vec2(0.5)) * 1.414);
    float e = 1. - (.5 - max(p.x, p.y)) / .5;
    float s = smoothstep(1. - band, 1., e) * (1. - smoothstep(1., 1. + band, e));
    s *= rate;
    return s;
}

void main() {
vec2 uv = vUv;
    vec4 textureColor = texture(uSrcTexture, vUv);
  
    vec2 leftTopOffset = vec2(.5, -.5);
    vec2 rightTopOffset = vec2(-.5, -.5);
    vec2 leftBottomOffset = vec2(.5, .5);
    vec2 rightBottomOffset = vec2(-.5, .5);

    float centerMask = circularMask(uv);
    float leftTopMask = circularMask(uv + leftTopOffset);
    float rightTopMask = circularMask(uv + rightTopOffset);
    float leftBottomMask = circularMask(uv + leftBottomOffset);
    float rightBottomMask = circularMask(uv + rightBottomOffset);
    
    float accMask = centerMask + leftTopMask + rightTopMask + leftBottomMask + rightBottomMask;
   
    vec3 centerColor = texture(uSrcTexture, uv).xyz;
    vec3 leftTopColor = texture(uSrcTexture, uv + leftTopOffset).xyz;
    vec3 rightTopColor = texture(uSrcTexture, uv + rightTopOffset).xyz;
    vec3 leftBottomColor = texture(uSrcTexture, uv + leftBottomOffset).xyz;
    vec3 rightBottomColor = texture(uSrcTexture, uv + rightBottomOffset).xyz;
   
    centerColor *= centerMask; 
    leftTopColor *= leftTopMask;
    rightTopColor *= rightTopMask;
    leftBottomColor *= leftBottomMask;
    rightBottomColor *= rightBottomMask;
    
    vec3 edgeColor = texture(uSrcTexture, uv + vec2(.5)).xyz;
    edgeColor *= edgeMask(uv, .1, .1);
    
    vec3 accColor = 
        centerColor
        + leftTopColor
        + rightTopColor
        + leftBottomColor
        + rightBottomColor
        + edgeColor;
    
    // for debug
    outColor = vec4(accColor, 1.);
    // outColor = vec4(vec3(edgeMask(uv)), 1.);
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
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

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

const renderCanvas = document.getElementById("js-render-canvas");
const gl = renderCanvas.getContext("webgl2");

const previewCanvas = document.getElementById("js-preview-canvas");
const previewCtx = previewCanvas.getContext("2d");

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

let prevTime = 0;

/**
 * 
 * @param time
 */
const tick = (time) => {
    const currentTime = time / 1000;
    const deltaTime = currentTime - prevTime;
    
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
        gl.uniform1f(uniformLocationTime, currentTime);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.useProgram(postProcessProgram);
    let activeTextureIndex = 0;
    gl.activeTexture(gl.TEXTURE0 + activeTextureIndex);
    gl.bindTexture(gl.TEXTURE_2D, offScreenTexture);
    const uniformLocationTexture = gl.getUniformLocation(postProcessProgram, "uSrcTexture");
    gl.uniform1i(uniformLocationTexture, activeTextureIndex);
    activeTextureIndex++;
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();

    previewCtx.clearRect(0, 0, RESOLUTION, RESOLUTION);
    const offsetX = SCROLL_SPEED * deltaTime;
    const offsetY = SCROLL_SPEED * deltaTime;
    previewCtx.translate(offsetX, offsetY);
    const pattern = previewCtx.createPattern(renderCanvas, "repeat");
    previewCtx.rect(-offsetX, -offsetY, RESOLUTION, RESOLUTION);
    previewCtx.fillStyle = pattern;
    previewCtx.fill();

    prevTime = currentTime;
    
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
