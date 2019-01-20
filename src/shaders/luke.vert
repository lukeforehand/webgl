// attribute is a link between vertex shader and webgl per vertex
// uniform is a link between shader and webgl, does not change
// varying is a link between vertex shader and fragment shader for interpolated data

// vertex shaders transform (move) the geometry (triangle)
// handles each vertex coordinates, normals, lighting, colors, and texture coordinates.

// predefined:
// highp vec4 gl_Position; // Holds the position of the vertex.
// mediump float gl_PointSize; // Holds the transformed point size. The units for this variable are pixels.

// attribute vec3 normal; // normal
// attribute vec2 uv; // texture coordinates between 0 and 1
// attribute vec3 position; // a three-dimensional vector that specifies the original location of the point in object coords

// uniform mat4 modelViewMatrix; // transformation matrix from object to world to camera space coords
// uniform mat4 projectionMatrix; // transformation matrix from camera space to screen coords

uniform float time;

varying vec3 vNormal;
varying vec2 vUv;

void main() {

  float angle = radians(mod(time, 90.0));
  float c = cos(angle);
  float s = sin(angle);
  mat4 ry = mat4(c,   0.0, -s,  0.0,
                 0.0, 1.0, 0.0, 0.0,
                 s,   0.0, c,   0.0,
                 0.0, 0.0, 0.0, 1.0);
  vNormal = normal;
  vUv = uv + vec2(0.22, 0.28); // shift texture
  gl_Position = projectionMatrix * modelViewMatrix * ry * vec4(position, 1.0);
}
