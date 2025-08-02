import * as THREE from 'three';

// This is a custom material that extends THREE.MeshStandardMaterial.
// It injects custom shader code to blend multiple textures based on elevation.
export class SingleTextureMaterial extends THREE.MeshStandardMaterial {
  // Define custom uniforms for the shader. These will be accessible via this.customUniforms.
  customUniforms = {
    lowMap: { value: null },
    midMap: { value: null },
    highMap: { value: null },
    textureBlend: { value: 0.5 },
    uTextureScale: { value: 0.08 },
  };

  constructor() {
    super({ color: 0xffffff });
    // Set some default properties for the standard material
    this.metalness = 0.0;
    this.roughness = 1.0;
    this.side = THREE.DoubleSide;

    // The core of the custom material: injecting code into the shader
    this.onBeforeCompile = (shader) => {
      // Assign our custom uniforms to the shader
      Object.assign(shader.uniforms, this.customUniforms);

      // We need to pass the elevation and UVs from the vertex shader to the fragment shader.
      // We will create new `varying` variables for this.
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `
        attribute float elevation;
        varying float vElevation;
        varying vec2 vCustomUv;

        void main() {
          vElevation = elevation;
          vCustomUv = uv;
        `
      );

      // Now, we modify the fragment shader to use our uniforms and varyings.
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `
        uniform sampler2D lowMap;
        uniform sampler2D midMap;
        uniform sampler2D highMap;
        uniform float uTextureScale;
        uniform float textureBlend;

        varying float vElevation;
        varying vec2 vCustomUv;
        
        float blend(float x) {
          return smoothstep(0.0, 1.0, x);
        }

        void main() {
        `
      );

      // This is the crucial part. Instead of replacing the entire map_fragment,
      // we'll inject our custom texture blending logic right before the final
      // diffuseColor is computed. This preserves all the built-in lighting.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        vec2 scaledUv = vCustomUv * uTextureScale;

        vec4 lowColor = texture2D(lowMap, scaledUv);
        vec4 midColor = texture2D(midMap, scaledUv);
        vec4 highColor = texture2D(highMap, scaledUv);

        vec4 blendColor = mix(lowColor, midColor, blend(vElevation));
        blendColor = mix(blendColor, highColor, blend(vElevation - textureBlend));
        
        diffuseColor *= blendColor;
        `
      );

      // We need to attach the shader to userData to ensure it is not garbage collected
      this.userData.shader = shader;
    };
  }
}
