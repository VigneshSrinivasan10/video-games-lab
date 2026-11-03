/* Static sky visibility for central Berlin. This is a height-field approximation,
   not a full global-illumination solve. Nothing is rebaked during flight. */
window.CityUrbanLight = (() => {
  const levels = [0, 4, 10, 20, 40, 80, 160];
  function field(features, { size = 96, cell = 16, origin = [-568, -668] } = {}) {
    const height = new Float32Array(size * size), data = new Uint8Array(size * size * levels.length * 4);
    const inside = (x, z, ring) => { let yes = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes; } return yes; };
    let buildings = 0;
    for (const f of features) {
      if (f.k !== 'building' || !(f.h > 0)) continue;
      const xs = f.p.map(p => p[0]), zs = f.p.map(p => p[1]);
      const x0 = Math.max(0, Math.floor((Math.min(...xs) - origin[0]) / cell)), x1 = Math.min(size - 1, Math.floor((Math.max(...xs) - origin[0]) / cell));
      const z0 = Math.max(0, Math.floor((Math.min(...zs) - origin[1]) / cell)), z1 = Math.min(size - 1, Math.floor((Math.max(...zs) - origin[1]) / cell));
      if (x0 > x1 || z0 > z1) continue; buildings++;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const px = origin[0] + (x + .5) * cell, pz = origin[1] + (z + .5) * cell;
        if (inside(px, pz, f.p) && !(f.holes || []).some(r => inside(px, pz, r))) height[z * size + x] = Math.max(height[z * size + x], f.h);
      }
    }
    const directions = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
    const distances = [.75, 1.5, 2.5, 4, 6, 9].map(n => n * cell);
    let minimum = 1;
    for (let layer = 0; layer < levels.length; layer++) for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
      let blocked = 0;
      for (const [dx, dz] of directions) {
        let slope = 0;
        for (const distance of distances) {
          const xx = Math.floor(x + .5 + dx * distance / cell), zz = Math.floor(z + .5 + dz * distance / cell);
          if (xx < 0 || zz < 0 || xx >= size || zz >= size) continue;
          slope = Math.max(slope, (height[zz * size + xx] - levels[layer] - 1) / distance);
        }
        blocked += slope * slope / (1 + slope * slope);
      }
      const visibility = 1 - blocked / directions.length, i = ((layer * size + z) * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.round(visibility * 255); data[i + 3] = 255; minimum = Math.min(minimum, visibility);
    }
    return { data, size, cell, origin, levels, stats: { buildings, probes: size * size * levels.length, minimumVisibility: minimum } };
  }
  function bake({ T, scene, features, daylight }) {
    const f = field(features), texture = new T.DataTexture(f.data, f.size, f.size * levels.length, T.RGBAFormat);
    texture.minFilter = texture.magFilter = T.LinearFilter; texture.needsUpdate = true;
    const uniforms = {
      citySkyVisibility: { value: texture }, cityProbeBounds: { value: new T.Vector3(...f.origin, f.size * f.cell) },
      cityBounce: { value: daylight.sunColor.clone().multiplyScalar(.24) }
    };
    let materials = 0;
    scene.traverse(object => { for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material?.isMeshStandardMaterial || material.userData.cityUrbanLighting) continue;
      material.userData.cityUrbanLighting = true; materials++;
      const previous = material.onBeforeCompile, key = material.customProgramCacheKey();
      material.onBeforeCompile = function(shader, renderer) {
        previous.call(this, shader, renderer); Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = 'varying vec3 vCityLightPosition;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vec4 cityPosition=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            cityPosition=instanceMatrix*cityPosition;
          #endif
          vCityLightPosition=(modelMatrix*cityPosition).xyz;`);
        shader.fragmentShader = `varying vec3 vCityLightPosition; uniform sampler2D citySkyVisibility; uniform vec3 cityProbeBounds,cityBounce;
          float cityVisibility(vec3 p){
            vec2 uv=(p.xz-cityProbeBounds.xy)/cityProbeBounds.z;
            float edge=min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y));
            if(edge<=0.)return 1.;
            float low=0.,high=1.,t=clamp(p.y/4.,0.,1.);
            if(p.y>4.){low=1.;high=2.;t=(p.y-4.)/6.;}
            if(p.y>10.){low=2.;high=3.;t=(p.y-10.)/10.;}
            if(p.y>20.){low=3.;high=4.;t=(p.y-20.)/20.;}
            if(p.y>40.){low=4.;high=5.;t=(p.y-40.)/40.;}
            if(p.y>80.){low=5.;high=6.;t=(p.y-80.)/80.;}
            uv=clamp(uv,vec2(.5/96.),vec2(1.-.5/96.));
            float a=texture2D(citySkyVisibility,vec2(uv.x,(uv.y+low)/7.)).r;
            float b=texture2D(citySkyVisibility,vec2(uv.x,(uv.y+high)/7.)).r;
            return mix(1.,mix(a,b,clamp(t,0.,1.)),smoothstep(0.,.04,edge));
          }\n` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `
          vec3 cityNormal=inverseTransformDirection(normal,viewMatrix);
          float citySky=cityVisibility(vCityLightPosition+cityNormal*5.+vec3(0.,1.,0.));
          float cityFill=mix(.48,1.,citySky);
          irradiance*=cityFill;iblIrradiance*=cityFill;
          irradiance+=cityBounce*(1.-citySky);
          #include <lights_fragment_end>`);
      };
      material.customProgramCacheKey = () => key + ':berlin-urban-light-v1'; material.needsUpdate = true;
    } });
    return { texture, stats: { ...f.stats, materials } };
  }
  return { field, bake };
})();
