// fragment.glsl
varying vec3 vColor;
varying float vAlpha;

void main() {
  gl_FragColor = vec4(vColor, vAlpha);

  // Optional: soft edge circle
  float dist = length(gl_PointCoord - 0.5);
  if (dist > 0.5) discard;
}
