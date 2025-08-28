import * as THREE from "three";

interface CurveParticlesOptions {
  curve: THREE.Curve<THREE.Vector3>;
  maxParticles?: number;
  particleLife?: number;
  spread?: number; // random offset around curve
  size?: number;
  color?: THREE.Color | string | number;
}

export default class CurveParticles {
  mesh: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  positions: Float32Array;
  lifetimes: Float32Array;
  velocities: Float32Array;
  ages: Float32Array;

  maxParticles: number;
  particleLife: number;
  spread: number;

  constructor(options: CurveParticlesOptions) {
    const {
      curve,
      maxParticles = 500,
      particleLife = 3.0,
      spread = 0.2,
      size = 0.05,
      color = 0xffffff,
    } = options;

    this.maxParticles = maxParticles;
    this.particleLife = particleLife;
    this.spread = spread;

    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.ages = new Float32Array(maxParticles);
    this.lifetimes = new Float32Array(maxParticles);

    // Sample curve points
    for (let i = 0; i < maxParticles; i++) {
      const t = Math.random(); // random param along curve
      const point = curve.getPointAt(t);

      const i3 = i * 3;
      this.positions[i3] = point.x + (Math.random() - 0.5) * spread;
      this.positions[i3 + 1] = point.y + (Math.random() - 0.5) * spread;
      this.positions[i3 + 2] = point.z + (Math.random() - 0.5) * spread;

      // random velocity (gentle drifting)
      this.velocities[i3] = (Math.random() - 0.5) * 0.1;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;

      this.ages[i] = Math.random() * particleLife;
      this.lifetimes[i] = particleLife;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uSize: { value: size },
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uSize;
        uniform float uTime;
        varying float vAlpha;

        attribute vec3 position;

        void main() {
          vAlpha = 1.0 - mod(uTime, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          gl_FragColor = vec4(uColor, vAlpha);
        }
      `,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
  }

  update(delta: number) {
    this.material.uniforms.uTime.value += delta;

    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;

      this.positions[i3] += this.velocities[i3] * delta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;

      this.ages[i] += delta;
      if (this.ages[i] > this.lifetimes[i]) {
        // respawn along curve
        const t = Math.random();
        const point = (this.mesh.userData.curve as THREE.Curve<THREE.Vector3>).getPointAt(
          t
        );

        this.positions[i3] = point.x + (Math.random() - 0.5) * this.spread;
        this.positions[i3 + 1] = point.y + (Math.random() - 0.5) * this.spread;
        this.positions[i3 + 2] = point.z + (Math.random() - 0.5) * this.spread;

        this.velocities[i3] = (Math.random() - 0.5) * 0.1;
        this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
        this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;

        this.ages[i] = 0;
      }
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
