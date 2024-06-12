#version 300 es

precision highp float;

in vec2 vUv;

out vec4 outColor;

void main() {
    vec2 uv = vUv;
    outColor = vec4(vUv, 0.0, 1.0);
}
