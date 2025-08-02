// Imports the entire THREE.js library, making all its classes and functions available.
import * as THREE from 'three';

// Defines a custom material that extends THREE.MeshStandardMaterial.
// This allows us to use a custom shader while keeping the PBR (Physically Based Rendering) features
// of the standard material, like lighting and shadows.
export class LitTerrainMaterial extends THREE.MeshStandardMaterial {
    // Custom uniforms to be passed to the shader. These values can be
    // changed from JavaScript to control the terrain's appearance and generation.
    customUniforms: {
        lowMap: { value: THREE.Texture | null }; // Texture for low elevation areas (e.g., grass).
        highMap: { value: THREE.Texture | null }; // Texture for high elevation areas (e.g., snow/rock).
        map: { value: THREE.Texture | null }; // Texture for mid-elevation areas.
        textureBlend: { value: number }; // A blend factor, though not used in the final shader.
        uTime: { value: number }; // Time uniform for animations (e.g., moving water).
        uMaxHeight: { value: number }; // Maximum height of the terrain.
        uFrequency: { value: number }; // Base frequency for the noise function.
        uAmplitude: { value: number }; // Base amplitude for the noise function.
        uOctaves: { value: number }; // Number of noise layers (octaves) for detail.
        uLacunarity: { value: number }; // Frequency multiplier for each octave.
        uPersistence: { value: number }; // Amplitude multiplier for each octave.
        uExponentiation: { value: number }; // Controls the sharpness/flatness of the terrain.
        uWorldOffset: { value: THREE.Vector2 }; // Offset for infinite terrain.
        uWorldOrigin: { value: THREE.Vector2 }; // Origin point for terrain.
        uTextureScale: { value: number }; // Scaling factor for textures.
    };

    // A callback function that can be set to run after the shader is compiled.
    onShaderCompiled: (() => void) | undefined;

