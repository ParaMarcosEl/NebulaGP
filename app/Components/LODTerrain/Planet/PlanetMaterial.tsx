import * as THREE from 'three';

export interface PlanetUniforms {
  uTime: { value: number };
  uMaxHeight: { value: number };
  uPlanetSize: { value: number };
  uLowMap: { value: THREE.Texture };
  uMidMap: { value: THREE.Texture };
  uHighMap: { value: THREE.Texture };
  uFrequency: { value: number };
  uAmplitude: { value: number };
  uOctaves: { value: number };
  uLacunarity: { value: number };
  uPersistence: { value: number };
  uExponentiation: { value: number };
}

export class PlanetMaterial extends THREE.MeshStandardMaterial {
  customUniforms: {
    uTime: { value: number };
    uMaxHeight: { value: number };
    uPlanetSize: { value: number };
    uLowMap: { value: THREE.Texture };
    uMidMap: { value: THREE.Texture };
    uHighMap: { value: THREE.Texture };
    uFrequency: { value: number };
    uAmplitude: { value: number };
    uOctaves: { value: number };
    uLacunarity: { value: number };
    uPersistence: { value: number };
    uExponentiation: { value: number };
  };

  constructor(
    color: THREE.Color | number = 0x2288ff,
    lowMap?: THREE.Texture,
    midMap?: THREE.Texture,
    highMap?: THREE.Texture,
  ) {
    super({
      color,
      flatShading: false,
    });

    this.metalness = 0.0;
    this.roughness = 1.0;

    const placeholder = new THREE.Texture();
    placeholder.needsUpdate = true;

    this.customUniforms = {
      uTime: { value: 0 },
      uMaxHeight: { value: 80 },
      uPlanetSize: { value: 5 },
      uLowMap: { value: lowMap || placeholder },
      uMidMap: { value: midMap || placeholder },
      uHighMap: { value: highMap || placeholder },
      uFrequency: { value: 2.0 },
      uAmplitude: { value: 0.5 },
      uOctaves: { value: 5 },
      uLacunarity: { value: 2.0 },
      uPersistence: { value: 0.5 },
      uExponentiation: { value: 1.0 },
    };

    this.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.customUniforms);

      // --- Vertex Shader ---
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform float uTime;
        uniform float uMaxHeight;
        uniform float uPlanetSize;
        uniform float uFrequency;
        uniform float uAmplitude;
        uniform int uOctaves;
        uniform float uLacunarity;
        uniform float uPersistence;
        uniform float uExponentiation;

        varying vec3 vWorldPosition;
        varying float vDisplacement;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + .1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f*f*(3.0-2.0*f);

          float n = mix(
            mix(
              mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x),
              f.y
            ),
            mix(
              mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x),
              f.y
            ),
            f.z
          );
          return n;
        }

        float fbm(vec3 p) {
          float total = 0.0;
          float freq = uFrequency;
          float amp = uAmplitude;
          float maxAmp = 0.0;

          for (int i = 0; i < 20; i++) {
            if (i >= uOctaves) break;
            float n = noise(p * freq); // 0..1 range
            total += n * amp;
            maxAmp += amp;
            freq *= uLacunarity;
            amp *= uPersistence;
          }

          float normalized = total / maxAmp;  // stays in 0..1
          return pow(normalized, uExponentiation);
        }
        `,
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = position;
        vec3 unitPos = normalize(transformed);

        float displacement = fbm(unitPos + vec3(uTime * 0.05)) * uMaxHeight;

        vec3 posOffsetX = normalize(transformed + vec3(0.001, 0, 0));
        vec3 posOffsetY = normalize(transformed + vec3(0, 0.001, 0));

        float dispX = fbm(posOffsetX + vec3(uTime * 0.05)) * uMaxHeight;
        float dispY = fbm(posOffsetY + vec3(uTime * 0.05)) * uMaxHeight;

        vec3 p = unitPos * (uPlanetSize + displacement);
        vec3 pX = posOffsetX * (uPlanetSize + dispX);
        vec3 pY = posOffsetY * (uPlanetSize + dispY);

        vec3 tangentX = pX - p;
        vec3 tangentY = pY - p;
        vec3 newNormal = cross(tangentY, tangentX);
        transformedNormal = normalize(newNormal);

        transformed = p;
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vDisplacement = displacement;
        `,
      );

      // --- Fragment Shader ---
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vWorldPosition;
        varying float vDisplacement;
        uniform sampler2D uLowMap;
        uniform sampler2D uMidMap;
        uniform sampler2D uHighMap;
        uniform float uMaxHeight;
        `,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        vec3 p = normalize(vWorldPosition);
        float u = 0.5 + atan(p.z, p.x) / (2.0 * 3.1415926);
        float v = 0.5 - asin(p.y) / 3.1415926;
        vec2 uv = vec2(u, v) * 10.0;

        vec3 lowColor  = texture2D(uLowMap, uv).rgb;
        vec3 midColor  = texture2D(uMidMap, uv).rgb;
        vec3 highColor = texture2D(uHighMap, uv).rgb;

        float h = clamp(vDisplacement / uMaxHeight, 0.0, 0.1);

        vec3 terrainColor = mix(midColor, lowColor, smoothstep(0.0, 0.01, h));
        terrainColor = mix(terrainColor, highColor, smoothstep(0.1, 1.0, h));

        diffuseColor.rgb = terrainColor;
        `,
      );
    };
  }

  updateTime(time: number) {
    this.customUniforms.uTime.value = time;
  }

  setParams(params: Partial<Record<keyof PlanetMaterial['customUniforms'], number>>) {
    (Object.keys(params) as (keyof typeof this.customUniforms)[]).forEach((key) => {
      const uniform = this.customUniforms[key];
      const value = params[key];
      if (uniform && typeof value === 'number') {
        uniform.value = value;
      }
    });
  }
}
