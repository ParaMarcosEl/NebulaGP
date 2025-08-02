console.log('TerrainWorker.worker.js alive.');

function permuteScalar(x) {
  return ((x * 34.0 + 1.0) * x) % 289.0;
}

// function permuteVec3(x) {
//   return [permuteScalar(x[0]), permuteScalar(x[1]), permuteScalar(x[2])];
// }

function noise(v) {
  const C = { x: 0.211324865, y: 0.366025404, z: 0.577350269, w: 0.0243902439 };
  const dot = (v1, v2) =>
    v1.x * v2.x + v1.y * v2.y;

  const i_x = Math.floor(v.x + (v.x + v.y) * C.y);
  const i_y = Math.floor(v.y + (v.x + v.y) * C.y);
  const i = { x: i_x, y: i_y };

  const x0 = { x: v.x - i.x + (i.x + i.y) * C.x, y: v.y - i.y + (i.x + i.y) * C.x };

  const i1_x = x0.x > x0.y ? 1.0 : 0.0;
  const i1_y = x0.x > x0.y ? 0.0 : 1.0;
  const i1 = { x: i1_x, y: i1_y };

  const x12_x = x0.x + C.x;
  const x12_y = x0.y + C.x;
  const x12_z = x0.x + C.z;
  const x12_w = x0.y + C.z;

  const x12 = {
    xy: { x: x12_x, y: x12_y },
    zw: { x: x12_z, y: x12_w },
  };
  x12.xy.x -= i1.x;
  x12.xy.y -= i1.y;

  const p_y_perm = permuteScalar(i.y + 0.0);
  const p_y_i1y_perm = permuteScalar(i.y + i1.y);
  const p_y_1_perm = permuteScalar(i.y + 1.0);

  const p_x_0_perm = permuteScalar(i.x + 0.0);
  const p_x_i1x_perm = permuteScalar(i.x + i1.x);
  const p_x_1_perm = permuteScalar(i.x + 1.0);

  const p_0 = permuteScalar(p_y_perm + p_x_0_perm);
  const p_1 = permuteScalar(p_y_i1y_perm + p_x_i1x_perm);
  const p_2 = permuteScalar(p_y_1_perm + p_x_1_perm);

  const p = [p_0, p_1, p_2];

  const x = p.map((val) => ((val * C.w) % 1.0) * 2.0 - 1.0);
  const h = x.map((val) => Math.abs(val) - 0.5);
  const ox = x.map((val) => Math.floor(val + 0.5));
  const a0 = x.map((val, idx) => val - ox[idx]);

  const g0 = { x: a0[0], y: h[0] };
  const g1 = { x: a0[1], y: h[1] };
  const g2 = { x: a0[2], y: h[2] };

  const w = [
    Math.max(0.5 - dot(x0, x0), 0.0),
    Math.max(0.5 - dot(x12.xy, x12.xy), 0.0),
    Math.max(0.5 - dot(x12.zw, x12.zw), 0.0),
  ];
  const w4 = w.map((val) => val * val * val * val);

  const n = w4[0] * dot(g0, x0) + w4[1] * dot(g1, x12.xy) + w4[2] * dot(g2, x12.zw);
  return 70.0 * n;
}

function fbm(pos, params) {
  let total = 0.0;
  let frequency = params.uFrequency;
  let amplitude = params.uAmplitude;
  let maxAmplitude = 0.0;

  for (let i = 0; i < 10; i++) {
    if (i >= params.uOctaves) break;
    total += noise({ x: pos.x * frequency, y: pos.y * frequency }) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= params.uPersistence;
    frequency *= params.uLacunarity;
  }

  const normalized = total / maxAmplitude;
  return Math.pow((normalized + 1.0) / 2.0, params.uExponentiation);
}

function getElevation(
  worldPos,
  params,
) {
  return fbm(worldPos, params) * params.uMaxHeight;
}

self.onmessage = (e) => {
  const { positions, noiseParams } = e.data;

  
  const normals = new Float32Array(positions.length);
  const elevations = new Float32Array(positions.length / 3);
   const epsilon = 0.01;
  try {
    
  
    console.log("Worker: Starting terrain calculation loop.");
  
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
  
      const globalNoiseInput = {
        x: x + noiseParams.uWorldOffset.x + noiseParams.uWorldOrigin.x,
        y: z + noiseParams.uWorldOffset.y + noiseParams.uWorldOrigin.y,
      };
  
      const elevation = getElevation(globalNoiseInput, noiseParams);
      positions[i] = x;
      positions[i + 1] = elevation;
      positions[i + 2] = z;
  
      elevations[i / 3] = elevation / noiseParams.uMaxHeight;
  
      const dx_input = { x: globalNoiseInput.x + epsilon, y: globalNoiseInput.y };
      const dz_input = { x: globalNoiseInput.x, y: globalNoiseInput.y + epsilon };
  
      const elevation_dx = getElevation(dx_input, noiseParams);
      const elevation_dz = getElevation(dz_input, noiseParams);
  
      // FIX: Corrected the cross-product order from (vb x va) to (va x vb)
      // This ensures the normal vector points outwards from the terrain.
      const va = { x: epsilon, y: elevation_dx - elevation, z: 0.0 };
      const vb = { x: 0.0, y: elevation_dz - elevation, z: epsilon };
  
      const normal_x = va.y * vb.z - va.z * vb.y;
      const normal_y = va.z * vb.x - va.x * vb.z;
      const normal_z = va.x * vb.y - va.y * vb.x;
  
      const normal_length = Math.sqrt(
        normal_x * normal_x + normal_y * normal_y + normal_z * normal_z,
      );
      
      if (normal_length === 0) {
        console.error(`Worker: Normal length is zero at index ${i}. Skipping normal calculation.`);
        normals[i] = 0;
        normals[i + 1] = 1;
        normals[i + 2] = 0;
      } else {
        normals[i] = normal_x / normal_length;
        normals[i + 1] = normal_y / normal_length;
        normals[i + 2] = normal_z / normal_length;
      }
    }
  } catch (error) {
    console.log({ TerrainWorkerError: error })
  }

  self.onerror = (e) => {
    console.error('Worker error:', { e });
  };

  // After fill:

  self.postMessage({ normals, elevations, positions /* SAB not needed for inputs */ });
  console.log('finished')
}

// console.log('Worker loaded');

// self.onmessage = ({ data }) => {
//   const { positions } = data;
//   console.log({positions})
//   console.log('Worker received SAB with length:', positions.length);
//   console.log('First value:', positions[0]);

//   // Modify the data (optional)
//   positions[0] = 999;

//   // Send back a signal
//   self.postMessage({ done: true });
// };
