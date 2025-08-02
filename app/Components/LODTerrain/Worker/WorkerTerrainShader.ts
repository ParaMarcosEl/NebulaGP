import * as THREE from 'three';

const vertexShader = `
    attribute float elevation; // <-- This is the only custom attribute we need to declare
    
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;

    void main() {
        vec3 transformed = position;
        vElevation = elevation / 400.0;
        
        vUv = uv;
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize(normalMatrix * normal);


        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;

    uniform sampler2D lowMap;
    uniform sampler2D map;
    uniform sampler2D highMap;
    uniform float uTextureScale;

    // Custom lighting uniforms
    uniform vec3 uDirectionalLightColor;
    uniform vec3 uDirectionalLightDirection;
    uniform vec3 uAmbientLightColor;

    vec4 sampleTriplanar(sampler2D tex, vec3 worldPos, vec3 worldNormal, float scale) {
        vec3 blendWeights = abs(worldNormal);
        blendWeights = normalize(blendWeights + vec3(0.00001));

        vec4 xProj = texture2D(tex, worldPos.yz * scale);
        vec4 yProj = texture2D(tex, worldPos.xz * scale);
        vec4 zProj = texture2D(tex, worldPos.xy * scale);

        return xProj * blendWeights.x + yProj * blendWeights.y + zProj * blendWeights.z;
    }

    void main() {
        vec4 lowColor = sampleTriplanar(lowMap, vWorldPosition, vWorldNormal, uTextureScale);
        vec4 midColor = sampleTriplanar(map, vWorldPosition, vWorldNormal, uTextureScale);
        vec4 highColor = sampleTriplanar(highMap, vWorldPosition, vWorldNormal, uTextureScale);

        float blendStartLowToMid = 0.1;
        float blendEndLowToMid = 0.12;
        float blendStartMidToHigh = 0.18;
        float blendEndMidToHigh = 0.23;

        float lowToMidBlend = smoothstep(blendStartLowToMid, blendEndLowToMid, vElevation);
        float midToHighBlend = smoothstep(blendStartMidToHigh, blendEndMidToHigh, vElevation);

        vec4 finalColor = mix(lowColor, midColor, lowToMidBlend);
        finalColor = mix(finalColor, highColor, midToHighBlend);
        
        // Manual lighting calculation
        vec3 normal = normalize(vWorldNormal);
        vec3 lightDir = normalize(uDirectionalLightDirection);
        
        float diffuse = max(dot(normal, lightDir), 0.0);
        vec3 light = uAmbientLightColor + uDirectionalLightColor * diffuse;

        gl_FragColor = vec4(finalColor.rgb * light, 1.0);
    }
`;

export class WorkerTerrainShader extends THREE.ShaderMaterial {
    constructor() {
        super({
            uniforms: {
                lowMap: { value: null },
                highMap: { value: null },
                map: { value: null },
                uTextureScale: { value: 0.08 },
                uDirectionalLightColor: { value: new THREE.Color(0xffffff) },
                uDirectionalLightDirection: { value: new THREE.Vector3(0, 1, 0) },
                uAmbientLightColor: { value: new THREE.Color(0x333333) },
            },
            vertexShader,
            fragmentShader,
            lights: true,
            transparent: false,
        });
    }
}