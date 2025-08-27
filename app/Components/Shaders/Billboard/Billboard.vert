// vertex.glsl
attribute vec3 aPosition;
attribute vec2 aOffset;
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Camera-facing billboard
  vec3 right = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);
  vec3 up    = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);

  vec3 billboardPos = aPosition + (right * aOffset.x + up * aOffset.y) * aSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(billboardPos, 1.0);

  vColor = aColor;
  vAlpha = aAlpha;
}
