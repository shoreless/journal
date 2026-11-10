// One pass after the picture is drawn: a shallow lens focused a little way along the wall,
// then tone, a slight vignette and grain.
import * as THREE from 'three';

export function buildPost(renderer, camera) {
  const size = new THREE.Vector2();
  let target = null, samples = 4;
  const uniforms = {
    tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() },
    uNear: { value: camera.near }, uFar: { value: camera.far }, uFocus: { value: 1.9 }, uAperture: { value: 8.5 },
    uMaxCoc: { value: 9 }, uExposure: { value: 1 }, uTime: { value: 0 }, uDof: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }
  };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: /* glsl */`
      #include <packing>
      uniform sampler2D tColor, tDepth; uniform vec2 uRes; uniform vec3 uTint;
      uniform float uNear, uFar, uFocus, uAperture, uMaxCoc, uExposure, uTime, uDof;
      varying vec2 vUv;
      float dist(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
      float coc(float z){ return clamp(abs(1./uFocus - 1./z)*uAperture, 0., uMaxCoc); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      vec3 aces(vec3 x){ return clamp((x*(2.51*x + .03))/(x*(2.43*x + .59) + .14), 0., 1.); }
      void main(){
        vec3 col = texture2D(tColor, vUv).rgb;
        if (uDof > .5) {
          float z0 = dist(vUv), c0 = coc(z0), w = 1.;
          float spin = hash(gl_FragCoord.xy)*6.2832;
          for (int i = 0; i < 26; i++) {
            float fi = float(i) + .5, rad = sqrt(fi/26.)*uMaxCoc, a = fi*2.39996 + spin;
            vec2 uv = vUv + vec2(cos(a), sin(a))*rad/uRes;
            float z = dist(uv), c = coc(z);
            if (z > z0) c = min(c, c0*1.5 + .5);
            float wi = smoothstep(rad - .6, rad + .6, c);
            col += texture2D(tColor, uv).rgb*wi; w += wi;
          }
          col /= w;
        }
        col *= uExposure*uTint;
        vec2 q = vUv - .5;
        col *= 1. - dot(q, q)*.85;
        col = aces(col);
        float l = dot(col, vec3(.2126, .7152, .0722));
        col = mix(vec3(l), col, 1.08);
        col = pow(col, vec3(1./2.2));
        col += (hash(gl_FragCoord.xy + fract(uTime)*91.7) - .5)*.022;
        gl_FragColor = vec4(col, 1.);
      }`
  }));
  quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function resize() {
    renderer.getDrawingBufferSize(size);
    if (target) { target.depthTexture.dispose(); target.dispose(); }
    const depth = new THREE.DepthTexture(size.x, size.y); depth.type = THREE.UnsignedIntType;
    target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples, depthTexture: depth });
    uniforms.tColor.value = target.texture; uniforms.tDepth.value = depth;
    uniforms.uRes.value.copy(size); uniforms.uMaxCoc.value = 7 * size.y / 1080;
    uniforms.uAperture.value = 8.5 * size.y / 1080;
  }
  resize();
  return {
    uniforms, resize,
    setSamples(n) { samples = n; resize(); },
    render(scn, time) {
      uniforms.uTime.value = time;
      renderer.setRenderTarget(target); renderer.render(scn, camera);
      renderer.setRenderTarget(null); renderer.render(scene, cam);
    }
  };
}
