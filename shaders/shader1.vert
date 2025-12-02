#version 300 es

in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_model_view;
uniform mat4 u_projection;
uniform mat4 u_normals; // Matriz normal (inversa da transposta da model_view)

// Dados para passar ao Fragment Shader (interpolados)
out vec3 v_normal;  // Normal no referencial da câmara
out vec3 v_posCam;  // Posição do vértice no referencial da câmara

void main() {
    // 1. Calcular a posição do vértice no referencial da câmara
    // Slide 32: vec3 posC = (u_mModelView * a_position).xyz; [cite: 834]
    vec4 posCam4 = u_model_view * a_position;
    v_posCam = posCam4.xyz;

    // 2. Calcular a normal no referencial da câmara
    // Slide 33: v_normal = (u_mNormals * a_normal).xyz; [cite: 847]
    v_normal = normalize((u_normals * vec4(a_normal, 0.0)).xyz);

    // 3. Posição final no ecrã (Clip Space)
    gl_Position = u_projection * posCam4;
}