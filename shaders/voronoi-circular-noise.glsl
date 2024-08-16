#version 300 es

precision highp float;

#include <common_header>

uniform float uVoronoiPower;
uniform float uOneMinus;

// const float PHI = 1.61803398874989484820459; // Φ = Golden Ratio 
// 
// float goldNoise(in vec2 xy, in float seed) {
//     return fract(tan(distance(xy*PHI, xy)*seed)*xy.x);
// }

// ref: https://thebookofshaders.com/12/
float voronoiCircular(in vec2 p, out vec2 outPoint) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float dist = 1.;
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(x, y);
            vec2 point = rand2m(i + neighbor);
            // point = vec2(
            //     goldNoise(i + neighbor, 100.),
            //     goldNoise(i + neighbor, 200.)
            // );
            vec2 diff = neighbor + point - f;
            float d = length(diff);
            if(d < dist) {
                dist = d;
                outPoint = point;
            }
        }
    }
    return dist;
}

void main() {
    vec2 resolution = uResolution;
    vec2 gridSize = uGridSize;
    vec2 uv = vUv;

    // voronoi noise
    vec2 point = vec2(0.);
    float result = voronoiCircular(uv * gridSize * 1. + uTime, point);
    result = saturate(result);
    result = pow(result, uVoronoiPower);
    float cell = saturate(dot(point, vec2(0., 1.)));

    outColor = vec4(result, cell, 0., 1.);
}
