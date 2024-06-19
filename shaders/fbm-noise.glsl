#version 300 es

precision highp float;

#include <common_header>

// ---------------------------------------------------------------------
// ref: https://www.shadertoy.com/view/ltB3zD

const float PHI = 1.61803398874989484820459; // Φ = Golden Ratio 

float goldNoise(in vec2 xy, in float seed) {
    return fract(tan(distance(xy*PHI, xy)*seed)*xy.x);
}

// ---------------------------------------------------------------------

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    // Four corners in 2D of a tile
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
    (c - a)* u.y * (1.0 - u.x) +
    (d - b) * u.x * u.y;
}

float fbmNoise(vec2 p) {
    float value = 0.;
    float amplitude = .5;
    float frequency = 0.;
    for(int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        // value += amplitude * goldNoise(p * 512., 1.);
        p *= 2.;
        amplitude *= .5;
    }
    return value;
}

void main() {
    vec2 resolution = uResolution;
    vec2 gridSize = uGridSize;
    vec2 uv = vUv;

    // fbm noise
    // float result = goldNoise(uv * gridSize * resolution, 1.);
    float result = fbmNoise(uv * 2.);
    
    outColor = vec4(vec3(result), 1.);
}
