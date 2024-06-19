#version 300 es

precision highp float;

uniform sampler2D uSrcTexture;

in vec2 vUv;

out vec4 outColor;

const float EPS = .001;

// mat2 rot2(float rad) {
//     return mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
// }

float circularMask(in vec2 uv, in float scale) {
    // vec2 p = abs(fract(uv) - vec2(0.5)) * 2.;
    // return max(1. - dot(p, p), EPS);
    
    vec2 p = abs(uv - vec2(0.5)) * scale;
    // return clamp(0., 1., max(1. - dot(p, p), EPS));
    return smoothstep(0., 1., max(1. - dot(p, p), EPS));
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

    float edgeCircularScale = 2.;
    float centerMask = circularMask(uv, 2.);
    float leftTopEdgeCircularMask = circularMask(uv + vec2(.5, -.5), edgeCircularScale);
    float leftBottomEdgeCircularMask = circularMask(uv + vec2(.5, .5), edgeCircularScale);
    float rightTopEdgeCircularMask = circularMask(uv + vec2(-.5, -.5), edgeCircularScale);
    float rightBottomEdgeCircularMask = circularMask(uv + vec2(-.5, .5), edgeCircularScale);

    float edgeMask = edgeMask(uv, .1, .1);

    float accCenterMask = clamp(0., 1., centerMask);

    float accEdgeMask = clamp(
        0.,
        1.,
        mix(
            edgeMask,
            // edgeCircularMask,
            leftTopEdgeCircularMask + leftBottomEdgeCircularMask + rightTopEdgeCircularMask + rightBottomEdgeCircularMask,
            1.
        )
    );

    // accEdgeMask = edgeMask + leftTopEdgeCircularMask + leftBottomEdgeCircularMask + rightTopEdgeCircularMask + rightBottomEdgeCircularMask;

    float accTotalMask = accCenterMask + accEdgeMask;

    vec4 centerColor = texture(uSrcTexture, uv);
    vec4 edgeColor = texture(uSrcTexture, uv + vec2(.5));

    vec4 result =
        centerColor * accCenterMask / accTotalMask
        + edgeColor * accEdgeMask / accTotalMask;
    
    outColor = vec4(result.xyz, 1.);
   
    // for debug
    // outColor = centerColor * accCenterMask / accTotalMask;
    // outColor = edgeColor * accEdgeMask / accTotalMask;
    // outColor = vec4(vec3(accEdgeMask), 1.);
    // outColor = edgeColor;
}
