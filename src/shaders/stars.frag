// "Over the Moon" by Martijn Steinrucken aka BigWings - 2015
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

// GLSLSandbox implementation of Shadertoy's https://www.shadertoy.com/view/4s33zf

uniform float time;
uniform vec2 resolution;

varying vec2 vUv;

#define MOD3 vec3(.1031, .11369, .13787)

float hash12(vec2 p) {
  vec3 p3  = fract(vec3(p.xyx) * MOD3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}

float stars(vec2 uv, float t) {
    t *= 3.;

    float n1 = hash12(uv * 10000.);
    float n2 = hash12(uv * 11234.);
    float alpha1 = pow(n1, 20.);
    float alpha2 = pow(n2, 20.);

    float twinkle = sin((uv.x - t + cos(uv.y * 20. + t)) * 10.);
    twinkle *= cos((uv.y * .234 - t * 3.24 + sin(uv.x * 12.3 + t * .243)) * 7.34);
    twinkle = (twinkle + 1.) / 2.;
    return alpha1 * alpha2 * twinkle;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  float t = time * .05;

  vec2 bgUV = uv * vec2(resolution.x / resolution.y, 1.);
  vec4 col = vec4(0);

  col += stars(uv, t);

  gl_FragColor = vec4(col);
}
