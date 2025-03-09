import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import GUI from 'lil-gui';
import earthVertexShader from './shaders/earth/vertex.glsl';
import earthFragmentShader from './shaders/earth/fragment.glsl';
import atmosphereVertexShader from './shaders/atmosphere/vertex.glsl';
import atmosphereFragmentShader from './shaders/atmosphere/fragment.glsl';


/**
 * Earth-Shaders- Creating a realistic Earth: 
 * - Different Textures: Day/Night/Coulds(specularClouds)
 * - Part Day/Night looks red-ish
 * - Sun Reflection (most visible on the oceans)
 * - Atmosphere creates a glow all around the Earth (like a kind of volumetric flog outside)
 * 1. Load the textures
 * 2. Send the textures to the earthMaterial as uniforms:
 *          - uDayTexture: on the side of the Earth facing the sun => pick the color using texture() method and the vUv, only rgb channels
 *          - uNightTexture: on the side of the Earth facing the moon > pick the color using texture() method  and the vUv, only rgb channels
 *          - Applying a mix function to mix the dayColor & the nightColor. Despite we need a mixing factor(1.0 = on the side facing the sun; 0.0 = on the side facing the moon)
 *          - This mixing factor is very similar what we had with a directional Light
 *          - We are going to use a dot product
 *          - Creation of the sun direction in the glsl and later we are going to control it as uniform, we need to know where the sun is: vec3 uSunDirection
 *          - Creation  dayMix variable to use it to mix between dayColor/nightColor => color = mix(nightColor, dayColor, dayMix);
 * 3.SUN: We are going to use the Spherical class to handle the coordinates an convert them to a Vector3 => uSunDirection
 * 4. ANISOTROPY:(getMaxAnisotropy()) It is a property available on textures that will improve the sharpness of the texture when seen a 
 *  narrow angle by applyin different levels of filtering, the texture are slightly blurred
 * The higher the anisotropy, sharper the texture, default value = 1. Applying anisotropy directly in textures
 * 5. CLOUDS:
 * - It is possible adding the clouds on a sphere on top of the earth, which enables some flexibility like rotating the clouds independently
 * Rotating the clouds as a full mesh does not look good  and we would need to make the sphere slightly bigger to prevent z-figthtin
 * - Instead, we are going to add the clouds direcly in the shader and not animate them
 * 6. ATMOSPHERE:
 * In the project the atmosphere looks blueish on the day-side,  invisible on the night side, and redish in the twilight
 * We are going to use uniforms and tweaks in order to find the perfect colors 
 * We need to calculate FRESNEL to make the atmosphere more visible  on the edges
 * Like a real atmosphere : like a fog surrounding the whole Earth: We are going to fake that atmosphere creating a sphere slightly bigger
 * only showing the back-side of that sphere, and making it fade out on the edge using a classic fresnel
 *7. SPECULAR: (Similar effect we did for the directional Light)
 - We are going to use the uSpecularCloudsTexture to make the water area reflective
 - Despite we need the reflecting vector of the sun to calculate the  LIGHT REFLECTION
 

   
/**
 * Base
 */
// Debug
const gui = new GUI();
gui.domElement.style.touchAction = 'none'; // Evita que el touchstart se interprete como un intento de desplazamiento
document.body.appendChild(gui.domElement);


// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Loaders
const textureLoader = new THREE.TextureLoader();

/**
 * Environment map
 */

