declare module 'glslify';

// custom.d.ts or a similar declaration file
import { ThreeElements } from '@react-three/fiber';
//
export declare global {
  namespace JSX {
    interface IntrinsicElements {
      terrainMaterial: ThreeElements['shaderMaterial'] & {
        // Add any custom props specific to your material if they aren't already covered by shaderMaterial
        uTime?: number;
        uMaxHeight?: number;
        uFrequency?: number;
        uAmplitude?: number;
        uOctaves?: number;
        uLacunarity?: number;
        uPersistence?: number;
        uExponentiation?: number;
      };
    }
  }
}

export declare module 'babel-plugin-glsl' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: (strings: TemplateStringsArray, ...args: any[]) => string;
  export default value;
}

declare module '*.worker.ts' {
  // This is a common declaration for `worker-loader`
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}
// src/types/three-declarations.d.ts

// types/worker-loader.d.ts
declare module '*.worker.ts' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}
