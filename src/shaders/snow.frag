uniform float time;
uniform vec2 resolution;

varying vec2 vUv;

float snow(vec2 uv, float scale) {
  float w = smoothstep(9., 0., -uv.y * (scale / 10.));
  if (w < .1) return 0.;
  uv += time / scale;
  uv.y -= time * 2./ scale;
  uv.x += sin(uv.y + time * .5) / scale;
  uv *= scale;
  vec2 s = floor(uv), f = fract(uv), p; float k=3., d;
  p = .5 + .35 * sin(11. * fract(sin((s + p + scale) * mat2(7, 3, 6, 5)) * 5.)) - f;
  d = length(p);
  k = min(d, k);
  k = smoothstep(0., k, sin(f.x + f.y) * 0.01);
  return k * w;
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy * 2. - resolution.xy) / min(resolution.x, resolution.y);
  //vec2 uv = vUv;
  float c = snow(uv, 30.) * .3;
  c += snow(uv, 20.) * .5;
  c += snow(uv, 15.) * .8;
  c += snow(uv, 10.);
  c += snow(uv, 8.);
  c += snow(uv, 6.);
  c += snow(uv, 5.);
  gl_FragColor = vec4(c, c, 0, c);
}