const envMap = new THREE.CubeTextureLoader()
  .setPath("/galaxy/")
  .load(["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]);
envMap.encoding = THREE.sRGBEncoding;
scene.background = envMap;
scene.environment = envMap;

/**
 * Earth
 */
const earthParameters = {};
earthParameters.atmosphereDayColor = '#00aaff';
earthParameters.atmosphereTwilightColor = '#ff6600';

gui
    .addColor(earthParameters, 'atmosphereDayColor')
    .onChange(() =>
    {
        earthMaterial.uniforms.uAtmosphereDayColor.value.set(earthParameters.atmosphereDayColor);
        atmosphereMaterial.uniforms.uAtmosphereDayColor.value.set(earthParameters.atmosphereDayColor);
    });
 gui
    .addColor(earthParameters, 'atmosphereTwilightColor')
    .onChange(() =>
    {
        earthMaterial.uniforms.uAtmosphereTwilightColor.value.set(earthParameters.atmosphereTwilightColor);
        atmosphereMaterial.uniforms.uAtmosphereTwilightColor.value.set(earthParameters.atmosphereTwilightColor);
    });


// Textures
const earthDayTexture = textureLoader.load('./earth/day.jpg');
const earthNightTexture = textureLoader.load('./earth/night.jpg');
const earthSpecularCloundsTexture = textureLoader.load('./earth/specularClouds.jpg');//this is a data file
// Load textures -flare effect
const sunTextureFlare= textureLoader.load('./lenses/lensflare0.png');//sunTextureFlare
const moonTextureFlare = textureLoader.load('./lenses/lensflare1.png');//moonTextureFlare

//update their colorSpace to THREE.SRGBColorSpace
earthDayTexture.colorSpace = THREE.SRGBColorSpace;
earthNightTexture.colorSpace = THREE.SRGBColorSpace;
// sunTextureFlare.colorSpace = THREE.SRGBColorSpace;
// moonTextureFlare.colorSpace = THREE.SRGBColorSpace;
//Anisotropy
earthDayTexture.anisotropy = 8;
earthNightTexture.anisotropy = 8;
earthSpecularCloundsTexture.anisotropy = 8;
// Mesh
const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
const earthMaterial = new THREE.ShaderMaterial({

    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
    uniforms:
    {
        uDayTexture: new THREE.Uniform(earthDayTexture),
        uNightTexture: new THREE.Uniform(earthNightTexture),
        uSpecularCloudsTexture: new THREE.Uniform(earthSpecularCloundsTexture),
        uSunDirection: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
        uAtmosphereDayColor: new THREE.Uniform(new THREE.Color(earthParameters.atmosphereDayColor)),
        uAtmosphereTwilightColor: new THREE.Uniform(new THREE.Color(earthParameters.atmosphereTwilightColor)),
        
    }
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);

scene.add(earth);


//ATMOSPHERE
const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
        uSunDirection: new THREE.Uniform(new THREE.Vector3(0,0,1)),
        uAtmosphereDayColor: new THREE.Uniform(new THREE.Color(earthParameters.atmosphereDayColor)),
        uAtmosphereTwilightColor: new THREE.Uniform(new THREE.Color(earthParameters.atmosphereTwilightColor))
    },
    side: THREE.BackSide,
    transparent: true
});

const atmosphere = new THREE.Mesh(
    earthGeometry,
    atmosphereMaterial
);
atmosphere.scale.set(1.025, 1.025, 1.025);
scene.add(atmosphere);



//Sun
const sunSpherical = new THREE.Spherical(1, Math.PI * 0.5, -0.8);//0.5
const sunDirection = new THREE.Vector3();





//Update sun

// Debug 
const debugSun = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.15, 2),
    new THREE.MeshBasicMaterial({
        color: new THREE.Color("#fffff0"),
    })
)
//scene.add(debugSun);
const sunLensFlare = new Lensflare()
sunLensFlare.addElement(new LensflareElement(sunTextureFlare, 512))
//lensFlare.addElement(new LensflareElement(flareTexture1, 512, 8))

const lightLensflare = new THREE.PointLight()
lightLensflare.add(sunLensFlare);
scene.add(lightLensflare);




const updateSun = () => {
    //updating the sunDirection according to the sunSpherical
    sunDirection.setFromSpherical(sunSpherical);
    //debug-  copy the values from sunDirection; with the radius sunSpherical = 1;  and Earth radius = 2, the mesh is still inside the Earth
    debugSun.position
        .copy(sunDirection)
        .multiplyScalar(18);


    lightLensflare.position
        .copy(sunDirection).multiplyScalar(18);

    
    // update uniform
    earthMaterial.uniforms.uSunDirection.value.copy(sunDirection);
    atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirection);
}
updateSun();

//Tweaks
/**
 * Sun- phi & theta: the angles used in the spherical coordinate system 
 * to describe the position of a point on the surface of the sphere.
 * phi - polar angle in radians from 0 to up. By default is 0
 * theta - equator angle in radians around the y(up ) axis
 * Since the sunSpherical radius = 1; => sunDirection lenght sould be 1 <=> equal in fragment.glsl
 */

gui
    .add(sunSpherical, 'phi')
    .min(Math.PI * 0.3)
    .max(Math.PI * 0.7)
    .onChange(updateSun)

gui
    .add(sunSpherical, 'theta')
    .min(- Math.PI)
    .max(Math.PI)
    .onChange(updateSun)




/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
};

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
camera.position.x = 12;
camera.position.y = 5;
camera.position.z = 4;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
   // alpha: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);
renderer.setClearColor('#000011');//#000011

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();

    earth.rotation.y = elapsedTime * 0.1;

    // debugSun.position.x = Math.cos(elapsedTime) * 5;
    // debugSun.position.z = Math.sin(elapsedTime) * 5;
    // lightLensflare.position.x = Math.cos(elapsedTime) * 5;
    // lightLensflare.position.z = Math.sin(elapsedTime) * 5;


    // Update controls
    controls.update();

   
    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}

tick();