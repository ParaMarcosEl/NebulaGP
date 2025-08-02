import * as THREE from 'three';

export class LitTerrainMaterial extends THREE.MeshStandardMaterial {

  customUniforms: { 
    uTime: { value: number; }; 
    uMaxHeight: { value: number; }; 
    uFrequency: { value: number; }; 
    uAmplitude: { value: number; }; 
    uOctaves: { value: number; }; 
    uLacunarity: { value: number; }; 
    uPersistence: { value: number; }; 
    uExponentiation: { value: number; }; 
    uWorldOffset: { value: THREE.Vector2 };
    uWorldOrigin: { value: THREE.Vector2 };
    
};
  
  constructor() {
    super({
      color: 0xee8b57, // Color of Material
      flatShading: true,
    });

    this.customUniforms = {
      uTime: { value: 0 },
      uMaxHeight: { value: 40 },
      uFrequency: { value: 0.015 },
      uAmplitude: { value: 1.0 },
      uOctaves: { value: 6.0 },
      uLacunarity: { value: 2.0 },
      uPersistence: { value: 0.5 },
      uExponentiation: { value: 1.0 },
      uWorldOffset: { value: new THREE.Vector2(0, 0) },
      uWorldOrigin: { value: new THREE.Vector2(0, 0) },

    };

    this.onBeforeCompile = (shader) => {
      // Inject uniforms
      Object.assign(shader.uniforms, this.customUniforms);

      // Inject vertex deformation
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>

          uniform float uTime;
          uniform float uMaxHeight;
          uniform float uFrequency;
          uniform float uAmplitude;
          uniform float uOctaves;
          uniform float uLacunarity;
          uniform float uPersistence;
          uniform float uExponentiation;
          uniform vec2 uWorldOffset;
          uniform vec2 uWorldOrigin;

          vec3 permute(vec3 x) {
            return mod(((x * 34.0) + 1.0) * x, 289.0);
          }

          vec4 permute(vec4 x) {
            return mod(((x * 34.0) + 1.0) * x, 289.0);
          }

          vec2 fade(vec2 t) {
            return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
          }

          float noise(vec2 v) {
            const vec4 C = vec4(0.211324865,0.366025404,0.577350269,0.0243902439);
            vec2 i = floor(v + dot(v, C.yy));
            vec2 x0 = v - i + dot(i, C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
            vec3 x = fract(p * C.w) * 2.0 - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            vec2 g0 = vec2(a0.x, h.x);
            vec2 g1 = vec2(a0.y, h.y);
            vec2 g2 = vec2(a0.z, h.z);
            vec3 w = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            vec3 w4 = w*w*w*w;
            float n = dot(w4, vec3(dot(g0,x0), dot(g1,x12.xy), dot(g2,x12.zw)));
            return 70.0 * n;
          }

          float fbm(vec2 pos) {
            float total = 0.0;
            float frequency = uFrequency;
            float amplitude = uAmplitude;
            float maxAmplitude = 0.0;

            for (int i = 0; i < 10; i++) {
              if (i >= int(uOctaves)) break;
              total += noise(pos * frequency) * amplitude;
              maxAmplitude += amplitude;
              amplitude *= uPersistence;
              frequency *= uLacunarity;
            }

            float normalized = total / maxAmplitude;
            return pow((normalized + 1.0) / 2.0, uExponentiation);
          }
        `
        )
        .replace(
          '#include <begin_vertex>',
          `
            vec3 displacedPosition = position;
            vec2 noiseInput = (modelMatrix * vec4(position, 1.0)).xz;
            float elevation = fbm(noiseInput);

            displacedPosition.y = elevation * uMaxHeight;

            vec3 transformed = displacedPosition;
        `
        );

      this.userData.shader = shader; // optional access to shader later
    };
  }

  updateTime(time: number) {
    this.customUniforms.uTime.value = time;
  }
}