    // The constructor sets up the material with default values and shader modifications.
    constructor() {
        // Call the parent constructor with basic material properties.
        super({
            color: 0xffffff, // Default color is white.
            flatShading: false, // Disables flat shading for smooth-looking terrain.
        });

        // PBR (Physically Based Rendering) properties.
        this.metalness = 0.2;
        this.roughness = 0.8;

        // Initialize custom uniforms with default values.
        this.customUniforms = {
            lowMap: { value: null },
            highMap: { value: null },
            map: { value: null },
            textureBlend: { value: 0.5 },
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
            uTextureScale: { value: 0.08 },
        };

        // This is the core of the custom material. onBeforeCompile is a hook that
        // lets us inject or replace parts of the shader code before it's compiled.
        this.onBeforeCompile = (shader) => {
            // Merge our custom uniforms with the shader's existing uniforms.
            Object.assign(shader.uniforms, this.customUniforms);

            // --- Vertex Shader Modifications ---

            // The vertex shader is responsible for calculating vertex positions and other per-vertex data.
            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `
                    #include <common>
                    // Varying variables are passed from the vertex to the fragment shader.
                    varying vec2 vUv;
                    varying float vElevation; // Stores the elevation of the vertex.
                    varying vec3 vWorldPosition; // Stores the vertex's world position.
                    varying vec3 vWorldNormal; // Stores the vertex's world normal.

                    // Declare our custom uniforms so they can be used in the shader.
                    uniform float uMaxHeight;
                    uniform float uFrequency;
                    uniform float uAmplitude;
                    uniform float uOctaves;
                    uniform float uLacunarity;
                    uniform float uPersistence;
                    uniform float uExponentiation;
                    uniform vec2 uWorldOffset;
                    uniform vec2 uWorldOrigin;
        
                    // Permute function for Simplex noise, a type of noise function.
                    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
                    vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
                    
                    // Simplex noise function to generate random-looking values.
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
        
                    // Fractal Brownian Motion (FBM) function. It combines multiple layers
                    // of noise (octaves) to create more detailed, natural-looking terrain.
                    float fbm(vec2 pos) {
                        float total = 0.0;
                        float frequency = uFrequency;
                        float amplitude = uAmplitude;
                        float maxAmplitude = 0.0;
        
                        for (int i = 0; i < 10; i++) {
                            // Stop if we've reached the specified number of octaves.
                            if (i >= int(uOctaves)) break;
                            total += noise(pos * frequency) * amplitude;
                            maxAmplitude += amplitude;
                            amplitude *= uPersistence;
                            frequency *= uLacunarity;
                        }
        
                        // Normalize the result and apply exponentiation for custom shaping.
                        float normalized = total / maxAmplitude;
                        return pow((normalized + 1.0) / 2.0, uExponentiation);
                    }
        
                    // Helper function to get the final elevation for a given world position.
                    float getElevation(vec2 worldPos) {
                        return fbm(worldPos) * uMaxHeight;
                    }
                    `
                )
                // Maps the `uv` attribute to the varying `vUv` for use in the fragment shader.
                .replace('#include <uv_vertex>', 'vUv = uv;')
                // This is the main section where the terrain's geometry is modified.
                .replace(
                    '#include <begin_vertex>',
                    `
                    vec3 transformed = position;
        
                    // Get the elevation based on the vertex's world position.
                    vec2 globalNoiseInput = position.xz + uWorldOffset + uWorldOrigin;
                    float elevation = getElevation(globalNoiseInput);
                    transformed.y = elevation;
                    vElevation = elevation / uMaxHeight;
        
                    // --- Custom Normal Calculation ---
                    // Since we've changed the geometry, we need to re-calculate the normals
                    // for proper lighting. This is done by sampling the elevation at
                    // nearby points and using a cross product.
                    float epsilon = 0.01;
                    vec2 dx = globalNoiseInput + vec2(epsilon, 0.0);
                    vec2 dz = globalNoiseInput + vec2(0.0, epsilon);
                    float elevation_dx = getElevation(dx);
                    float elevation_dz = getElevation(dz);
                    vec3 va = vec3(epsilon, elevation_dx - elevation, 0.0);
                    vec3 vb = vec3(0.0, elevation_dz - elevation, epsilon);
                    vec3 computedNormal = normalize(cross(vb, va));
                    
                    // The vNormal is for tangent space calculations, and vWorldNormal is for tri-planar mapping.
                    vNormal = normalize(normalMatrix * computedNormal);
                    vWorldNormal = normalize(mat3(modelMatrix) * computedNormal);
        
                    // Set the world position varying.
                    vWorldPosition = transformed + vec3(uWorldOffset.x + uWorldOrigin.x, 0.0, uWorldOffset.y + uWorldOrigin.y);
                    vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
                    `
                );

            // --- Fragment Shader Modifications ---

            // The fragment shader determines the final color of each pixel.
            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    // Varying variables from the vertex shader.
                    varying vec2 vUv;
                    varying float vElevation;
                    varying vec3 vWorldPosition;
                    varying vec3 vWorldNormal;
        
                    // Texture uniforms.
                    uniform sampler2D lowMap;
                    uniform sampler2D map;
                    uniform sampler2D highMap;
                    uniform float uTextureScale;
        
                    // A function for Tri-planar mapping. This technique samples a texture
                    // from three directions (X, Y, and Z) and blends them based on the
                    // surface normal. This avoids texture stretching on steep slopes.
                    vec4 sampleTriplanar(sampler2D tex, vec3 worldPos, vec3 worldNormal, float scale) {
                        vec3 blendWeights = abs(worldNormal);
                        blendWeights = normalize(blendWeights + vec3(0.00001));
        
                        vec4 xProj = texture2D(tex, worldPos.yz * scale);
                        vec4 yProj = texture2D(tex, worldPos.xz * scale);
                        vec4 zProj = texture2D(tex, worldPos.xy * scale);
        
                        return xProj * blendWeights.x + yProj * blendWeights.y + zProj * blendWeights.z;
                    }
                    `
                )
                // This is where we replace the default texture mapping with our custom
                // elevation-based blending logic.
                .replace(
                    '#include <map_fragment>',
                    `
                    // Sample textures using tri-planar mapping.
                    vec4 lowColor = sampleTriplanar(lowMap, vWorldPosition, vWorldNormal, uTextureScale);
                    vec4 midColor = sampleTriplanar(map, vWorldPosition, vWorldNormal, uTextureScale);
                    vec4 highColor = sampleTriplanar(highMap, vWorldPosition, vWorldNormal, uTextureScale);
        
                    // Define the elevation ranges for blending.
                    float blendStartLowToMid = 0.1;
                    float blendEndLowToMid = 0.12;
                    float blendStartMidToHigh = 0.18;
                    float blendEndMidToHigh = 0.23;
        
                    // Use smoothstep to create smooth transitions between textures.
                    // The blend factor is based on the vertex's normalized elevation (vElevation).
                    float lowToMidBlend = smoothstep(blendStartLowToMid, blendEndLowToMid, vElevation);
                    float midToHighBlend = smoothstep(blendStartMidToHigh, blendEndMidToHigh, vElevation);
        
                    // Mix the colors together.
                    vec4 finalColor = mix(lowColor, midColor, lowToMidBlend);
                    finalColor = mix(finalColor, highColor, midToHighBlend);
        
                    // Set the final color of the material.
                    diffuseColor.rgb = finalColor.rgb;
                    `
                );

            // Store a reference to the shader for debugging or further use.
            this.userData.shader = shader;

            // Call the optional callback if it exists.
            if (this.onShaderCompiled) {
                this.onShaderCompiled();
            }
        };
    }

    // A public method to update the uTime uniform, typically called in the animation loop.
    updateTime(time: number) {
        this.customUniforms.uTime.value = time;
    }
}