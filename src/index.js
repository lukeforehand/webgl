
import THREE from 'three';

import OrbitControls from './orbit_controls.js';

import fragmentShader from './shaders/luke.frag';
import vertexShader from './shaders/luke.vert';

import lukepixels from './luke_pixels.jpg';

var renderer;
var scene;
var camera;
var controls;

var sphere;
var uniforms;

var clock = new THREE.Clock();

init();
animate();

function init() {

  // Renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(0, 0, 1000);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.minDistance = 100;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI;

  // sphere
  var geometry = new THREE.SphereBufferGeometry(250, 32, 32);
  uniforms = {
    time: { value: clock.getDelta() },
    texture: { value: new THREE.TextureLoader().load(lukepixels) }
  };
  uniforms.texture.value.wrapS = uniforms.texture.value.wrapT = THREE.RepeatWrapping;
  var material = new THREE.ShaderMaterial({
    uniforms,
    fragmentShader: fragmentShader,
    vertexShader: vertexShader
  });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  render();
}

function render() {
  uniforms.time.value += clock.getDelta();
  renderer.render(scene, camera);
}
