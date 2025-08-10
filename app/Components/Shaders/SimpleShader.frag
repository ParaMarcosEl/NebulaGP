#version 400
out vec4 fragData0; // diffuse
out vec4 fragData1; // normal
out vec4 fragData2; // specular

in float light;
in vec3 VNormal;

void main() {
	// Basic diffuse lighting using the light value from the vertex shader
	vec4 diffuse_color = vec4(1.0, 1.0, 1.0, 1.0);
	fragData0 = diffuse_color * max(0.0, light);

	// The normal vector in view space for the normal buffer
	// (VNormal is already in view space from the vertex shader)
	// We remap the range from [-1, 1] to [0, 1]
	vec3 remappedNormal = VNormal * 0.5 + 0.5;
	fragData1 = vec4(remappedNormal, 1.0);
	
	// A simple specular value (e.g., black)
	fragData2 = vec4(0.0);
}