// Imports the entire THREE.js library, making all its classes and functions available.
import * as THREE from 'three';

// Defines a custom material for a terrain where geometry is pre-calculated by a Web Worker.
// It extends THREE.MeshStandardMaterial to leverage its built-in lighting and shadowing.
export class WorkerTerrainMaterial extends THREE.MeshStandardMaterial {
    // Custom uniforms to be passed to the shader. These are the parameters
    // that will be consistent across the entire mesh.
    customUniforms: {
        lowMap: { value: THREE.Texture | null }; // Texture for low elevation areas.
        highMap: { value: THREE.Texture | null }; // Texture for high elevation areas.
        map: { value: THREE.Texture | null }; // Texture for mid-elevation areas.
        textureBlend: { value: number }; // A blend factor, although not used in the final shader.
        uTextureScale: { value: number }; // Scaling factor for the textures.
    };

    // An optional callback function that can be executed after the shader has been compiled.
    onShaderCompiled: (() => void) | undefined;

    // The constructor sets up the material with default values and shader modifications.
    constructor() {
        // Call the parent constructor with basic material properties.
        super({
            color: 0xffffff, // Default color is white.
            flatShading: false, // Disables flat shading for a smoother look on the terrain.
        });

        // PBR (Physically Based Rendering) properties.
        this.metalness = 0.0; // Sets the material to be non-metallic.
        this.roughness = 0.8; // Sets a high roughness for a non-glossy, matte surface.

        // Initialize custom uniforms with default values.
        this.customUniforms = {
            lowMap: { value: null },
            highMap: { value: null },
            map: { value: null },
            textureBlend: { value: 0.5 },
            uTextureScale: { value: 0.08 },
        };

        // This is the core of the custom material. onBeforeCompile is a hook that
        // allows us to inject or replace parts of the shader code before it's compiled.
        this.onBeforeCompile = (shader) => {
            // Merge our custom uniforms with the shader's existing uniforms.
            Object.assign(shader.uniforms, this.customUniforms);

            // --- Vertex Shader Modifications ---

            // The vertex shader is responsible for calculating vertex positions and other per-vertex data.
            // In this approach, the elevation and normals are pre-calculated by a worker.
            // We inject our custom attributes and varying variables at the start of the shader.
            shader.vertexShader = `
                attribute float elevation; // A custom attribute to receive elevation from the worker.
                varying vec2 vUv; // For texture mapping.
                varying float vElevation; // Elevation, passed to the fragment shader for blending.
                varying vec3 vWorldPosition; // World position, for tri-planar mapping.
                varying vec3 vWorldNormal; // World normal, for tri-planar mapping and lighting.
                ${shader.vertexShader}
            `;

            // Modify the `begin_vertex` section to handle the pre-calculated data.
            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <begin_vertex>',
                    `
                    vec3 transformed = position;
                    // Normalize the elevation value (assuming a max height of 400).
                    vElevation = elevation / 400.0;
                    // Calculate the world position of the vertex.
                    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
                    
                    // The normals are pre-calculated by the worker and stored in objectNormal.
                    // We use this directly to calculate the final normal for lighting and world space.
                    vNormal = normalize(normalMatrix * objectNormal);
                    vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
                    `
                );

            // --- Fragment Shader Modifications ---

            // The fragment shader determines the final color of each pixel.
            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    // Declare the varying variables passed from the vertex shader.
                    varying vec2 vUv;
                    varying float vElevation;
                    varying vec3 vWorldPosition;
                    varying vec3 vWorldNormal;
        
                    // Declare texture uniforms.
                    uniform sampler2D lowMap;
                    uniform sampler2D map;
                    uniform sampler2D highMap;
                    uniform float uTextureScale;
        
                    // A function for tri-planar mapping. This technique samples a texture
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
                    // Sample textures using the tri-planar mapping function.
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
        };
    }
}