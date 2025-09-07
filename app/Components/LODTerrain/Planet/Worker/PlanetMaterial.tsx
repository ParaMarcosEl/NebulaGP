'use client';

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
  uLightDir: { value: THREE.Vector3 };
  uTextureScale: { value: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: THREE.IUniform<any>;
}

export class PlanetMaterial extends THREE.MeshStandardMaterial {
  customUniforms: PlanetUniforms;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private shaderUniforms: any;

  constructor(
    lowMap: THREE.Texture,
    midMap: THREE.Texture,
    highMap: THREE.Texture,
    params?: Partial<PlanetUniforms>,
  ) {
    super({ side: THREE.DoubleSide });

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
      uMaxElevation: { value: 1.0 },
      uMinElevation: { value: 0.0 },
      uLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
      uTextureScale: { value: 20.0 }, // Added new uniform for texture scaling
      ...(params || {}),
    };

    this.onBeforeCompile = (shader) => {
      // Merge custom uniforms with the shader's uniforms
      Object.assign(shader.uniforms, this.customUniforms);
      this.shaderUniforms = shader.uniforms;

      // Inject varying declaration into the vertex shader
      shader.vertexShader = `
        varying vec2 vUv;
        attribute float elevation;
        varying float vElevation; 
        uniform float uMaxHeight;
        uniform float uExponentiation;
        uniform float uMaxElevation;
        uniform float uMinElevation;

        ${shader.vertexShader}
      `;

      // Assign UVs to the new varying variable
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vUv = uv;
        vElevation = elevation;
        `,
      );

      // Inject uniform and varying declaration into the fragment shader
      shader.fragmentShader = `
        uniform float uMaxHeight;
        uniform sampler2D uLowMap;
        uniform sampler2D uHighMap;
        uniform sampler2D uMidMap;
        uniform float uExponentiation;
        uniform float uMaxElevation;
        uniform float uMinElevation;
        uniform float uTextureScale; // Declare the new uniform
        varying vec2 vUv;
        varying float vElevation;
        ${shader.fragmentShader}
      `;

      // Replace the final color calculation to use the mid texture with scaling
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        float height = (vElevation - uMinElevation) / (uMaxElevation - uMinElevation);

        // Optionally remap height
        // height = clamp(pow(height, uExponentiation), 0.0, 1.0);

        vec4 lowColor = texture2D(uLowMap, vUv * uTextureScale);
        vec4 midColor = texture2D(uMidMap, vUv * uTextureScale);
        vec4 highColor = texture2D(uHighMap, vUv * uTextureScale);

        // Blend based on adjustable thresholds
        float lowToMid = smoothstep(0.4, 0.6, height);
        float midToHigh = smoothstep(0.6, 0.8, height);

        vec4 blended = mix(lowColor, midColor, lowToMid);
        blended = mix(blended, highColor, midToHigh);

        diffuseColor.rgb = blended.rgb;

        `,
      );
    };
  }

  updateTime(time: number) {
    if (this.shaderUniforms) {
      this.shaderUniforms.uTime.value = time;
    } else {
      this.customUniforms.uTime.value = time;
    }
  }

  setParams(params: Partial<Record<keyof PlanetUniforms, number | { value: number }>>) {
    (Object.keys(params) as (keyof PlanetUniforms)[]).forEach((key) => {
      const uniform = this.customUniforms[key];
      const value = params[key];
      if (uniform) {
        uniform.value = typeof value === 'number' ? value : value?.value;
        if (this.shaderUniforms && this.shaderUniforms[key]) {
          this.shaderUniforms[key].value = uniform.value;
        }
      }
    });
    this.needsUpdate = true;
  }
}
