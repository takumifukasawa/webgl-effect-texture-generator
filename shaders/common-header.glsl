
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

// Some useful functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

/*
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
*/
