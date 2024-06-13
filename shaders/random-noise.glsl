#version 300 es

precision highp float;

in vec2 vUv;

out vec4 outColor;

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

void main() {
    vec2 resolution = vec2(8.);

    vec2 uv = vUv;
    outColor = vec4(vUv, 0.0, 1.0);
   
    vec2 gridIndices = floor(vUv * resolution) / resolution;
    vec2 gridFracts = mod(vUv * resolution, 1.);

    float r = rand(gridIndices + uTime);
    
    outColor = vec4(vec3(r), 1.);
}
