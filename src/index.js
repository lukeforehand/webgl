
import THREE from 'three';

import Water from './water.js';
import waternormals from './waternormals.jpg';

import Sky from './sky.js';

import FlyControls from './controls.js';

var container;
var camera, scene, renderer, controls, light;
var water, sphere;

var clock = new THREE.Clock();

init();
animate();

function init() {
  container = document.body;
  //
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );
  //
  scene = new THREE.Scene();
  //
  camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 20000 );
  camera.position.set( 30, 30, 100 );

  controls = new FlyControls( camera );
  controls.movementSpeed = 1000;
  controls.domElement = renderer.domElement;
  controls.rollSpeed = Math.PI / 24;
  controls.autoForward = false;
  controls.dragToLook = false;

  //
  light = new THREE.DirectionalLight( 0xffffff, 0.8 );
  scene.add( light );
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
  var uniforms = sky.material.uniforms;
  uniforms.turbidity.value = 10;
  uniforms.rayleigh.value = 2;
  uniforms.luminance.value = 1;
  uniforms.mieCoefficient.value = 0.005;
  uniforms.mieDirectionalG.value = 0.8;
  var parameters = {
    distance: 400,
    inclination: 0.49,
    azimuth: 0.205
  };
  var cubeCamera = new THREE.CubeCamera( 1, 20000, 256 );
  cubeCamera.renderTarget.texture.generateMipmaps = true;
  cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
  function updateSun() {
    var theta = Math.PI * ( parameters.inclination - 0.5 );
    var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );
    light.position.x = parameters.distance * Math.cos( phi );
    light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
    light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );
    sky.material.uniforms.sunPosition.value = light.position.copy( light.position );
    water.material.uniforms.sunDirection.value.copy( light.position ).normalize();
    //cubeCamera.update( renderer, scene );
  }
  updateSun();
  //
  var geometry = new THREE.BufferGeometry( 20, 1 );
  //var count = geometry.attributes.position.count;
  var colors = [];
  var color = new THREE.Color();
  for ( var i = 0; i < 20; i += 3 ) {
    color.setHex( Math.random() * 0xffffff );
    colors.push( color.r, color.g, color.b );
    colors.push( color.r, color.g, color.b );
    colors.push( color.r, color.g, color.b );
  }
  geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
  var material = new THREE.MeshStandardMaterial( {
    vertexColors: THREE.VertexColors,
    roughness: 0.0,
    envMap: cubeCamera.renderTarget.texture,
    side: THREE.DoubleSide
  } );
  sphere = new THREE.Mesh( geometry, material );
  scene.add( sphere );
  //
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
  var time = performance.now() * 0.001;
  sphere.position.y = Math.sin( time ) * 20 + 5;
  sphere.rotation.x = time * 0.5;
  sphere.rotation.z = time * 0.51;
  water.material.uniforms.time.value += 1.0 / 60.0;

  controls.update( clock.getDelta() );

  renderer.render( scene, camera );
}