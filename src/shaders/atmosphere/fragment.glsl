
uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;


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



    //FRESNEL
    // float fresnel = dot(viewDirection, normal) + 1.0;
    // fresnel = pow(fresnel, 2.0);// to push the fresnel more on the edges
   // color = vec3(fresnel);

    //ATMOSPHERE
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor,uAtmosphereDayColor, atmosphereDayMix);
    //combine the atmosphete with fresnel & color => fresnel * atmosphereDayMix => so the fresnel is not applied in the night-side
    color += atmosphereColor;

    //Alpha
    float edgeAlpha = dot(viewDirection, normal);
    edgeAlpha = smoothstep(0.0, 0.5, edgeAlpha);

    float dayAlpha = smoothstep(-0.5, 0.0, sunOrientation);
  
    //Combining the two alphas
    float alpha = edgeAlpha * dayAlpha;

    
    // Final color
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}