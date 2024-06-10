const vertexShaderTxt = `
precision mediump float;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProjection;

attribute vec3 vertPosition;
attribute vec2 textureCoord;
attribute vec3 vertNormal;

varying vec2 fragTextureCoord;
varying vec3 fragNormal;
varying vec3 fragPosition;

void main() {
    fragTextureCoord = textureCoord;
    fragNormal = (mWorld * vec4(vertNormal, 0.0)).xyz;
    fragPosition = (mWorld * vec4(vertPosition, 1.0)).xyz;
    gl_Position = mProjection * mView * mWorld * vec4(vertPosition, 1.0);
}
`;

const fragmentShaderTxt = `
precision mediump float;

varying vec2 fragTextureCoord;
varying vec3 fragNormal;
varying vec3 fragPosition;

uniform sampler2D sampler;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

void main() {
    vec3 norm = normalize(fragNormal);
    vec3 lightDir = normalize(lightDirection);

    // Diffuse lighting
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * lightColor;

    // Ambient lighting
    vec3 ambient = ambientColor;

    vec4 texColor = texture2D(sampler, fragTextureCoord);
    vec3 resultColor = (ambient + diffuse) * texColor.rgb;

    gl_FragColor = vec4(resultColor, texColor.a);
}
`;

const mat4 = glMatrix.mat4;
function startDraw() {
    OBJ.downloadMeshes({
        'sphere': 'models/spheeere.obj'
    }, Triangle);
}

const Triangle = function (meshes) {
    const canvas = document.getElementById('main-canvas');
    const gl = canvas.getContext('webgl');
    let canvasColor = [0.2, 0.7, 0.5];

    checkGl(gl);

    gl.clearColor(...canvasColor, 1.0);  // R,G,B, A 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderTxt);
    gl.shaderSource(fragmentShader, fragmentShaderTxt);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);

    gl.validateProgram(program);

    OBJ.initMeshBuffers(gl, meshes.sphere);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshes.sphere.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshes.sphere.indexBuffer);
    
    const posAttrLoc = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        posAttrLoc,
        meshes.sphere.vertexBuffer.itemSize,
        gl.FLOAT,
        gl.FALSE,
        0,
        0
    );
    
    gl.enableVertexAttribArray(posAttrLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshes.sphere.normalBuffer);

    const normalAttrLoc = gl.getAttribLocation(program, 'vertNormal');
    gl.vertexAttribPointer(
        normalAttrLoc,
        meshes.sphere.normalBuffer.itemSize,
        gl.FLOAT,
        gl.FALSE,
        0,
        0
    );

    gl.enableVertexAttribArray(normalAttrLoc);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, meshes.sphere.textureBuffer);

    const textureAttrLoc = gl.getAttribLocation(program, 'textureCoord');
    gl.vertexAttribPointer(
        textureAttrLoc,
        meshes.sphere.textureBuffer.itemSize,
        gl.FLOAT,
        gl.FALSE,
        0,
        0
    );

    gl.enableVertexAttribArray(textureAttrLoc);

    const img = document.getElementById('img');
    const boxTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
        gl.TEXTURE_2D, 
        0,      // level of detail
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img
    );
    gl.bindTexture(gl.TEXTURE_2D, null);

    // render time

    gl.useProgram(program);

    const worldMatLoc = gl.getUniformLocation(program, 'mWorld');
    const viewMatLoc = gl.getUniformLocation(program, 'mView');
    const projMatLoc = gl.getUniformLocation(program, 'mProjection');
    const lightDirLoc = gl.getUniformLocation(program, 'lightDirection');
    const lightColorLoc = gl.getUniformLocation(program, 'lightColor');
    const ambientColorLoc = gl.getUniformLocation(program, 'ambientColor');

    const worldMatrix  = mat4.create();
    const viewMatrix  = mat4.create();
    mat4.lookAt(viewMatrix, [0,0,-8], [0,0,0], [0,1,0]); // vectors are: position of the camera, which way they are looking, which way is up
    const projectionMatrix  = mat4.create();
    mat4.perspective(projectionMatrix, glMatrix.glMatrix.toRadian(90), 
                canvas.width / canvas.height, 0.1, 1000.0);

    gl.uniformMatrix4fv(worldMatLoc, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(viewMatLoc, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(projMatLoc, gl.FALSE, projectionMatrix);
    gl.uniform3fv(lightDirLoc, [0.0, -1.0, 0.0]); // Light coming from above
    gl.uniform3fv(lightColorLoc, [1.0, 1.0, 1.0]); // White light
    gl.uniform3fv(ambientColorLoc, [0.2, 0.2, 0.2]); // Ambient light

    let cameraPosition = [0, 0, -8];
    const cameraSpeed = 0.1;

    let keysPressed = {};

    document.addEventListener('keydown', function(event) {
        keysPressed[event.key] = true;
    });
    
    document.addEventListener('keyup', function(event) {
        keysPressed[event.key] = false;
    });
    let lastFrameTime = 0;
    const rotationSpeed = 0.002;
    let currentTime = performance.now();
    function loop() {
        const deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;
        currentTime = performance.now();

        
        if (keysPressed['ArrowUp']) {
            cameraPosition[1] -= cameraSpeed;
        }
        if (keysPressed['ArrowDown']) {
            cameraPosition[1] +=cameraSpeed;
        }
        if (keysPressed['ArrowLeft']) {
            cameraPosition[0] -= cameraSpeed;
        }
        if (keysPressed['ArrowRight']) {
            cameraPosition[0] += cameraSpeed;
        }
        mat4.lookAt(viewMatrix, cameraPosition, [cameraPosition[0], cameraPosition[1], cameraPosition[2] + 1], [0,1,0]);
        const angle = rotationSpeed * deltaTime;
        mat4.rotate(worldMatrix, worldMatrix, angle, [0,1,-0.5]); // Zmienione z identityMat na worldMatrix
        gl.uniformMatrix4fv(viewMatLoc, gl.FALSE, viewMatrix);
        gl.uniformMatrix4fv(worldMatLoc, gl.FALSE, worldMatrix); // Aktualizacja macierzy światowej
           
        gl.clearColor(...canvasColor, 1.0);  // R,G,B, A 
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, boxTexture);
        gl.activeTexture(gl.TEXTURE0);   
        
        gl.drawElements(gl.TRIANGLES, meshes.sphere.indexBuffer.numItems, 
                gl.UNSIGNED_SHORT, 0);
        
        requestAnimationFrame(loop);
    }
        
    requestAnimationFrame(loop);
}

function checkGl(gl) {
    if (!gl) {
        console.log('WebGL not supported, use another browser');
    }
}        

function checkShaderCompile(gl, shader) {
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('shader not compiled', gl.getShaderInfoLog(shader));
    }
}

function checkLink(gl, program) {
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('ERROR linking program!', gl.getProgramInfoLog(program));
    }
}
