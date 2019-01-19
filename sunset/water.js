/**
 * @author jbouny / https://github.com/jbouny
 *
 * Work based on :
 * @author Slayvin / http://slayvin.net : Flat mirror for three.js
 * @author Stemkoski / http://www.adelphi.edu/~stemkoski : An implementation of water shader based on the flat mirror
 * @author Jonas Wagner / http://29a.ch/ && http://29a.ch/slides/2012/webglwater/ : Water shader explanations in WebGL
 */

import THREE from 'three';

export default function Water ( geometry, options ) {

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

};

Water.prototype = Object.create( THREE.Mesh.prototype );
Water.prototype.constructor = Water
