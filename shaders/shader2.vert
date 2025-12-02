#version 300 es

const int MAX_LIGHTS = 8;

struct LightInfo {
    vec4 position;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 spotDirection;
    float spotCutoff;
    float spotExponent;
    bool isSpot;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_model_view;
uniform mat4 u_projection;
uniform mat4 u_normals;

uniform int u_n_lights;
uniform LightInfo u_lights[MAX_LIGHTS];
uniform MaterialInfo u_material;

out vec4 v_color; // A cor calculada é passada para o fragment shader

void main() {
    // 1. Geometria (Camera Space)
    vec4 posCam4 = u_model_view * a_position;
    vec3 posCam = posCam4.xyz;
    vec3 N = normalize((u_normals * vec4(a_normal, 0.0)).xyz);
    vec3 V = normalize(-posCam); // Viewer na origem

    vec3 totalAmbient = vec3(0.0);
    vec3 totalDiffuse = vec3(0.0);
    vec3 totalSpecular = vec3(0.0);

    // 2. Ciclo de Luzes
    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i >= u_n_lights) break;

        vec3 L;
        float attenuation = 1.0;

        if(u_lights[i].position.w == 0.0) {
            L = normalize(u_lights[i].position.xyz);
        } else {
            L = normalize(u_lights[i].position.xyz - posCam);
            
            // Spotlight logic
            if(u_lights[i].isSpot) {
                vec3 D = normalize(u_lights[i].spotDirection);
                float spotCos = dot(-L, D);
                float cutoffCos = cos(radians(u_lights[i].spotCutoff));

                if(spotCos < cutoffCos) {
                    attenuation = 0.0;
                } else {
                    attenuation = pow(spotCos, u_lights[i].spotExponent);
                }
            }
        }

        if(attenuation > 0.0) {
            // Ambiente
            totalAmbient += u_lights[i].ambient * u_material.Ka * attenuation;

            // Difusa
            float diffuseFactor = max(dot(L, N), 0.0);
            totalDiffuse += diffuseFactor * u_lights[i].diffuse * u_material.Kd * attenuation;

            // Especular
            if(diffuseFactor > 0.0) {
                vec3 R = reflect(-L, N);
                float specularFactor = pow(max(dot(R, V), 0.0), u_material.shininess);
                totalSpecular += specularFactor * u_lights[i].specular * u_material.Ks * attenuation;
            }
        }
    }

    vec3 finalColor = totalAmbient + totalDiffuse + totalSpecular;
    v_color = vec4(finalColor, 1.0);
    
    gl_Position = u_projection * posCam4;
}