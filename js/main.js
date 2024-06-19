import {DebuggerGUI} from "./DebuggerGUI.js";

// ---------------------------------------------------------------
// constants
// ---------------------------------------------------------------

const RESOLUTION = 512;
const GRID_SIZE = 4;

const SCROLL_SPEED = 60;
// const SCROLL_SPEED = 0;

const SHADERS_PATH = "/shaders";

const WAIT_CREATE_PATTERN_FRAMES = 40;

const EFFECT_DEFINES = {
    RANDOM_NOISE: {
        fileName: "random-noise",
        debugParams: []
    },
    PERLIN_NOISE: {
        fileName: "perlin-noise",
        debugParams: []
    },
    IMPROVE_NOISE: {
        fileName: "improve-noise",
        debugParams: []
    },
    SIMPLEX_NOISE: {
        fileName: "simplex-noise",
        debugParams: []
    },
    FBM_NOISE: {
        fileName: "fbm-noise",
        debugParams: [
            {
                label: "amplitude",
                type: "slider",
                uniformName: "uAmplitude",
                initialValue: .5,
                minValue: 0,
                maxValue: 2,
                stepValue: 0.001
            },
            {
                label: "frequency",
                type: "slider",
                uniformName: "uFrequency",
                initialValue: .4,
                minValue: 0,
                maxValue: 2,
                stepValue: 0.001
            }
        ]
    },
};

let commonHeaderShaderContent = null;
let fullQuadVertexShaderContent = null;
let postprocessFragmentShaderContent = null;
let canvasPattern = null;
let needsUpdateCanvasPatternFrames = -1;

const effectInfos = new Map();

const EFFECT_TYPE = Object.keys(EFFECT_DEFINES).reduce((acc, key) => {
    return {
        ...acc,
        [key]: key,
    }
}, {});

const INITIAL_EFFECT_TYPE = EFFECT_TYPE.FBM_NOISE;

Object.keys(EFFECT_TYPE).forEach((key) => {
    const {fileName, debugParams} = EFFECT_DEFINES[key];
    effectInfos.set(
        key,
        {
            fileName: `${fileName}.glsl`,
            program: null,
            debugParams,
        },
    );
});

const debuggerGUI = new DebuggerGUI();

// ---------------------------------------------------------------

/**
 *
 * @param path
 * @param removeCache
 * @returns {Promise<string>}
 */
const fetchWrapper = async (path, removeCache = false) => {
    const response = await fetch(path + (removeCache ? `?t=${Date.now()}` : ""));
    return response;
}

/**
 *
 * @param path
 * @returns {Promise<string>}
 */
