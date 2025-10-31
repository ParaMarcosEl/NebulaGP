// Total elements: 1 (Control) + 13 (A) + 13 (B) + 7 (Input/Config) = 34 elements
const SAB_TOTAL_INT32_LENGTH = 34;

// sabConfig.ts
export const sabBuffer = new SharedArrayBuffer(SAB_TOTAL_INT32_LENGTH * 4);
export const sabInt32 = new Int32Array(sabBuffer);
export const sabFloat32 = new Float32Array(sabBuffer);
