// fragment shader does:
// Operations on interpolated values
// Texture access
// Texture application
// Fog
// Color sum

// predefined:
// mediump vec4 gl_FragCoord; // Holds the fragment position within the frame buffer.
// bool gl_FrontFacing; // Holds the fragment that belongs to a front-facing primitive.
// mediump vec2 gl_PointCoord; // Holds the fragment position within a point (point rasterization only).
// mediump vec4 gl_FragColor; // Holds the output fragment color value of the shader
// mediump vec4 gl_FragData[n]; // Holds the fragment color for color attachment n.

varying vec2 vUv;

uniform sampler2D texture;
uniform float time;

void main(void) {
  gl_FragColor = texture2D(texture, vUv);
}
