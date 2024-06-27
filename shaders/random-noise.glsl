#version 300 es

precision highp float;

#include <common_header>

uniform float uTiling;

// ---------------------------------------------------------------------
// ref: https://www.shadertoy.com/view/ltB3zD

const float PHI = 1.61803398874989484820459; // Φ = Golden Ratio 

float goldNoise(in vec2 xy, in float seed) {
    return fract(tan(distance(xy*PHI, xy)*seed)*xy.x);
}

// ---------------------------------------------------------------------

// float randomNoise(vec2 p) {
//     vec2 i = floor(p);
//     // return rand(i);
//     return (rand(i) + rand(i + 100.)) * .5;
// }

void main() {
    vec2 resolution = uResolution;
    vec2 gridSize = uGridSize;
    vec2 uv = vUv;

    // random noise
    // float result = randomNoise(uv * gridSize);
    float result = goldNoise(uv * gridSize * resolution, 1.);
    
    outColor = vec4(vec3(result), 1.);
}
