// CurveParticles.tsx
import * as THREE from 'three';
import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export type CurveParticlesProps = {
  curve: THREE.Curve<THREE.Vector3>;
  tubeRadius?: number;
  maxParticles?: number;
  particleSize?: number;
  speed?: number;       // along the curve
  orbitSpeed?: number;  // rotation around minor radius
  loop?: boolean;
  color?: THREE.Color; // <-- new uniform color
};

const CurveParticles = forwardRef<THREE.Points, CurveParticlesProps>(
  ({
    curve,
    tubeRadius = 1,
    maxParticles = 1000,
    particleSize = 1,
    speed = 1,
    orbitSpeed = 1,
    loop = true,
    color = new THREE.Color(0, .5, 1)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, ref) => {
    const pointsRef = useRef<THREE.Points<THREE.BufferGeometry<THREE.NormalOrGLBufferAttributes, THREE.BufferGeometryEventMap>, THREE.Material | THREE.Material[], THREE.Object3DEventMap> | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);

    // Precompute curve points for GPU
    const curveData = useMemo(() => {
      const divisions = 128;
      const pts = curve.getPoints(divisions);
      const data = new Float32Array((divisions + 1) * 3);
      pts.forEach((p, i) => {
        data[i * 3] = p.x;
        data[i * 3 + 1] = p.y;
        data[i * 3 + 2] = p.z;
      });
      return { data, divisions };
    }, [curve]);

    // Instanced attributes
    const geometry = useMemo(() => {
      const geo = new THREE.InstancedBufferGeometry();
      geo.instanceCount = maxParticles;
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      const radii = new Float32Array(maxParticles);
      const progress = new Float32Array(maxParticles);
      const rand = new Float32Array(maxParticles);
      const angleOffsets = new Float32Array(maxParticles);

      for (let i = 0; i < maxParticles; i++) {
        progress[i] = Math.random();
        radii[i] = Math.pow(Math.random(), 10) * tubeRadius;
        angleOffsets[i] = Math.random() * Math.PI * 2;
        rand[i] = Math.random();
      }

      geo.setAttribute('radius', new THREE.InstancedBufferAttribute(radii, 1));
      geo.setAttribute('progress', new THREE.InstancedBufferAttribute(progress, 1));
      geo.setAttribute('rand', new THREE.InstancedBufferAttribute(rand, 1));
      geo.setAttribute('angleOffset', new THREE.InstancedBufferAttribute(angleOffsets, 1));

      return geo;
    }, [maxParticles, tubeRadius]);

    const shaderMaterial = useMemo(() => {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      size: { value: particleSize },
      speed: { value: speed },
      orbitSpeed: { value: orbitSpeed },
      loop: { value: loop ? 1 : 0 },
      color: { value: color || new THREE.Color(0x00ffff) }, // <-- pass uniform
      curvePoints: { value: curveData.data },
      curveDivisions: { value: curveData.divisions },
    },
    vertexShader: `
      precision highp float;
      attribute float radius;
      attribute float progress;
      attribute float angleOffset;

      uniform float time;
      uniform float size;
      uniform float speed;
      uniform float orbitSpeed;
      uniform float loop;
      uniform float curveDivisions;
      uniform vec3 color;
      uniform vec3 curvePoints[129];

      varying vec3 vColor;

      vec3 sampleCurve(float t) {
        float scaledT = t * curveDivisions;
        int idx = int(floor(scaledT));
        float f = fract(scaledT);
        vec3 p0 = curvePoints[idx];
        vec3 p1 = curvePoints[min(idx+1, int(curveDivisions))];
        return mix(p0, p1, f);
      }

      void main() {
        float t = mod(progress + time * speed, 1.0);
        if(loop == 0.0 && t < progress){
          gl_Position = vec4(10000.0,10000.0,10000.0,1.0);
          return;
        }

        vec3 pos = sampleCurve(t);
        vec3 nextPos = sampleCurve(mod(t + 0.01,1.0));
        vec3 tangent = normalize(nextPos - pos);
        vec3 binormal = normalize(cross(tangent, vec3(0.0,1.0,0.0)));
        vec3 normal = normalize(cross(binormal, tangent));

        float invRadius = 1.0 / max(radius, 0.05);
        float orbitAngle = angleOffset + time * orbitSpeed * invRadius;
        float s = sin(orbitAngle);
        float c = cos(orbitAngle);
        vec3 orbitOffset = normal * (radius * c) + binormal * (radius * s);

        vec3 worldPos = pos + orbitOffset;

        vColor = color; // <-- uniform color applied to all particles
        vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
        gl_PointSize = size * (1800.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        if(length(uv) > 0.5) discard;
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  mat.needsUpdate = true;
  return mat;
}, [particleSize, speed, orbitSpeed, loop, color, curveData]);

    useFrame(({ clock }) => {
      if (materialRef.current) materialRef.current.uniforms.time.value = clock.getElapsedTime();
    });

    return (
      <points
        ref={(mesh) => {
          pointsRef.current = mesh;
          if (mesh) materialRef.current = mesh.material as THREE.ShaderMaterial;
        }}
        args={[geometry, shaderMaterial]}
        frustumCulled={false}
      />
    );
  }
);

CurveParticles.displayName = 'CurveParticles';
export default CurveParticles;


// import * as THREE from 'three';
// import { useMemo, useRef, forwardRef } from 'react';
// import { useFrame } from '@react-three/fiber';

// export type CurveParticlesProps = {
//   curve: THREE.Curve<THREE.Vector3>;
//   tubeRadius?: number;
//   maxParticles?: number;
//   particleSize?: number;
//   speed?: number;
//   loop?: boolean;
//   rotationSpeed?: number;
// };

// const CurveParticles = forwardRef<THREE.Points, CurveParticlesProps>(
//   ({
//     curve,
//     tubeRadius = 1,
//     maxParticles = 1000,
//     particleSize = 1,
//     speed = 1,
//     loop = true,
//     rotationSpeed = 1.0
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   }, ref) => {
//     const pointsRef = useRef<THREE.Points<THREE.BufferGeometry<THREE.NormalOrGLBufferAttributes, THREE.BufferGeometryEventMap>, THREE.Material | THREE.Material[], THREE.Object3DEventMap> | null>(null);
//     const materialRef = useRef<THREE.ShaderMaterial>(null);

//     /** Pack curve into uniform array */
//     const curveData = useMemo(() => {
//       const divisions = 128;
//       const pts = curve.getPoints(divisions);
//       const data = new Float32Array((divisions + 1) * 3);
//       pts.forEach((p, i) => {
//         data[i * 3] = p.x;
//         data[i * 3 + 1] = p.y;
//         data[i * 3 + 2] = p.z;
//       });
//       return { data, divisions };
//     }, [curve]);

//     /** Instanced attributes */
//     const geometry = useMemo(() => {
//       const baseGeometry = new THREE.InstancedBufferGeometry();
//       baseGeometry.instanceCount = maxParticles;
//       baseGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

//       const radii = new Float32Array(maxParticles);
//       const progress = new Float32Array(maxParticles);
//       const rand = new Float32Array(maxParticles);
//       const angleOffsets = new Float32Array(maxParticles);

//       for (let i = 0; i < maxParticles; i++) {
//         progress[i] = Math.random();
//         radii[i] = Math.pow(Math.random(), 1.2) * tubeRadius;
//         angleOffsets[i] = Math.random() * Math.PI * 2;
//         rand[i] = Math.random();
//       }

//       baseGeometry.setAttribute('radius', new THREE.InstancedBufferAttribute(radii, 1));
//       baseGeometry.setAttribute('progress', new THREE.InstancedBufferAttribute(progress, 1));
//       baseGeometry.setAttribute('rand', new THREE.InstancedBufferAttribute(rand, 1));
//       baseGeometry.setAttribute('angleOffset', new THREE.InstancedBufferAttribute(angleOffsets, 1));

//       return baseGeometry;
//     }, [maxParticles, tubeRadius]);

//     const shaderMaterial = useMemo(() => {
//       const mat = new THREE.ShaderMaterial({
//         uniforms: {
//           time: { value: 0 },
//           size: { value: particleSize },
//           speed: { value: speed },
//           loop: { value: loop ? 1 : 0 },
//           rotationSpeed: { value: rotationSpeed },
//           curvePoints: { value: curveData.data },
//           curveDivisions: { value: curveData.data.length / 3 - 1 }
//         },
//         vertexShader: `
//         precision highp float;
// attribute float radius;
// attribute float progress;
// attribute float rand;
// attribute float angleOffset;

// uniform float time;
// uniform float size;
// uniform float speed;        // along the curve
// uniform float loop;
// uniform float rotationSpeed; // optional visual rotation along curve direction
// uniform float orbitSpeed;    // spin around minor radius
// uniform float curveDivisions;
// uniform vec3 curvePoints[129];

// varying vec3 vColor;

// vec3 sampleCurve(float t) {
//   float scaledT = t * curveDivisions;
//   int idx = int(floor(scaledT));
//   float f = fract(scaledT);
//   vec3 p0 = curvePoints[idx];
//   vec3 p1 = curvePoints[min(idx+1, int(curveDivisions))];
//   return mix(p0, p1, f);
// }

// void main() {
//   // progress along the curve
//   float t = mod(progress + time * speed, 1.0);
//   if (loop == 0.0 && t < progress) {
//     gl_Position = vec4(10000.0,10000.0,10000.0,1.0);
//     return;
//   }

//   vec3 pos = sampleCurve(t);
//   vec3 nextPos = sampleCurve(mod(t + 0.01, 1.0));
//   vec3 tangent = normalize(nextPos - pos);
//   vec3 binormal = normalize(cross(tangent, vec3(0.0,1.0,0.0)));
//   vec3 normal = normalize(cross(binormal, tangent));

//   // minor radius orbit
//   float invRadius = 1.0 / max(radius, 0.05);
//   float orbitAngle = angleOffset + time * orbitSpeed * invRadius;
//   float s = sin(orbitAngle);
//   float c = cos(orbitAngle);

//   vec3 orbitOffset = normal * (radius * c) + binormal * (radius * s);

//   // final world position
//   vec3 worldPos = pos + orbitOffset;

//   vColor = vec3(0.3+0.7*rand, 0.5*rand, 1.0);

//   vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
//   gl_PointSize = size * (1800.0 / -mvPosition.z);
//   gl_Position = projectionMatrix * mvPosition;
// }

//         `,
//         fragmentShader: `
//           precision highp float;
//           varying vec3 vColor;
//           void main() {
//             vec2 uv = gl_PointCoord - 0.5;
//             if(length(uv) > 0.5) discard;
//             gl_FragColor = vec4(vColor, 1.0);
//           }
//         `,
//         transparent: true,
//         blending: THREE.AdditiveBlending,
//         depthWrite: false,
//       });
//       mat.needsUpdate = true; // Important for uniforms array
//       return mat;
//     }, [particleSize, speed, loop, rotationSpeed, curveData]);

//     useFrame(({ clock }) => {
//       if (materialRef.current) {
//         materialRef.current.uniforms.time.value = clock.getElapsedTime();
//       }
//     });

//     return (
//       <points
//         ref={(mesh) => {
//           pointsRef.current = mesh;
//           if (mesh) materialRef.current = mesh.material as THREE.ShaderMaterial;
//         }}
//         args={[geometry, shaderMaterial]}
//         frustumCulled={false}
//       />
//     );
//   }
// );

// CurveParticles.displayName = 'CurveParticles';
// export default CurveParticles;
