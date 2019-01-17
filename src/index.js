
import THREE from 'three';

import waternormals from './waternormals.jpg'

/**
 * @author jbouny / https://github.com/jbouny
 *
 * Work based on :
 * @author Slayvin / http://slayvin.net : Flat mirror for three.js
 * @author Stemkoski / http://www.adelphi.edu/~stemkoski : An implementation of water shader based on the flat mirror
 * @author Jonas Wagner / http://29a.ch/ && http://29a.ch/slides/2012/webglwater/ : Water shader explanations in WebGL
 */

THREE.Water = function ( geometry, options ) {

  THREE.Mesh.call( this, geometry );

  var scope = this;

  options = options || {};

  var textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512;
  var textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512;

  var clipBias = options.clipBias !== undefined ? options.clipBias : 0.0;
  var alpha = options.alpha !== undefined ? options.alpha : 1.0;
  var time = options.time !== undefined ? options.time : 0.0;
  var normalSampler = options.waterNormals !== undefined ? options.waterNormals : null;
  var sunDirection = options.sunDirection !== undefined ? options.sunDirection : new THREE.Vector3( 0.70707, 0.70707, 0.0 );
  var sunColor = new THREE.Color( options.sunColor !== undefined ? options.sunColor : 0xffffff );
  var waterColor = new THREE.Color( options.waterColor !== undefined ? options.waterColor : 0x7F7F7F );
  var eye = options.eye !== undefined ? options.eye : new THREE.Vector3( 0, 0, 0 );
  var distortionScale = options.distortionScale !== undefined ? options.distortionScale : 20.0;
  var side = options.side !== undefined ? options.side : THREE.FrontSide;
  var fog = options.fog !== undefined ? options.fog : false;

  //

  var mirrorPlane = new THREE.Plane();
  var normal = new THREE.Vector3();
  var mirrorWorldPosition = new THREE.Vector3();
  var cameraWorldPosition = new THREE.Vector3();
  var rotationMatrix = new THREE.Matrix4();
  var lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
  var clipPlane = new THREE.Vector4();

  var view = new THREE.Vector3();
  var target = new THREE.Vector3();
  var q = new THREE.Vector4();

  var textureMatrix = new THREE.Matrix4();

  var mirrorCamera = new THREE.PerspectiveCamera();

  var parameters = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBFormat,
    stencilBuffer: false
  };

  var renderTarget = new THREE.WebGLRenderTarget( textureWidth, textureHeight, parameters );

  if ( ! THREE.Math.isPowerOfTwo( textureWidth ) || ! THREE.Math.isPowerOfTwo( textureHeight ) ) {

    renderTarget.texture.generateMipmaps = false;

  }

  var mirrorShader = {

    uniforms: THREE.UniformsUtils.merge( [
      THREE.UniformsLib[ 'fog' ],
      THREE.UniformsLib[ 'lights' ],
      {
        "normalSampler": { value: null },
        "mirrorSampler": { value: null },
        "alpha": { value: 1.0 },
        "time": { value: 0.0 },
        "size": { value: 1.0 },
        "distortionScale": { value: 20.0 },
        "textureMatrix": { value: new THREE.Matrix4() },
        "sunColor": { value: new THREE.Color( 0x7F7F7F ) },
        "sunDirection": { value: new THREE.Vector3( 0.70707, 0.70707, 0 ) },
        "eye": { value: new THREE.Vector3() },
        "waterColor": { value: new THREE.Color( 0x555555 ) }
      }
    ] ),

    vertexShader: [
      'uniform mat4 textureMatrix;',
      'uniform float time;',

      'varying vec4 mirrorCoord;',
      'varying vec4 worldPosition;',

      THREE.ShaderChunk[ 'fog_pars_vertex' ],
      THREE.ShaderChunk[ 'shadowmap_pars_vertex' ],

      'void main() {',
      ' mirrorCoord = modelMatrix * vec4( position, 1.0 );',
      ' worldPosition = mirrorCoord.xyzw;',
      ' mirrorCoord = textureMatrix * mirrorCoord;',
      ' vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
      ' gl_Position = projectionMatrix * mvPosition;',

      THREE.ShaderChunk[ 'fog_vertex' ],
      THREE.ShaderChunk[ 'shadowmap_vertex' ],

      '}'
    ].join( '\n' ),

    fragmentShader: [
      'uniform sampler2D mirrorSampler;',
      'uniform float alpha;',
      'uniform float time;',
      'uniform float size;',
      'uniform float distortionScale;',
      'uniform sampler2D normalSampler;',
      'uniform vec3 sunColor;',
      'uniform vec3 sunDirection;',
      'uniform vec3 eye;',
      'uniform vec3 waterColor;',

      'varying vec4 mirrorCoord;',
      'varying vec4 worldPosition;',

      'vec4 getNoise( vec2 uv ) {',
      ' vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);',
      ' vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );',
      ' vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );',
      ' vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );',
      ' vec4 noise = texture2D( normalSampler, uv0 ) +',
      '   texture2D( normalSampler, uv1 ) +',
      '   texture2D( normalSampler, uv2 ) +',
      '   texture2D( normalSampler, uv3 );',
      ' return noise * 0.5 - 1.0;',
      '}',

      'void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {',
      ' vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );',
      ' float direction = max( 0.0, dot( eyeDirection, reflection ) );',
      ' specularColor += pow( direction, shiny ) * sunColor * spec;',
      ' diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;',
      '}',

      THREE.ShaderChunk[ 'common' ],
      THREE.ShaderChunk[ 'packing' ],
      THREE.ShaderChunk[ 'bsdfs' ],
      THREE.ShaderChunk[ 'fog_pars_fragment' ],
      THREE.ShaderChunk[ 'lights_pars_begin' ],
      THREE.ShaderChunk[ 'shadowmap_pars_fragment' ],
      THREE.ShaderChunk[ 'shadowmask_pars_fragment' ],

      'void main() {',
      ' vec4 noise = getNoise( worldPosition.xz * size );',
      ' vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',

      ' vec3 diffuseLight = vec3(0.0);',
      ' vec3 specularLight = vec3(0.0);',

      ' vec3 worldToEye = eye-worldPosition.xyz;',
      ' vec3 eyeDirection = normalize( worldToEye );',
      ' sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );',

      ' float distance = length(worldToEye);',

      ' vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;',
      ' vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );',

      ' float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );',
      ' float rf0 = 0.3;',
      ' float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
      ' vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',
      ' vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);',
      ' vec3 outgoingLight = albedo;',
      ' gl_FragColor = vec4( outgoingLight, alpha );',

      THREE.ShaderChunk[ 'tonemapping_fragment' ],
      THREE.ShaderChunk[ 'fog_fragment' ],

      '}'
    ].join( '\n' )

  };

  var material = new THREE.ShaderMaterial( {
    fragmentShader: mirrorShader.fragmentShader,
    vertexShader: mirrorShader.vertexShader,
    uniforms: THREE.UniformsUtils.clone( mirrorShader.uniforms ),
    transparent: true,
    lights: true,
    side: side,
    fog: fog
  } );

  material.uniforms[ "mirrorSampler" ].value = renderTarget.texture;
  material.uniforms[ "textureMatrix" ].value = textureMatrix;
  material.uniforms[ "alpha" ].value = alpha;
  material.uniforms[ "time" ].value = time;
  material.uniforms[ "normalSampler" ].value = normalSampler;
  material.uniforms[ "sunColor" ].value = sunColor;
  material.uniforms[ "waterColor" ].value = waterColor;
  material.uniforms[ "sunDirection" ].value = sunDirection;
  material.uniforms[ "distortionScale" ].value = distortionScale;

  material.uniforms[ "eye" ].value = eye;

  scope.material = material;

  scope.onBeforeRender = function ( renderer, scene, camera ) {

    mirrorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
    cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );

    rotationMatrix.extractRotation( scope.matrixWorld );

    normal.set( 0, 0, 1 );
    normal.applyMatrix4( rotationMatrix );

    view.subVectors( mirrorWorldPosition, cameraWorldPosition );

    // Avoid rendering when mirror is facing away

    if ( view.dot( normal ) > 0 ) return;

    view.reflect( normal ).negate();
    view.add( mirrorWorldPosition );

    rotationMatrix.extractRotation( camera.matrixWorld );

    lookAtPosition.set( 0, 0, - 1 );
    lookAtPosition.applyMatrix4( rotationMatrix );
    lookAtPosition.add( cameraWorldPosition );

    target.subVectors( mirrorWorldPosition, lookAtPosition );
    target.reflect( normal ).negate();
    target.add( mirrorWorldPosition );

    mirrorCamera.position.copy( view );
    mirrorCamera.up.set( 0, 1, 0 );
    mirrorCamera.up.applyMatrix4( rotationMatrix );
    mirrorCamera.up.reflect( normal );
    mirrorCamera.lookAt( target );

    mirrorCamera.far = camera.far; // Used in WebGLBackground

    mirrorCamera.updateMatrixWorld();
    mirrorCamera.projectionMatrix.copy( camera.projectionMatrix );

    // Update the texture matrix
    textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    textureMatrix.multiply( mirrorCamera.projectionMatrix );
    textureMatrix.multiply( mirrorCamera.matrixWorldInverse );

    // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
    // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    mirrorPlane.setFromNormalAndCoplanarPoint( normal, mirrorWorldPosition );
    mirrorPlane.applyMatrix4( mirrorCamera.matrixWorldInverse );

    clipPlane.set( mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant );

    var projectionMatrix = mirrorCamera.projectionMatrix;

    q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
    q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
    q.z = - 1.0;
    q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

    // Calculate the scaled plane vector
    clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );

    // Replacing the third row of the projection matrix
    projectionMatrix.elements[ 2 ] = clipPlane.x;
    projectionMatrix.elements[ 6 ] = clipPlane.y;
    projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
    projectionMatrix.elements[ 14 ] = clipPlane.w;

    eye.setFromMatrixPosition( camera.matrixWorld );

    //

    var currentRenderTarget = renderer.getRenderTarget();

    var currentVrEnabled = renderer.vr.enabled;
    var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

    scope.visible = false;

    renderer.vr.enabled = false; // Avoid camera modification and recursion
    renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

    renderer.render( scene, mirrorCamera, renderTarget, true );

    scope.visible = true;

    renderer.vr.enabled = currentVrEnabled;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

    renderer.setRenderTarget( currentRenderTarget );

  };

};

