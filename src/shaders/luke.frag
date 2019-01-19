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

varying vec3 vNormal;
varying vec2 vUv;

uniform vec3 color;
uniform sampler2D texture;

void main(void) {
  vec3 light = vec3( 0.5, 0.2, 1.0 );
  light = normalize( light );
  float dProd = dot( vNormal, light ) * 0.5 + 0.5;
  vec4 tcolor = texture2D( texture, vUv );
  vec4 gray = vec4( vec3( tcolor.r * 0.3 + tcolor.g * 0.59 + tcolor.b * 0.11 ), 1.0 );
  gl_FragColor = gray * vec4( vec3( dProd ) * vec3( color ), 1.0 );
}
