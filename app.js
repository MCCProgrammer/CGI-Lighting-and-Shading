// --- Utility Imports ---
import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from './libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize, cross } from './libs/MV.js';
import * as dat from './libs/dat.gui.module.js';
import * as CUBE from './libs/objects/cube.js';
import * as SPHERE from './libs/objects/sphere.js';
import * as CYLINDER from './libs/objects/cylinder.js';
import * as BUNNY from './libs/objects/bunny.js';
import * as STACK from './libs/stack.js';

// Converts degrees to radians (needed for camera, lighting calculations)
function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * 
 *
 * @param {Object} shaders - Loaded shader sources for both techniques
 */
function setup(shaders) {
    // --- Canvas & WebGL Context Initialization ---
    const canvas = document.getElementById('gl-canvas');
    canvas.tabIndex = 0; // Keyboard focus
    canvas.focus();
    canvas.addEventListener('contextmenu', evt => evt.preventDefault());
    const gl = setupWebGL(canvas);

    // --- Initialize Scene Objects ---
    CUBE.init(gl);
    SPHERE.init(gl);
    CYLINDER.init(gl);
    BUNNY.init(gl);

    // --- Compile and Link Shader Programs ---
    const programPhong = buildProgramFromSources(gl, shaders['shader1.vert'], shaders['shader1.frag']);
    const programGouraud = buildProgramFromSources(gl, shaders['shader2.vert'], shaders['shader2.frag']);
    let currentProgram = programPhong;
    
    // --- Camera Configuration ---
    // "eye" is the camera position, "at" is the target/look-at point
    let camera = {
        eye: vec3(0, 2.4, 15),       // Initial camera position
        at: vec3(0, 2, 0),           // Point the camera looks at
        up: vec3(0, 1, 0),           // Camera's up vector
        fovy: 45,                    // Field of view in Y
        aspect: 1,                   // Aspect ratio, updated on resize
        near: 0.1,                   // Near plane
        far: 100,                    // Far plane
        // FPS-style controls
        theta: -90,                  // Yaw angle (horizontal)
        phi: 0,                      // Pitch angle (vertical)
        speed: 0.2,                  // Camera move speed
        sensitivity: 0.2             // Mouse sensitivity
    };
    // --- Keyboard State ---
    const keys = { w:false, a:false, s:false, d:false, q:false, e:false };

    // --- Render Options and Lights ---
    let options = {
        wireframe: false,
        cullFace: true,
        depthTest: true,
        shaderType: 'Phong' // Current shader technique
    }

    const MAX_LIGHTS = 8;
    // Main lights: 0 - positional, 1 - directional, 2 - spotlight
    let lights = [
        {
            active: true,
            position: vec4(3.0, 5.0, 3.0, 1.0),   // Point Light
            ambient: [50, 50, 50],
            diffuse: [255, 255, 255],
            specular: [255, 255, 255],
            isSpot: false,
            spotDirection: vec3(0.0, -1.0, 0.0),
            spotCutoff: 45.0,
            spotExponent: 20.0
        },
        {
            active: true,
            position: vec4(-1.0, 1.0, 0.0, 0.0), // Directional light
            ambient: [0, 0, 60],
            diffuse: [100, 100, 255],
            specular: [255, 255, 255],
            isSpot: false,
            spotDirection: vec3(0.0, -1.0, 0.0),
            spotCutoff: 45.0,
            spotExponent: 20.0
        },
        {
            active: false,
            position: vec4(0.0, 8.0, 0.0, 1.0), // Spotlight
            ambient: [20, 20, 20],
            diffuse: [255, 200, 200],
            specular: [255, 255, 255],
            isSpot: true,
            spotDirection: vec3(0.0, -1.0, 0.0),
            spotCutoff: 25.0,
            spotExponent: 15.0
        }
    ];
    // --- Object Materials (e.g. bunny) ---
    let bunnyMaterial = {
        Ka: [50, 50, 50],      // Ambient
        Kd: [180, 180, 180],   // Diffuse
        Ks: [255, 255, 255],   // Specular
        shininess: 100         // Shininess coefficient
    };

    // --- Main GUI Controls (dat.GUI) ---
    const gui = new dat.GUI();

    // Render options
    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "shaderType", ['Phong', 'Gouraud']).onChange(val => {
        currentProgram = (val === 'Phong') ? programPhong : programGouraud;
    });
    optionsGui.add(options, "cullFace").onChange(v => {
        if (v) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
    });
    optionsGui.add(options, "depthTest").onChange(v => {
        if (v) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    });

    // Camera controls
    const cameraGui = gui.addFolder("Camera");
    cameraGui.add(camera, "speed").min(0.01).max(1).step(0.01);
    cameraGui.add(camera, "fovy").min(10).max(120).step(1);
    cameraGui.add(camera, "near", 0.1, 40, 0.001).name("near").onChange(v=>{if(camera.far<=v) camera.far=v+0.001;});
    cameraGui.add(camera, "far", 0.1, 40, 0.01).name("far").onChange(v=>{if(camera.near>=v) camera.near=v-0.001;});
    
    // Camera vectors gui folders
    function updateVec3Proxy(target, idx, val) { target[idx] = Number(val); }
    const eyeGui = gui.addFolder("Eye");
    eyeGui.add(camera.eye, 0, -100, 100, 0.1).name("X").onChange(val=>updateVec3Proxy(camera.eye,0,val));
    eyeGui.add(camera.eye, 1, -100, 100, 0.1).name("Y").onChange(val=>updateVec3Proxy(camera.eye,1,val));
    eyeGui.add(camera.eye, 2, -100, 100, 0.1).name("Z").onChange(val=>updateVec3Proxy(camera.eye,2,val));
    const atGui = gui.addFolder("At");
    atGui.add(camera.at, 0, -100, 100, 0.1).name("X").onChange(val=>updateVec3Proxy(camera.at,0,val));
    atGui.add(camera.at, 1, -100, 100, 0.1).name("Y").onChange(val=>updateVec3Proxy(camera.at,1,val));
    atGui.add(camera.at, 2, -100, 100, 0.1).name("Z").onChange(val=>updateVec3Proxy(camera.at,2,val));
    const upGui = gui.addFolder("Up");
    upGui.add(camera.up, 0, -1, 1, 0.01).name("X").onChange(val=>updateVec3Proxy(camera.up,0,val));
    upGui.add(camera.up, 1, -1, 1, 0.01).name("Y").onChange(val=>updateVec3Proxy(camera.up,1,val));
    upGui.add(camera.up, 2, -1, 1, 0.01).name("Z").onChange(val=>updateVec3Proxy(camera.up,2,val));

    // Lights GUI
    const lightsGui = gui.addFolder("Lights");
    for(let i=0; i<lights.length; i++) {
        const lightDisplayIdx = i + 1;
        const folder = lightsGui.addFolder(`Light ${lightDisplayIdx}`);
        folder.add(lights[i], "active");
        const pos = folder.addFolder("Position");
        pos.add(lights[i].position, 0).name("X").min(-50).max(50).step(0.1);
        pos.add(lights[i].position, 1).name("Y").min(-50).max(50).step(0.1);
        pos.add(lights[i].position, 2).name("Z").min(-50).max(50).step(0.1);
        pos.add(lights[i].position, 3).name("W (Type)").min(0).max(1).step(1);
        const intens = folder.addFolder("Intensities");
        intens.addColor(lights[i], "ambient");
        intens.addColor(lights[i], "diffuse");
        intens.addColor(lights[i], "specular");
        const axis = folder.addFolder("Axis");
        axis.add(lights[i], "isSpot");
        axis.add(lights[i], "spotCutoff").min(0).max(90);
        axis.add(lights[i], "spotExponent").min(0).max(100);
        axis.add(lights[i].spotDirection, 0).name("Dir X").min(-1).max(1).step(0.1);
        axis.add(lights[i].spotDirection, 1).name("Dir Y").min(-1).max(1).step(0.1);
        axis.add(lights[i].spotDirection, 2).name("Dir Z").min(-1).max(1).step(0.1);
    }
    // Bunny (main mesh) material controls
    const matGui = gui.addFolder("Bunny Material");
    matGui.addColor(bunnyMaterial, "Ka");
    matGui.addColor(bunnyMaterial, "Kd");
    matGui.addColor(bunnyMaterial, "Ks");
    matGui.add(bunnyMaterial, "shininess").min(1).max(200);

    // --- Input Event Handlers ---
    // Keyboard
    window.addEventListener("keydown", e => {
        const key = e.key.toLowerCase();
        if(keys.hasOwnProperty(key)) keys[key] = true;
        if(key === "r") resetCamera();
    });
    window.addEventListener("keyup", e => {
        const key = e.key.toLowerCase();
        if(keys.hasOwnProperty(key)) keys[key] = false;
    });
    // Reset camera to default values
    function resetCamera() {
        camera.eye = vec3(0, 5, 15); 
        camera.theta = -90;
        camera.phi = 0;
    }

    // Mouse controls for camera orientation
    let down = false;
    let lastX, lastY;
    canvas.addEventListener('mousedown', e => { 
        if (e.button === 2) {
            down = true;
            lastX = e.offsetX;
            lastY = e.offsetY;
        }
    });
    canvas.addEventListener('mouseup', e => {
        if (e.button === 2) down = false;
    });
    canvas.addEventListener('mouseleave', () => down = false);
    canvas.addEventListener('mousemove', e => {
        if (down) {
            const dx = e.offsetX - lastX;
            const dy = e.offsetY - lastY;
            camera.theta += dx * camera.sensitivity;
            camera.phi   -= dy * camera.sensitivity;
            if(camera.phi > 89) camera.phi = 89;
            if(camera.phi < -89) camera.phi = -89;
            lastX = e.offsetX;
            lastY = e.offsetY;
        }
    });

    // --- GL setup and resize events ---
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    if(options.depthTest) gl.enable(gl.DEPTH_TEST);
    if(options.cullFace) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
    resizeCanvasToFullWindow();
    window.addEventListener('resize', resizeCanvasToFullWindow);
    window.requestAnimationFrame(render);

    // Window resize logic
    function resizeCanvasToFullWindow() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        camera.aspect = canvas.width / canvas.height;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // --- Camera Motion Logic ---
    function updateCamera() {
        const radTheta = toRadians(camera.theta);
        const radPhi = toRadians(camera.phi);
        // Forward vector from yaw/pitch
        const front = vec3(
            Math.cos(radPhi) * Math.cos(radTheta),
            Math.sin(radPhi),
            Math.cos(radPhi) * Math.sin(radTheta)
        );
        const forward = normalize(front);
        const right = normalize(cross(forward, vec3(0, 1, 0)));
        if(keys.w) camera.eye = add(camera.eye, scale(camera.speed, forward));
        if(keys.s) camera.eye = subtract(camera.eye, scale(camera.speed, forward));
        if(keys.d) camera.eye = add(camera.eye, scale(camera.speed, right));
        if(keys.a) camera.eye = subtract(camera.eye, scale(camera.speed, right));
        if(keys.e) camera.eye = add(camera.eye, scale(camera.speed, vec3(0,1,0)));
        if(keys.q) camera.eye = subtract(camera.eye, scale(camera.speed, vec3(0,1,0)));
        camera.at = add(camera.eye, forward); // Always update look-at
    }

    // --- Upload light data to shaders ---
    function uploadLights(program, mView) {
        let activeCount = 0;
        for (let i = 0; i < lights.length; i++) {
            if (lights[i].active) {
                const baseName = `u_lights[${activeCount}]`;
                const lPosCam = mult(mView, lights[i].position);
                gl.uniform4fv(gl.getUniformLocation(program, `${baseName}.position`), flatten(lPosCam));
                const amb = vec3(lights[i].ambient[0]/255, lights[i].ambient[1]/255, lights[i].ambient[2]/255);
                const dif = vec3(lights[i].diffuse[0]/255, lights[i].diffuse[1]/255, lights[i].diffuse[2]/255);
                const spe = vec3(lights[i].specular[0]/255, lights[i].specular[1]/255, lights[i].specular[2]/255);
                gl.uniform3fv(gl.getUniformLocation(program, `${baseName}.ambient`), flatten(amb));
                gl.uniform3fv(gl.getUniformLocation(program, `${baseName}.diffuse`), flatten(dif));
                gl.uniform3fv(gl.getUniformLocation(program, `${baseName}.specular`), flatten(spe));
                gl.uniform1i(gl.getUniformLocation(program, `${baseName}.isSpot`), lights[i].isSpot);
                gl.uniform1f(gl.getUniformLocation(program, `${baseName}.spotCutoff`), lights[i].spotCutoff);
                gl.uniform1f(gl.getUniformLocation(program, `${baseName}.spotExponent`), lights[i].spotExponent);
                const spotDirWorld = vec4(lights[i].spotDirection[0], lights[i].spotDirection[1], lights[i].spotDirection[2], 0.0);
                const spotDirCam = mult(mView, spotDirWorld);
                gl.uniform3fv(gl.getUniformLocation(program, `${baseName}.spotDirection`), flatten(normalize(vec3(spotDirCam[0], spotDirCam[1], spotDirCam[2]))));
                activeCount++;
            }
            if(activeCount >= MAX_LIGHTS) break;
        }
        gl.uniform1i(gl.getUniformLocation(program, "u_n_lights"), activeCount);
    }

    // --- Upload object material to shaders ---
    function uploadMaterial(program, mat) {
        const ka = vec3(mat.Ka[0]/255, mat.Ka[1]/255, mat.Ka[2]/255);
        const kd = vec3(mat.Kd[0]/255, mat.Kd[1]/255, mat.Kd[2]/255);
        const ks = vec3(mat.Ks[0]/255, mat.Ks[1]/255, mat.Ks[2]/255);
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Ka"), flatten(ka));
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Kd"), flatten(kd));
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Ks"), flatten(ks));
        gl.uniform1f(gl.getUniformLocation(program, "u_material.shininess"), mat.shininess);
    }

    // --- Main Render Loop ---
    function render() {
        window.requestAnimationFrame(render);
        updateCamera();
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(currentProgram);
        const mView = lookAt(camera.eye, camera.at, camera.up);
        STACK.loadMatrix(mView);
        const mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
        gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_projection"), false, flatten(mProjection));
        uploadLights(currentProgram, mView);
        // Draw Ground
        uploadMaterial(currentProgram, { Ka:[150,120,60], Kd:[200,170,100], Ks:[30,30,30], shininess: 10 });
        STACK.pushMatrix();
            STACK.multScale([10, 0.5, 10]); 
            STACK.multTranslation([0, -0.5, 0]); 
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_model_view"), false, flatten(STACK.modelView()));
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));
            CUBE.draw(gl, currentProgram, gl.TRIANGLES);
        STACK.popMatrix();
        // Draw Bunny
        uploadMaterial(currentProgram, bunnyMaterial);
        STACK.pushMatrix();
            STACK.multTranslation([2.5, 1.0, 2.5]);
            STACK.multScale([2, 2, 2]); 
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_model_view"), false, flatten(STACK.modelView()));
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));
            BUNNY.draw(gl, currentProgram, gl.TRIANGLES);
        STACK.popMatrix();
        // Draw Sphere
        uploadMaterial(currentProgram, { Ka:[50,0,0], Kd:[200,0,0], Ks:[255,255,255], shininess: 50 });
        STACK.pushMatrix();
            STACK.multTranslation([-2.5, 1.0, 2.5]);
            STACK.multScale([2, 2, 2]); 
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_model_view"), false, flatten(STACK.modelView()));
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));
            SPHERE.draw(gl, currentProgram, gl.TRIANGLES);
        STACK.popMatrix();
        // Draw Cylinder
        uploadMaterial(currentProgram, { Ka:[0,50,0], Kd:[0,200,0], Ks:[255,255,255], shininess: 50 });
        STACK.pushMatrix();
            STACK.multTranslation([2.5, 1.0, -2.5]);
            STACK.multScale([2, 2, 2]); 
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_model_view"), false, flatten(STACK.modelView()));
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));
            CYLINDER.draw(gl, currentProgram, gl.TRIANGLES);
        STACK.popMatrix();
        // Draw Cube
        uploadMaterial(currentProgram, { Ka:[0,0,50], Kd:[0,0,200], Ks:[255,255,255], shininess: 50 });
        STACK.pushMatrix();
            STACK.multTranslation([-2.5, 1.0, -2.5]);
            STACK.multScale([2, 2, 2]); 
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_model_view"), false, flatten(STACK.modelView()));
            gl.uniformMatrix4fv(gl.getUniformLocation(currentProgram, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));
            CUBE.draw(gl, currentProgram, gl.TRIANGLES);
        STACK.popMatrix();
    }
}

// --- Load shaders and launch setup when ready ---
const urls = ['shader1.vert', 'shader1.frag', 'shader2.vert', 'shader2.frag'];
loadShadersFromURLS(urls).then(shaders => setup(shaders));