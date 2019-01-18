
import THREE from 'three';

import Water from './water.js';
import waternormals from './waternormals.jpg';

import Sky from './sky.js';

import Controls from './controls.js';

var camera, scene, renderer, controls, light;
var water;

var clock = new THREE.Clock();

init();
animate();

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  window.onresize = onWindowResize;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 20000 );
  camera.position.set( 30, 30, 100 );

  // Controls
  controls = new Controls( camera );
  controls.movementSpeed = 1000;
  controls.domElement = renderer.domElement;
  controls.rollSpeed = Math.PI / 24;
  controls.autoForward = false;
  controls.dragToLook = false;
  var controlsGuide = document.createElement('div');
  controlsGuide.innerHTML = '<b>WASD</b> move, <b>R|F</b> up | down, <b>Q|E</b> roll, <b>up|down</b> pitch, <b>left|right</b> yaw';
  document.body.appendChild(controlsGuide);

  // Light
  light = new THREE.DirectionalLight( 0xffffff, 0.8 );

  // Water
  var waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );
  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load( waternormals, function ( texture ) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      } ),
      alpha: 1.0,
      sunDirection: light.position.clone().normalize(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );
  water.rotation.x = - Math.PI / 2;
  scene.add( water );

  // Skybox
  var sky = new Sky();
  sky.scale.setScalar( 10000 );
  scene.add( sky );
  sky.material.uniforms.turbidity.value = 10;
  sky.material.uniforms.rayleigh.value = 2;
  sky.material.uniforms.luminance.value = 1;
  sky.material.uniforms.mieCoefficient.value = 0.005;
  sky.material.uniforms.mieDirectionalG.value = 0.8;
  
  var parameters = {
    distance: 400,
    inclination: 0.49,
    azimuth: 0.205
  };

  var theta = Math.PI * ( parameters.inclination - 0.5 );
  var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );
  light.position.x = parameters.distance * Math.cos( phi );
  light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
  light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );
  sky.material.uniforms.sunPosition.value = light.position.copy( light.position );
  water.material.uniforms.sunDirection.value.copy( light.position ).normalize();

  document.body.appendChild( renderer.domElement );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  requestAnimationFrame( animate );
  render();
}

function render() {
  water.material.uniforms.time.value += 1.0 / 60.0;
  controls.update( clock.getDelta() );
  renderer.render( scene, camera );
}
