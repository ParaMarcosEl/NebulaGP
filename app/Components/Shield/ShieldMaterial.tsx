import * as THREE from 'three';

const vertexShader = `
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uShieldValue;

    // Simple hash and noise
    float hash(vec2 p) {
      return fract(sin(dot(p ,vec2(127.1,311.7))) * 43758.5453123);
    }

    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a, b, u.x) +
             (c - a)* u.y * (1.0 - u.x) +
             (d - b) * u.x * u.y;
    }

    void main() {
      // Animate noise
      float n = noise(vUv * 5.0 + uTime * 0.5);
      
      // Shield color transitions from blue to red
      vec3 blue = vec3(0.0, 0.5, 1.0);
      vec3 red = vec3(1.0, 0.2, 0.0);
      vec3 color = mix(red, blue, uShieldValue);

      // Add noise-based glow variation
      color += 0.3 * n;

        // Transparency: fully invisible if shield value <= 0
        float alpha = (uShieldValue <= 0.0) ? 0.0 : (0.5 + 0.5 * n);

      gl_FragColor = vec4(color, alpha);
    }
`;

export class ShieldMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uShieldValue: { value: 1.0 }, // 1 = full, 0 = empty
      },
      vertexShader,
      fragmentShader,
      lights: false,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
}