const fetchShaderSrc = async (path) => {
    const response = await fetchWrapper(path, true);
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

/**
 *
 * @param gl
 * @param texture
 * @returns {WebGLFramebuffer}
 */
const createFramebuffer = (gl, texture) => {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return framebuffer;
}

/**
 *
 * @param gl
 * @param width
 * @param height
 * @returns {WebGLTexture}
 */
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

let postProcessProgram = null;
let currentTargetEffectKey = null;

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

    const targetProgram = effectInfos.get(currentTargetEffectKey).program;
    if (targetProgram != null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(targetProgram);
        const uniformLocationResolution = gl.getUniformLocation(targetProgram, "uResolution");
        gl.uniform2fv(uniformLocationResolution, new Float32Array([RESOLUTION, RESOLUTION]));
        const uniformLocationGridSize = gl.getUniformLocation(targetProgram, "uGridSize");
        gl.uniform2fv(uniformLocationGridSize, new Float32Array([GRID_SIZE, GRID_SIZE]));
        const uniformLocationTime = gl.getUniformLocation(targetProgram, "uTime");
        gl.uniform1f(uniformLocationTime, currentTime);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(null);
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

    if (needsUpdateCanvasPatternFrames > 0) {
        needsUpdateCanvasPatternFrames--;
    }

    if (needsUpdateCanvasPatternFrames === 0) {
        needsUpdateCanvasPatternFrames = -1;
        canvasPattern = previewCtx.createPattern(renderCanvas, "repeat");
    }

    if (canvasPattern) {
        previewCtx.clearRect(0, 0, RESOLUTION, RESOLUTION);
        const offsetX = SCROLL_SPEED * deltaTime;
        const offsetY = SCROLL_SPEED * deltaTime;
        previewCtx.translate(offsetX, offsetY);
        previewCtx.rect(-offsetX, -offsetY, RESOLUTION, RESOLUTION);
        previewCtx.fillStyle = canvasPattern;
        previewCtx.fill();
    }

    prevTime = currentTime;

    window.requestAnimationFrame(tick);
}


/**
 *
 * @param content
 * @returns {*}
 */
const buildShaderContent = (content) => {
    const str = content.replaceAll("#include <common_header>", commonHeaderShaderContent);
    return str;
};

/**
 *
 * @param key
 * @returns {Promise<void>}
 */
const loadProgram = async (key) => {
    const info = effectInfos.get(key);

    console.log("[loadProgram]", key, info)

    currentTargetEffectKey = key;
    needsUpdateCanvasPatternFrames = WAIT_CREATE_PATTERN_FRAMES;

    if (info.program != null) {
        return;
    }

    let shaderContent = await fetchShaderSrc(`${SHADERS_PATH}/${info.fileName}`);
    shaderContent = buildShaderContent(shaderContent);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, fullQuadVertexShaderContent);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shaderContent);
    const program = createProgram(gl, vertexShader, fragmentShader);

    createFullQuadGeometry(program);

    effectInfos.get(key).program = program;
}

/**
 * 
 */
const initDebugger = () => {
    debuggerGUI.addPullDownDebugger({
        label: "Effect",
        options: Object.keys(EFFECT_TYPE).map(key => {
            return {
                label: key,
                value: key
            }
        }),
        initialValue: INITIAL_EFFECT_TYPE,
        initialExec: false,
        onChange: async (key) => {
            await loadProgram(key);
        },
    });

// # slider
// label,
// onChange,
// onInput,
// initialValue,
// initialExec = true,
// minValue,
// maxValue,
// stepValue,

    effectInfos.forEach((info, key) => {
        debuggerGUI.addBorderSpacer();
        const debuggerGroup = debuggerGUI.addGroup(key, false);
        const {debugParams} = info;
        console.log(debugParams)
        debugParams.forEach(debugParam => {
            switch (debugParam.type) {
                case "slider":
                    const {initialValue, minValue, maxValue, stepValue, uniformName} = debugParam;
                    debuggerGroup.addSliderDebugger({
                        label: key,
                        initialValue,
                        minValue,
                        maxValue,
                        stepValue,
                        onChange: async (value) => {
                            const targetProgram = effectInfos.get(currentTargetEffectKey)?.program;
                            if (targetProgram != null) {
                                gl.useProgram(targetProgram);
                                const uniformLocation = gl.getUniformLocation(targetProgram, uniformName);
                                gl.uniform1f(uniformLocation, value);
                                gl.useProgram(null);
                                needsUpdateCanvasPatternFrames = true;
                            }
                        }
                    });
                    break;
            }
        });
    });

}

/**
 *
 * @returns {Promise<void>}
 */
const main = async () => {
    commonHeaderShaderContent = await fetchShaderSrc(`${SHADERS_PATH}/common-header.glsl`);
    fullQuadVertexShaderContent = await fetchShaderSrc(`${SHADERS_PATH}/full-quad-vertex.glsl`);
    postprocessFragmentShaderContent = await fetchShaderSrc(`${SHADERS_PATH}/postprocess-fragment.glsl`);

    const postProcessVertexShader = createShader(gl, gl.VERTEX_SHADER, fullQuadVertexShaderContent);
    const postProcessFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, postprocessFragmentShaderContent);
    postProcessProgram = createProgram(gl, postProcessVertexShader, postProcessFragmentShader);
    createFullQuadGeometry(postProcessProgram);

    window.document.body.appendChild(debuggerGUI.rootElement);
    initDebugger();

    await loadProgram(INITIAL_EFFECT_TYPE);

    window.requestAnimationFrame(tick);
}

await main();
