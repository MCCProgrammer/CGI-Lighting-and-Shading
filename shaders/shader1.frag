#version 300 es
precision mediump float;

const int MAX_LIGHTS = 8; // Limite imposto pelo enunciado

// Estrutura dinâmica (substitui os 'const' dos slides)
struct LightInfo {
    vec4 position;      // w=1: Posição (Point/Spot), w=0: Direção (Directional)
    vec3 ambient;       // Ia
    vec3 diffuse;       // Id
    vec3 specular;      // Is
    
    // Parâmetros extra para o Spotlight (Foco)
    vec3 spotDirection; // Para onde o foco aponta
    float spotCutoff;   // Ângulo de abertura (graus)
    float spotExponent; // Decaimento da luz
    bool isSpot;        // Se é spotlight ou não
};

struct MaterialInfo {
    vec3 Ka;            // Coeficiente Ambiente
    vec3 Kd;            // Coeficiente Difuso
    vec3 Ks;            // Coeficiente Especular
    float shininess;    // Brilho
};

// Uniforms (dados que vêm do Javascript)
uniform int u_n_lights;
uniform LightInfo u_lights[MAX_LIGHTS];
uniform MaterialInfo u_material;

// Dados interpolados vindos do Vertex Shader
in vec3 v_normal;   // N
in vec3 v_posCam;   // Posição do fragmento

out vec4 color;

void main() {
    // Normalizar vetores (Slide 21)
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_posCam); // O observador está na origem (0,0,0)

    vec3 totalAmbient = vec3(0.0);
    vec3 totalDiffuse = vec3(0.0);
    vec3 totalSpecular = vec3(0.0);

    // Ciclo para suportar múltiplas luzes
    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i >= u_n_lights) break;

        vec3 L;
        float attenuation = 1.0; 

        // --- 1. Calcular Vetor L (Luz) ---
        if(u_lights[i].position.w == 0.0) {
            // Luz Direcional (Sol)
            L = normalize(u_lights[i].position.xyz);
        } else {
            // Luz Pontual ou Spotlight
            L = normalize(u_lights[i].position.xyz - v_posCam);
            
            // --- 2. Cálculo do Spotlight (Foco) ---
            if(u_lights[i].isSpot) {
                vec3 D = normalize(u_lights[i].spotDirection); 
                float spotCos = dot(-L, D); // Cosseno do ângulo atual
                float cutoffCos = cos(radians(u_lights[i].spotCutoff)); // Cosseno do limite

                if(spotCos < cutoffCos) {
                    attenuation = 0.0; // Fora do cone -> Escuro
                } else {
                    attenuation = pow(spotCos, u_lights[i].spotExponent);
                }
            }
        }

        // Se a luz tiver efeito (attenuation > 0)
        if(attenuation > 0.0) {
            // --- Ambiente (Ia * Ka) ---
            totalAmbient += u_lights[i].ambient * u_material.Ka * attenuation;

            // --- Difusa (Id * Kd * dot(N,L)) ---
            float diffuseFactor = max(dot(L, N), 0.0);
            totalDiffuse += diffuseFactor * u_lights[i].diffuse * u_material.Kd * attenuation;

            // --- Especular (Is * Ks * dot(R,V)^n) ---
            if(diffuseFactor > 0.0) {
                vec3 R = reflect(-L, N); // Vetor refletido
                float specularFactor = pow(max(dot(R, V), 0.0), u_material.shininess);
                totalSpecular += specularFactor * u_lights[i].specular * u_material.Ks * attenuation;
            }
        }
    }

    // Cor Final = Somatório das componentes (Como na Foto 2 do quadro)
    vec3 finalColor = totalAmbient + totalDiffuse + totalSpecular;
    color = vec4(finalColor, 1.0);
}