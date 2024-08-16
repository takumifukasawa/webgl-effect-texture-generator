#version 300 es

precision highp float;

#include <common_header>

uniform float uVoronoiPower;
uniform float uOneMinus;

float voronoiEdge(in vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);

    vec2 mb = vec2(0.);
    vec2 mr = vec2(0.);

    float res = 8.;
    for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
            vec2 b = vec2(i, j);
            vec2 r = vec2(b) + rand2m(p + b) - f;
            float d = dot(r, r);
            if(d < res) {
                res = d;
                mr = r;
                mb = b;
            }
        }
    }

    res = 8.;
    for(int j = -2; j < 2; j++) {
        for(int i = -2; i < 2; i++) {
            vec2 b = mb + vec2(i, j);
            vec2 r = vec2(b) + rand2m(p + b) - f;
            float d = dot(.5 * (mr + r), normalize(r - mr));
            res = min(res, d);
        }
    }

    return sqrt(res);
}

void main() {
    vec2 resolution = uResolution;
    vec2 gridSize = uGridSize;
    vec2 uv = vUv;

    // voronoi noise
    float result = voronoiEdge(uv * gridSize * 1. + uTime);
    result = saturate(result);
    result = pow(result, uVoronoiPower);

    float b = 1. - smoothstep(0., .05, result);

    outColor = vec4(vec3(result), 1.);
    // outColor = vec4(vec3(b), 1.);
}
