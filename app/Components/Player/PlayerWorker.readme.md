### SharedArrayBuffer Layout (Unified)

| Offset | Length | Description                    | Notes                               |
| ------ | ------ | ------------------------------ | ----------------------------------- |
| **0**  | 3      | `position` (x, y, z)           | World-space position                |
| **3**  | 4      | `quaternion` (x, y, z, w)      | Rotation                            |
| **7**  | 3      | `velocity` (vx, vy, vz)        | Linear velocity in world-space      |
| **10** | 3      | `angularVelocity` (ax, ay, az) | Angular velocity for pitch/roll/yaw |
| **13** | 1      | `acceleration`                 | Scalar used along forward vector    |
| **14** | 1      | `pitchVelocity`                | Scalar multiplier for pitch input   |
| **15** | 1      | `rollVelocity`                 | Scalar multiplier for roll input    |
| **16** | 1      | `damping`                      | Damping factor applied per frame    |

---

### Worker Interpretation

```ts
// Float32Array view of the SAB
const sabView = new Float32Array(sab);

// Positions
const pos = new THREE.Vector3(sabView[0], sabView[1], sabView[2]);

// Rotation
const quat = new THREE.Quaternion(sabView[3], sabView[4], sabView[5], sabView[6]);

// Velocity
const velocity = new THREE.Vector3(sabView[7], sabView[8], sabView[9]);

// Angular velocity
const angularVel = new THREE.Vector3(sabView[10], sabView[11], sabView[12]);

// Parameters
const acceleration = sabView[13];
const pitchVel = sabView[14];
const rollVel = sabView[15];
const damping = sabView[16];
```

---

### Worker Usage Notes

1. **Position Integration**

```ts
// Example: velocity integration
pos.addScaledVector(velocity, delta);
```

2. **Rotation Integration**

```ts
// Apply angular velocity to quaternion
const deltaQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(angularVel.x * delta, angularVel.y * delta, angularVel.z * delta),
);
quat.multiply(deltaQuat).normalize();
```

3. **Input Application**

- Roll/Pitch: `angularVel.x += inputAxis.y * pitchVel; angularVel.z += inputAxis.x * rollVel;`
- Throttle: `velocity.addScaledVector(forwardVector, throttle * acceleration);`

4. **Damping**

```ts
velocity.multiplyScalar(damping);
angularVel.multiplyScalar(damping);
```

---

This SAB layout ensures **main thread interpolation** and **worker physics** remain GC-free, fully deterministic, and compatible with the controller code.

---
