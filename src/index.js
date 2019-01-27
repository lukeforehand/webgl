
import THREE from 'three';

import OrbitControls from './orbit_controls.js';

import fragmentShader from './shaders/luke.frag';
import vertexShader from './shaders/luke.vert';

import snowVertShader from './shaders/snow.vert';
import snowFragShader from './shaders/snow.frag';

import lukepixels from './luke_pixels.jpg';
import galaxypixels from './galaxy.jpg';

import music from './east_beat.m4a';

var renderer;
var scene;
var camera;
var controls;
var backgroundUniforms;
var uniformsArray;
var clock = new THREE.Clock();

var soundFile;

init();
animate();

function init() {

  // Music
  soundFile = document.createElement("audio");
  document.body.appendChild(soundFile);
  soundFile.preload = "auto";
  soundFile.setAttribute("controls", "");
  var src = document.createElement("source");
  src.src = music;
  soundFile.appendChild(src);
  soundFile.volume = 1.000000;
  soundFile.load();

  // Renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Music starts with scene interaction
  renderer.domElement.addEventListener("click", function() {
    soundFile.play();
  });
    renderer.domElement.addEventListener("touchend", function() {
    soundFile.play();
  });

  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 4000);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.minDistance = 100;
  controls.maxDistance = 500;
  //controls.minPolarAngle = Math.PI / 2;
  //controls.maxPolarAngle = Math.PI / 2;

  // background
  var geometry = new THREE.SphereGeometry(1000, 32, 32);
  backgroundUniforms = {
    time: { value: 0.0 },
    resolution: { value: [window.innerWidth, window.innerHeight]}
  };
  var material = new THREE.ShaderMaterial({
    uniforms: backgroundUniforms,
    fragmentShader: snowFragShader,
    vertexShader: snowVertShader,
    side: THREE.BackSide
  });
  scene.add(new THREE.Mesh(geometry, material));

  uniformsArray = [];
  for (var i = 0; i < 100; i++) {
    geometry = new THREE.SphereBufferGeometry(50, 20, 10);
    var uniforms = {
      time: { value: 0.0 },
      speed: { value: Math.floor(Math.random() * 100) + 10 },
      scale: { value: 2.0 },
      texture: { value: new THREE.TextureLoader().load(lukepixels) }
    };
    uniforms.texture.value.wrapS = uniforms.texture.value.wrapT = THREE.RepeatWrapping;
    material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      fragmentShader: fragmentShader,
      vertexShader: vertexShader
    });
    uniformsArray.push(uniforms);
    var sphere = new THREE.Mesh(geometry, material);
    var max = 1000;
    var min = -1000;
    sphere.position.set(
      Math.floor(Math.random() * (max - min + 1)) + min,
      Math.floor(Math.random() * (max - min + 1)) + min,
      Math.floor(Math.random() * (max - min + 1)) + min);
    sphere.rotation.set(
      Math.floor(Math.random() * 360) + 1,
      Math.floor(Math.random() * 360) + 1,
      Math.floor(Math.random() * 360) + 1);
    scene.add(sphere);
  }

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
  var delta = clock.getDelta();
  backgroundUniforms.time.value += delta;
  for (var i in uniformsArray) {
    uniformsArray[i].time.value += delta;
  }
  renderer.render(scene, camera);
}
