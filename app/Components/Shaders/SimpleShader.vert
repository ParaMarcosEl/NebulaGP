#version 400
#define MAX_INSTANCES 256

uniform mat4 projectioncameramatrix;
uniform instancematrices {mat4 matrix[MAX_INSTANCES];} entity;

in vec3 vertex_position;
in vec3 vertex_normal;

out float light;
out vec3 VNormal;

void main() {
	// A simple light direction
	vec3 lightdir = normalize(vec3(1.0, 0.0, 0.0));
	
	mat4 modelMatrix = entity.matrix[gl_InstanceID];
	
	// Normal Matrix: inverse transpose of the model matrix
	// For uniform scaling, you can just use the upper-left 3x3 part
	mat3 normalMatrix = mat3(modelMatrix);

	VNormal = normalize(normalMatrix * vertex_normal);
	light = dot(VNormal, lightdir);

	gl_Position = projectioncameramatrix * modelMatrix * vec4(vertex_position, 1.0);
}