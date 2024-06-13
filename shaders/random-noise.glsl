#version 300 es

precision highp float;

in vec2 vUv;

out vec4 outColor;

uniform vec2 uResolution;
uniform vec2 uGridSize;
uniform float uTime;

// ref: https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
float rand(vec2 co) {
    return mod(
        sin(
            dot(
                co.xy,
                vec2(12.9898, 78.233)
            )
        ) * 43758.5453,
        1.
    );
}

float calcRandomNoise(vec2 p) {
    vec2 i = floor(p);
    return rand(i);
}

float calcValueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    vec2 g00 = vec2(i);
    vec2 g01 = vec2(i) + vec2(1., 0.);
    vec2 g10 = vec2(i) + vec2(0., 1.);
    vec2 g11 = vec2(i) + vec2(1., 1.);

    float r = rand(i);

    float r00 = rand(g00);
    float r10 = rand(g01);
    float r01 = rand(g10);
    float r11 = rand(g11);

    float sx = smoothstep(0., 1., f.x);
    float sy = smoothstep(0., 1., f.y);
    float vny0 = mix(r00, r10, sx);
    float vny1 = mix(r01, r11, sx);
    float vn = mix(vny0, vny1, sy);

    return vn;
}

void main() {
    vec2 resolution = uResolution;
    vec2 gridSize = uGridSize;

    vec2 uv = vUv;
    
    vec2 newUv = uv * gridSize;
    
    float result = 0.;
    
    // result = calcRandomNoise(newUv);
    result = calcValueNoise(newUv);
    
    outColor = vec4(vec3(result), 1.);
}
