uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uSpecularCloudsTexture;
uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

varying vec2 vUv;//position
varying vec3 vNormal;
varying vec3 vPosition;

void main()
{
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    vec3 color = vec3(0.0);

    // Sun Direction
   // vec3 uSunDirection = vec3(0.0, 0.0, 1.0); replace this variable from uniforms(script.js)
    //Calculation of sun orientation
    float sunOrientation = dot(uSunDirection, normal);//how much  the face is oriented toward the sun
    //color = vec3(sunOrientation);

    // dayMix variable to use it to mix between dayColor/nightColor
    //we need to remap it, clamp it, using smoothstep the transition between dayColor & nightColor, because by default we get night here
    //float dayMix = sunOrientation;
    float dayMix = smoothstep(- 0.25, 0.5, sunOrientation);// how much day we want


    //Day/Night Color
    vec3 dayColor = texture(uDayTexture, vUv).rgb;
    vec3 nightColor = texture(uNightTexture, vUv).rgb;

    color = mix(nightColor, dayColor, dayMix);

    // SPECULARCLOUDSCOLOR
    vec2 specularCloudsColor = texture(uSpecularCloudsTexture, vUv).rg;
    //color = vec3(specularCloudsColor, 0.0);

    //CLOUDS
    //float cloudsMix = specularCloudsColor.g;
    //as the coulds very intensive are, we are goint to set limits between 0.5 & 1.0
        float cloudsMix = smoothstep(0.5, 1.0, specularCloudsColor.g);
        // in the night side we are going to make disappear the clouds with alpha: cloudsMix * dayMix
    cloudsMix *= dayMix;
    color = mix(color, vec3(1.0), cloudsMix);

    //FRESNEL
    float fresnel = dot(viewDirection, normal) + 1.0;
    fresnel = pow(fresnel, 2.0);// to push the fresnel more on the edges
   // color = vec3(fresnel);

    //ATMOSPHERE
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor,uAtmosphereDayColor, atmosphereDayMix);
    //combine the atmosphete with fresnel & color => fresnel * atmosphereDayMix => so the fresnel is not applied in the night-side
    color = mix(color, atmosphereColor, fresnel * atmosphereDayMix);

    //SPECULAR(Project: three.js-glsl_lights-shading-shaders)
    vec3 reflection = reflect( - uSunDirection, normal);
    float specular = - dot(reflection, viewDirection);
    specular = max(0.0, specular);
    specular = pow(specular, 32.0);
     specular *= specularCloudsColor.r;

    // we want the specular to have the color of atmosphereColor, but only when specular is on the edges, despite we need to the fresnel
    vec3 specularColor = mix(vec3(1.0), atmosphereColor, fresnel);

       
    color += specular * specularColor;


    
    // Final color
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}