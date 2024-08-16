#version 300 es

precision highp float;

#include <common_header>

uniform float uVoronoiPower;
uniform float uOneMinus;

float voronoiCircular(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float dist = 1.;
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(x, y);
            vec2 point = rand2m(i + neighbor);
            vec2 diff = neighbor + point - f;
            float d = length(diff);
            dist = min(dist, d);
        }
    }
    return dist;
}

void main() {
    vec2 resolution = uResolution;
    vec2 gridSize = uGridSize;
    vec2 uv = vUv;

    // voronoi noise
    // float result = voronoiEdge(uv * gridSize * 1. + uTime);
    float result = voronoiCircular(uv * gridSize * 1. + uTime);
    result = saturate(result);
    result = pow(result, uVoronoiPower);

    outColor = vec4(vec3(result), 1.);
}
