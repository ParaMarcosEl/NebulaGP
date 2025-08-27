// Fixed and type-safe version
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

// 1. Define the type for the uniforms
type ShaderUniforms = {
  uTime: {
    value: number;
  };
};

const vertexShader = `
// New rotation function
mat4 rotation3dY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat4(
        vec4(c, 0.0, -s, 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(s, 0.0, c, 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
}

uniform float uTime;

void main() {
    // 1. Get the rotation matrix based on uTime
    mat4 rotationMatrix = rotation3dY(uTime * 0.2);
    
    // 2. Apply the rotation to the original position
    // Use rotationMatrix instead of calling the function directly
    vec4 rotatedPosition = rotationMatrix * vec4(position, 1.0);
    
    // 3. Now apply the model, view, and projection matrices
    vec4 modelPosition = modelMatrix * rotatedPosition;
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
    gl_PointSize = 3.0;
}
`;

const fragmentShader = `
void main() {
  gl_FragColor = vec4(0.34, 0.53, 0.96, 1.0);
}
`;

const ParticalSystem = ({
  count,
  position = new THREE.Vector3(),
}: {
  count: number;
  position?: [number, number, number] | THREE.Vector3;
}) => {
  // 2. Specify the correct type for the points ref
  const points = useRef<THREE.Points | null>(null);

  const particlesPosition = useMemo(() => {
    // 3. Define the type for the Float32Array
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 0] = (Math.random() - 0.5) * 10;
      positions[i3 + 1] = (Math.random() - 0.5) * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, [count]);

  const uniforms: ShaderUniforms = useMemo(
    () => ({
      uTime: {
        value: 0.0,
      },
    }),
    [],
  );

  useFrame((state) => {
    // 4. Use optional chaining and type narrowing
    if (!points.current) return;
    const { clock } = state;

    // 5. Access the uniforms safely
    const material = points.current.material as THREE.ShaderMaterial;
    if (material && material.uniforms) {
      material.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <group position={position}>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute
            // 6. Provide the correct type for the args
            attach="attributes-position"
            args={[particlesPosition, 3]}
            count={count}
          />
        </bufferGeometry>
        <shaderMaterial
          depthWrite={false}
          fragmentShader={fragmentShader}
          vertexShader={vertexShader}
          uniforms={uniforms}
        />
      </points>
    </group>
  );
};

export default ParticalSystem;
