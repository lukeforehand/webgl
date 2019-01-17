/**
 * @author zz85 / https://github.com/zz85
 *
 * Based on "A Practical Analytic Model for Daylight"
 * aka The Preetham Model, the de facto standard analytic skydome model
 * http://www.cs.utah.edu/~shirley/papers/sunsky/sunsky.pdf
 *
 * First implemented by Simon Wallner
 * http://www.simonwallner.at/projects/atmospheric-scattering
 *
 * Improved by Martin Upitis
 * http://blenderartists.org/forum/showthread.php?245954-preethams-sky-impementation-HDR
 *
 * Three.js integration by zz85 http://twitter.com/blurspline
*/

import THREE from 'three';

import sunVertexShader from './sun_vertex_shader.c';
import sunFragmentShader from './sun_fragment_shader.c';

export default function Sky() {

  var shader = Sky.SkyShader;

  var material = new THREE.ShaderMaterial( {
    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: THREE.UniformsUtils.clone( shader.uniforms ),
    side: THREE.BackSide
  } );

  THREE.Mesh.call( this, new THREE.BoxBufferGeometry( 1, 1, 1 ), material );

};

Sky.prototype = Object.create( THREE.Mesh.prototype );

Sky.SkyShader = {
  uniforms: {
    "luminance": { value: 1 },
    "turbidity": { value: 2 },
    "rayleigh": { value: 1 },
    "mieCoefficient": { value: 0.005 },
    "mieDirectionalG": { value: 0.8 },
    "sunPosition": { value: new THREE.Vector3() }
  },
  vertexShader: sunVertexShader,
  fragmentShader: sunFragmentShader
};