THREE.Water.prototype = Object.create( THREE.Mesh.prototype );
THREE.Water.prototype.constructor = THREE.Water

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

THREE.Sky = function () {

  var shader = THREE.Sky.SkyShader;

  var material = new THREE.ShaderMaterial( {
    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: THREE.UniformsUtils.clone( shader.uniforms ),
    side: THREE.BackSide
  } );

  THREE.Mesh.call( this, new THREE.BoxBufferGeometry( 1, 1, 1 ), material );

};

THREE.Sky.prototype = Object.create( THREE.Mesh.prototype );

THREE.Sky.SkyShader = {

  uniforms: {
    "luminance": { value: 1 },
    "turbidity": { value: 2 },
    "rayleigh": { value: 1 },
    "mieCoefficient": { value: 0.005 },
    "mieDirectionalG": { value: 0.8 },
    "sunPosition": { value: new THREE.Vector3() }
  },

  vertexShader: [
    'uniform vec3 sunPosition;',
    'uniform float rayleigh;',
    'uniform float turbidity;',
    'uniform float mieCoefficient;',

    'varying vec3 vWorldPosition;',
    'varying vec3 vSunDirection;',
    'varying float vSunfade;',
    'varying vec3 vBetaR;',
    'varying vec3 vBetaM;',
    'varying float vSunE;',

    'const vec3 up = vec3( 0.0, 1.0, 0.0 );',

    // constants for atmospheric scattering
    'const float e = 2.71828182845904523536028747135266249775724709369995957;',
    'const float pi = 3.141592653589793238462643383279502884197169;',

    // wavelength of used primaries, according to preetham
    'const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );',
    // this pre-calcuation replaces older TotalRayleigh(vec3 lambda) function:
    // (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
    'const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );',

    // mie stuff
    // K coefficient for the primaries
    'const float v = 4.0;',
    'const vec3 K = vec3( 0.686, 0.678, 0.666 );',
    // MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
    'const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );',

    // earth shadow hack
    // cutoffAngle = pi / 1.95;
    'const float cutoffAngle = 1.6110731556870734;',
    'const float steepness = 1.5;',
    'const float EE = 1000.0;',

    'float sunIntensity( float zenithAngleCos ) {',
    ' zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );',
    ' return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );',
    '}',

    'vec3 totalMie( float T ) {',
    ' float c = ( 0.2 * T ) * 10E-18;',
    ' return 0.434 * c * MieConst;',
    '}',

    'void main() {',

    ' vec4 worldPosition = modelMatrix * vec4( position, 1.0 );',
    ' vWorldPosition = worldPosition.xyz;',

    ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    ' gl_Position.z = gl_Position.w;', // set z to camera.far

    ' vSunDirection = normalize( sunPosition );',

    ' vSunE = sunIntensity( dot( vSunDirection, up ) );',

    ' vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );',

    ' float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );',

    // extinction (absorbtion + out scattering)
    // rayleigh coefficients
    ' vBetaR = totalRayleigh * rayleighCoefficient;',

    // mie coefficients
    ' vBetaM = totalMie( turbidity ) * mieCoefficient;',

    '}'
  ].join( '\n' ),

  fragmentShader: [
    'varying vec3 vWorldPosition;',
    'varying vec3 vSunDirection;',
    'varying float vSunfade;',
    'varying vec3 vBetaR;',
    'varying vec3 vBetaM;',
    'varying float vSunE;',

    'uniform float luminance;',
    'uniform float mieDirectionalG;',

    'const vec3 cameraPos = vec3( 0.0, 0.0, 0.0 );',

    // constants for atmospheric scattering
    'const float pi = 3.141592653589793238462643383279502884197169;',

    'const float n = 1.0003;', // refractive index of air
    'const float N = 2.545E25;', // number of molecules per unit volume for air at
                  // 288.15K and 1013mb (sea level -45 celsius)

    // optical length at zenith for molecules
    'const float rayleighZenithLength = 8.4E3;',
    'const float mieZenithLength = 1.25E3;',
    'const vec3 up = vec3( 0.0, 1.0, 0.0 );',
    // 66 arc seconds -> degrees, and the cosine of that
    'const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;',

    // 3.0 / ( 16.0 * pi )
    'const float THREE_OVER_SIXTEENPI = 0.05968310365946075;',
    // 1.0 / ( 4.0 * pi )
    'const float ONE_OVER_FOURPI = 0.07957747154594767;',

    'float rayleighPhase( float cosTheta ) {',
    ' return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );',
    '}',

    'float hgPhase( float cosTheta, float g ) {',
    ' float g2 = pow( g, 2.0 );',
    ' float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );',
    ' return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );',
    '}',

    // Filmic ToneMapping http://filmicgames.com/archives/75
    'const float A = 0.15;',
    'const float B = 0.50;',
    'const float C = 0.10;',
    'const float D = 0.20;',
    'const float E = 0.02;',
    'const float F = 0.30;',

    'const float whiteScale = 1.0748724675633854;', // 1.0 / Uncharted2Tonemap(1000.0)

    'vec3 Uncharted2Tonemap( vec3 x ) {',
    ' return ( ( x * ( A * x + C * B ) + D * E ) / ( x * ( A * x + B ) + D * F ) ) - E / F;',
    '}',


    'void main() {',
    // optical length
    // cutoff angle at 90 to avoid singularity in next formula.
    ' float zenithAngle = acos( max( 0.0, dot( up, normalize( vWorldPosition - cameraPos ) ) ) );',
    ' float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );',
    ' float sR = rayleighZenithLength * inverse;',
    ' float sM = mieZenithLength * inverse;',

    // combined extinction factor
    ' vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );',

    // in scattering
    ' float cosTheta = dot( normalize( vWorldPosition - cameraPos ), vSunDirection );',

    ' float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );',
    ' vec3 betaRTheta = vBetaR * rPhase;',

    ' float mPhase = hgPhase( cosTheta, mieDirectionalG );',
    ' vec3 betaMTheta = vBetaM * mPhase;',

    ' vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );',
    ' Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );',

    // nightsky
    ' vec3 direction = normalize( vWorldPosition - cameraPos );',
    ' float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]',
    ' float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]',
    ' vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );',
    ' vec3 L0 = vec3( 0.1 ) * Fex;',

    // composition + solar disc
    ' float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );',
    ' L0 += ( vSunE * 19000.0 * Fex ) * sundisk;',

    ' vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );',

    ' vec3 curr = Uncharted2Tonemap( ( log2( 2.0 / pow( luminance, 4.0 ) ) ) * texColor );',
    ' vec3 color = curr * whiteScale;',

    ' vec3 retColor = pow( color, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );',

    ' gl_FragColor = vec4( retColor, 1.0 );',

    '}'
  ].join( '\n' )

};

var container;
var camera, scene, renderer, light;
var water, sphere;
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
  //
  light = new THREE.DirectionalLight( 0xffffff, 0.8 );
  scene.add( light );
  // Water
  var waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );
  water = new THREE.Water(
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
  var sky = new THREE.Sky();
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
    flatShading: true,
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
  renderer.render( scene, camera );
}