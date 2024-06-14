#version 300 es

precision highp float;

#define saturate(x) clamp(x, 0., 1.)

#define smooth(x) smoothstep(0., 1., x)

in vec2 vUv;

out vec4 outColor;

uniform vec2 uResolution;
uniform vec2 uGridSize;
uniform float uTime;

float smooth5(float t) {
    float t3 = t * t * t;
    float t4 = t * t * t * t;
    float t5 = t * t * t * t * t;
    return 6. * t5 - 15. * t4 + 10. * t3;
}

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

// ref: https://thebookofshaders.com/edit.php#11/2d-gnoise.frag
vec2 rand2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}

float randomNoise(vec2 p) {
    vec2 i = floor(p);
    return rand(i);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    vec2 i00 = vec2(i);
    vec2 i01 = vec2(i) + vec2(1., 0.);
    vec2 i10 = vec2(i) + vec2(0., 1.);
    vec2 i11 = vec2(i) + vec2(1., 1.);

    float r00 = rand(i00);
    float r10 = rand(i01);
    float r01 = rand(i10);
    float r11 = rand(i11);

    float sx = smooth(f.x);
    float sy = smooth(f.y);
    float vny0 = mix(r00, r10, sx);
    float vny1 = mix(r01, r11, sx);
    float vn = mix(vny0, vny1, sy);

    return vn;
}

float perlinNoise(vec2 p, float isImproved) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    // グリッドの格子のインデックス
    vec2 i00 = i;
    vec2 i10 = i + vec2(1., 0.);
    vec2 i01 = i + vec2(0., 1.);
    vec2 i11 = i + vec2(1., 1.);
   
    // [グリッドの格子の点 -> 現在の点] へのベクトル
    // 位置の差異
    vec2 p00 = f;
    vec2 p10 = f - vec2(1., 0.);
    vec2 p01 = f - vec2(0., 1.);
    vec2 p11 = f - vec2(1., 1.);
    
    // グリッドの格子の点のそれぞれの勾配
    // ランダムに決める
    vec2 g00 = normalize(rand2(i00));
    vec2 g10 = normalize(rand2(i10));
    vec2 g01 = normalize(rand2(i01));
    vec2 g11 = normalize(rand2(i11));

    // ランダムな勾配ベクトルと位置の差異ベクトルの内積
    float n00 = dot(g00, p00);
    float n10 = dot(g10, p10);
    float n01 = dot(g01, p01);
    float n11 = dot(g11, p11);
   
    // 補間 
    isImproved = step(.5, isImproved);
    float sx = mix(smooth(f.x), smooth5(f.x), isImproved);
    float sy = mix(smooth(f.y), smooth5(f.y), isImproved);
   
    // y=0でx間の補間 
    float mx0 = mix(n00, n10, sx);
    
    // y=1でx方向の補間 
    float mx1 = mix(n01, n11, sx);
   
    // y方向の補間
    return mix(mx0, mx1, sy);
}

// Some useful functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

//
// Description : GLSL 2D simplex noise function
//      Author : Ian McEwan, Ashima Arts
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License :
//  Copyright (C) 2011 Ashima Arts. All rights reserved.
//  Distributed under the MIT License. See LICENSE file.
//  https://github.com/ashima/webgl-noise
//
float snoise(vec2 v) {

    // Precompute values for skewed triangular grid
    const vec4 C = vec4(
        0.211324865405187,
        // (3.0-sqrt(3.0))/6.0
        0.366025403784439,
        // 0.5*(sqrt(3.0)-1.0)
        -0.577350269189626,
        // -1.0 + 2.0 * C.x
        0.024390243902439
    );
    // 1.0 / 41.0

    // First corner (x0)
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    // Other two corners (x1, x2)
    vec2 i1 = vec2(0.0);
    i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
    vec2 x1 = x0.xy + C.xx - i1;
    vec2 x2 = x0.xy + C.zz;

    // Do some permutations to avoid
    // truncation effects in permutation
    i = mod289(i);
    vec3 p = permute(
        permute( i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0)
    );

    vec3 m = max(
        0.5 - vec3(
            dot(x0,x0),
            dot(x1,x1),
            dot(x2,x2)
        ),
        0.0
    );

    m = m * m;
    m = m * m;

    // Gradients:
    //  41 pts uniformly over a line, mapped onto a diamond
    //  The ring size 17*17 = 289 is close to a multiple
    //      of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt(a0*a0 + h*h);
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

    // Compute final noise value at P
    vec3 g = vec3(0.0);
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * vec2(x1.x, x2.x) + h.yz * vec2(x1.y, x2.y);

    return 130.0 * dot(m, g);
}

void main() {
    vec2 resolution = uResolution;
    vec2 gridSize = uGridSize;

    vec2 uv = vUv;

    vec2 newUv = uv * gridSize;
    
    float result = 0.;
   
    // random noise
    // result = randomNoise(newUv);
    
    // value noise
    // result = valueNoise(newUv);
    
    // normal perlin
    result = perlinNoise(newUv, 0.);
    
    // improved perlin
    result = perlinNoise(newUv, 1.);
   
    // simplex noise
    result = snoise(newUv);
    
    // result += snoise(newUv);
    
    outColor = vec4(vec3(result), 1.);
  
    // for debug
    // float r = saturate(1. - length(uv - vec2(.5)));
    // outColor = vec4(vec3(pow(r, 8.)), 1.);
}
