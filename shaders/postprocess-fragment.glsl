#version 300 es

precision highp float;

uniform sampler2D uSrcTexture;

in vec2 vUv;

out vec4 outColor;

const float EPS = .00001;

// mat2 rot2(float rad) {
//     return mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
// }

float circularMask(in vec2 uv) {
    vec2 p = abs(fract(uv) - vec2(0.5)) * 2.;
    return max(1. - dot(p, p), EPS);
}

float edgeMask(in vec2 uv, float band, float rate) {
    vec2 p = abs(fract(uv) - vec2(0.5)) * 2.;
    float e = max(1. - max(p.x, p.y), EPS);
    return e;

    // test smooth only edge
    // float s = smoothstep(1. - band, 1., e) * (1. - smoothstep(1., 1. + band, e));
    // float s = smoothstep(1. - band, 1., e) * (1. - smoothstep(1., 1. + band, e));
    // s *= rate;
    // return 1. - e;
    // return s;
}

void main() {
    vec2 uv = vUv;
    vec4 textureColor = texture(uSrcTexture, vUv);

    float centerMask = circularMask(uv);
    float edgeCircularMask = circularMask(uv + vec2(.5));

    float edgeMask = edgeMask(uv, .1, .1);

    float accCenterMask = clamp(0., 1., centerMask);

    float accEdgeMask = mix(edgeMask, edgeCircularMask, 1.);

    float accTotalMask = accCenterMask + accEdgeMask;

    vec4 centerColor = texture(uSrcTexture, uv);
    vec4 edgeColor = texture(uSrcTexture, uv + vec2(.5));

    vec4 result =
        centerColor * accCenterMask / accTotalMask
        + edgeColor * accEdgeMask / accTotalMask;
    
    outColor = vec4(result.xyz, 1.);
   
    // for debug
    // outColor = centerColor;
}
