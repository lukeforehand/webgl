// attribute is a link between vertex shader and webgl per vertex
// uniform is a link between shader and webgl, does not change
// varying is a link between vertex shader and fragment shader for interpolated data

// vertex shaders transform (move) the geometry (triangle)
// handles each vertex coordinates, normals, lighting, colors, and texture coordinates.

// predefined:
// highp vec4 gl_Position; // Holds the position of the vertex.
// mediump float gl_PointSize; // Holds the transformed point size. The units for this variable are pixels.

uniform float amplitude;
attribute float displacement;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vNormal = normal;
  vUv = ( 0.5 + amplitude ) * uv + vec2( amplitude );
  vec3 newPosition = position + amplitude * normal * vec3( displacement );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
}
