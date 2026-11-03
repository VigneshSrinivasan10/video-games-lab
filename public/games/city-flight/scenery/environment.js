/* Original material and planting studies. No downloaded imagery is shipped. */
window.CityEnvironment = {
  create({ T, renderer, style = {}, daylight }) {
    const autumn = style.season === 'autumn', illustrated = style.aesthetic === 'illustrated';
    let seed = 199311;
    const rand = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
    function map(draw, size = 256, color = true) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      draw(canvas.getContext('2d'), size);
      const tex = new T.CanvasTexture(canvas); if (color) tex.colorSpace = T.SRGBColorSpace;
      tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return tex;
    }
    const grain = map((c, n) => {
      if(illustrated){c.fillStyle='#ffffff';c.fillRect(0,0,n,n);return;}
      c.fillStyle = autumn ? '#dedede' : '#deddd7'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 22000; i++) { const v = 160 + rand() * 85 | 0; c.fillStyle = `rgba(${v},${v},${v},.3)`; c.fillRect(rand() * n, rand() * n, 1, 1); }
    });
    const stoneMap = map((c, n) => {
      if(illustrated){c.fillStyle='#f4f5f1';c.fillRect(0,0,n,n);c.fillStyle='#dce2df';for(let y=0;y<n;y+=64)c.fillRect(0,y,n,1);return;}
      c.fillStyle = autumn ? '#bcbcbc' : '#c1b6a2'; c.fillRect(0, 0, n, n);
      for (let y = 0; y < n; y += 32) for (let x = -64; x < n; x += 64) {
        const v = 175 + rand() * 14 | 0, xx = x + (y / 32 % 2) * 32;
        c.fillStyle = autumn ? `rgb(${v + 12},${v + 12},${v + 12})` : `rgb(${v + 20},${v + 14},${v + 2})`; c.fillRect(xx + 1, y + 1, 63, 31);
        c.fillStyle = autumn ? '#ffffff29' : '#fff5d129'; c.fillRect(xx + 1, y + 1, 62, 1);
      }
      for (let i = 0; i < 10000; i++) { c.fillStyle = rand() > .5 ? (autumn ? '#33333320' : '#3c3b3020') : (autumn ? '#ffffff1a' : '#fffbe51a'); c.fillRect(rand() * n, rand() * n, 1, 1); }
    });
    const copperMap = map((c, n) => {
      if(illustrated){c.fillStyle='#b2d7cd';c.fillRect(0,0,n,n);for(let x=0;x<n;x+=32){c.fillStyle='#7ba99f';c.fillRect(x,0,2,n);c.fillStyle='#d4e8dc';c.fillRect(x+2,0,1,n);}return;}
      c.fillStyle = '#82a99a'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 500; i++) {
        const x = rand() * n, y = rand() * n, r = 3 + rand() * 28, g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, i % 3 ? '#c6d9bc60' : '#284e4860'); g.addColorStop(1, '#526f5e00'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let x = 0; x < n; x += 16) { c.fillStyle = '#324b4270'; c.fillRect(x, 0, 1, n); c.fillStyle = '#c3d2b85c'; c.fillRect(x + 1, 0, 1, n); }
      for (let y = 0; y < n; y += 48) { c.fillStyle = '#304b4130'; c.fillRect(0, y, n, 1); }
      for (let i = 0; i < 12000; i++) { c.fillStyle = rand() > .5 ? '#c5d0ac20' : '#213e3520'; c.fillRect(rand() * n, rand() * n, 1, 2); }
      for (let i = 0; i < 85; i++) {
        const x = rand() * n, y = n * (.65 + rand() * .3), h = n - y;
        const stain = c.createLinearGradient(0, y, 0, n); stain.addColorStop(0, '#263f3600'); stain.addColorStop(1, '#263f368c');
        c.fillStyle = stain; c.fillRect(x, y, 1 + rand() * 7, h);
      }
    }, 512);
    const bark = map((c, n) => {
      if(illustrated){c.fillStyle='#c0aa88';c.fillRect(0,0,n,n);return;}
      c.fillStyle = '#736d5c'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 600; i++) { const x = rand() * n, y = rand() * n; c.strokeStyle = i % 2 ? '#b0a58b60' : '#3d413a75'; c.lineWidth = .5 + rand() * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + rand() * 7 - 3, y + 9 + rand() * 70); c.stroke(); }
    });
    const foliage = map((c, n) => {
      if(illustrated){
        c.fillStyle='#ffffff';c.fillRect(0,0,n,n);
        for(let i=0;i<1800;i++){c.fillStyle=i%3?'#5973450b':'#ffffff22';c.beginPath();c.ellipse(rand()*n,rand()*n,2+rand()*4,1+rand()*2,rand()*Math.PI,0,Math.PI*2);c.fill();}return;
      }
      c.fillStyle = autumn ? '#dedcc8' : '#949e82'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 9000; i++) { const v = (autumn ? 130 : 75) + rand() * (autumn ? 105 : 135) | 0; c.fillStyle = autumn ? `rgba(${v + 12},${v + 10},${v + 2},.5)` : `rgba(${v + 10},${v + 16},${v},.65)`; c.beginPath(); c.ellipse(rand() * n, rand() * n, 1 + rand() * 3.7, .7 + rand() * 1.5, rand() * Math.PI, 0, Math.PI * 2); c.fill(); }
    }, 512);
    const grass = map((c, n) => {
      if(illustrated){c.fillStyle='#f5f8df';c.fillRect(0,0,n,n);return;}
      c.fillStyle = '#a3ad8c'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 22000; i++) { c.strokeStyle = i % 2 ? '#e0d9aa30' : '#46583c33'; const x = rand() * n, y = rand() * n; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1, y - 2 - rand() * 4); c.stroke(); }
    });
    const twigs = map((c, n) => {
      c.clearRect(0, 0, n, n);
      for (let j = 0; j < 9; j++) {
        const a = j * 2.399, cx = n * (.5 + Math.cos(a) * .28), cy = n * (.5 + Math.sin(a) * .28);
        c.strokeStyle = '#6e7451'; c.lineWidth = 2; c.beginPath(); c.moveTo(n / 2, n / 2); c.lineTo(cx, cy); c.stroke();
        for (let i = 0; i < 32; i++) {
          const x = cx + (rand() - .5) * n * .27, y = cy + (rand() - .5) * n * .23;
          c.fillStyle = (autumn ? ['#cfccb4', '#e7dfc4', '#b2b098', '#ded9be'] : ['#98a976', '#b0bb88', '#778c5f', '#bac394'])[i % 4]; c.beginPath(); c.ellipse(x, y, 3 + rand() * 5, 2 + rand() * 3, rand() * Math.PI, 0, Math.PI * 2); c.fill();
        }
      }
    });
    const quayMap = map((c, n) => {
      if(illustrated){c.fillStyle='#e0e5dd';c.fillRect(0,0,n,n);c.fillStyle='#a3b9bc';for(let y=0;y<n;y+=64)c.fillRect(0,y,n,2);return;}
      c.fillStyle = '#b4b3a5'; c.fillRect(0, 0, n, n);
      for (let y = 0; y < n; y += 42) { c.fillStyle = '#555e504d'; c.fillRect(0, y, n, 2); }
      for (let i = 0; i < 120; i++) {
        const x = rand() * n, y = rand() * n, h = 15 + rand() * n * .7, g = c.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#36473700'); g.addColorStop(.6, '#36473740'); g.addColorStop(1, '#36473700'); c.fillStyle = g; c.fillRect(x, y, 1 + rand() * 6, h);
      }
    });
    const brushed = map((c, n) => {
      c.fillStyle = '#d6dbd9'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 1800; i++) { c.fillStyle = i % 2 ? '#f9fff71b' : '#57676212'; c.fillRect(rand() * n, rand() * n, 8 + rand() * 40, .5); }
    });
    // Prefilter the same sky and sun that illuminate the scene, retaining HDR
    // radiance for the steel tower, glass and water-facing metal surfaces.
    const skyMap = daylight.environmentTexture();
    const pmrem = new T.PMREMGenerator(renderer), environment = pmrem.fromEquirectangular(skyMap); pmrem.dispose(); skyMap.dispose();
    const standard = (color, opts = {}) => new T.MeshStandardMaterial({ color, roughness: .88, ...opts });
    const materials = {
      stone: standard(illustrated || autumn ? '#e3e4e2' : '#ece6d8', { map: stoneMap, bumpMap: stoneMap, bumpScale: .045 }),
      trim: standard(illustrated || autumn ? '#d9ddde' : '#d9cfba', { map: grain }), darkStone: standard(illustrated || autumn ? '#858b8d' : '#8d8574', { map: stoneMap, bumpMap: stoneMap, bumpScale: .035 }),
      copper: standard('#d4e1d3', { map: copperMap, bumpMap: copperMap, bumpScale: .035, metalness: .18, roughness: .78 }),
      copperDark: standard('#597467', { map: copperMap, roughness: .88 }),
      concrete: standard(illustrated || autumn ? '#bfc3c5' : '#c4c4b8', { map: grain, bumpMap: grain, bumpScale: .028, roughness: .94 }),
      steel: standard('#cbd1cf', { map: brushed, metalness: .91, roughness: .32, envMap: environment.texture, envMapIntensity: .85 }),
      frame: standard('#7c8885', { metalness: .65, roughness: .48, envMap: environment.texture, envMapIntensity: .45 }),
      glass: standard(illustrated || autumn ? '#8eaeb9' : '#635c4a', { metalness: .35, roughness: .2, envMap: environment.texture, envMapIntensity: .75 }),
      dark: standard('#303c3b'), brass: standard('#b8a05b', { metalness: .7, roughness: .48, envMap: environment.texture, envMapIntensity: .4 }),
      red: standard('#9c5147'), ivory: standard(illustrated || autumn ? '#e5e6e4' : '#d8d8c9'), lawn: standard(illustrated ? '#91bc51' : autumn ? '#8fa34e' : '#87966c', { map: grass, roughness: 1 }),
      trunk: standard('#a39c85', { map: bark, bumpMap: bark, bumpScale: .045, roughness: 1 }),
      leaves: (illustrated ? (autumn ? ['#82b742','#b8ce4a','#55954d','#e9bd43','#6ead55','#d58b40'] : ['#77b84b','#a4c851','#4d9859','#9cc75a','#65ab57','#438b62']) : autumn ? ['#efc22d', '#e39a21', '#72933b', '#d77e27', '#b7bd43', '#cda33a'] : ['#7d905c', '#8c9a69', '#6d8756']).map(color => standard(color, { map: foliage, bumpMap: foliage, bumpScale: illustrated ? .025 : .06, vertexColors: illustrated, roughness: autumn ? .95 : 1 }))
    };
    materials.quay = standard('#a6a795', { map: quayMap, bumpMap: quayMap, bumpScale: .035, roughness: .98 }); materials.quay.userData.worldUV = true;
    const twigVariants = (autumn ? materials.leaves.map(m => m.color) : ['#a4b584']).map(color => standard(color, { map: twigs, alphaTest: .45, alphaToCoverage: true, side: T.DoubleSide, roughness: 1 }));
    materials.twigs = twigVariants[0];
    const contactMap = map((c, n) => {
      const g = c.createRadialGradient(n / 2, n / 2, n * .04, n / 2, n / 2, n * .5);
      g.addColorStop(0, '#18231bc0'); g.addColorStop(.35, '#18231b6b'); g.addColorStop(.7, '#18231b25'); g.addColorStop(1, '#18231b00'); c.fillStyle = g; c.fillRect(0, 0, n, n);
    }, 128);
    materials.contact = new T.MeshBasicMaterial({ map: contactMap, transparent: true, depthWrite: false, opacity: .55, toneMapped: false });
    const wind = { value: 0 };
    const sway = shader => {
      shader.uniforms.foliageTime = wind;
      shader.vertexShader = 'uniform float foliageTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float phase=0.;
        #ifdef USE_INSTANCING
         phase=${illustrated ? 'instanceMatrix[3].x*.17+instanceMatrix[3].z*.11' : '0.'};
        #endif
        float bend=sin(foliageTime*.85+phase+position.x*.73+position.z*.41)*${illustrated ? '.04' : '.025'}+sin(foliageTime*1.7+phase+position.y*1.9)*${illustrated ? '.018' : '.012'};
        transformed.x+=bend;transformed.z+=bend*.45;`);
    };
    for (const m of [...materials.leaves, ...twigVariants]) { m.onBeforeCompile = sway; m.customProgramCacheKey = () => 'berlin-leaf-wind-v1'; }
    const leafDepth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: twigs, alphaTest: .45, side: T.DoubleSide });
    leafDepth.onBeforeCompile = sway; leafDepth.customProgramCacheKey = () => 'berlin-leaf-depth-v1';
    for (const m of twigVariants) m.userData.depth = leafDepth;
    if (autumn) {
      const litter = map((c, n) => {
        c.clearRect(0, 0, n, n);
        for (let i = 0; i < 180; i++) {
          const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * n * .45;
          c.globalAlpha = .3 + rand() * .55; c.fillStyle = ['#b68a37', '#9b6435', '#ccad55', '#796440'][i % 4];
          c.beginPath(); c.ellipse(n / 2 + Math.cos(a) * r, n / 2 + Math.sin(a) * r, 2 + rand() * 4, 1 + rand() * 2, a, 0, Math.PI * 2); c.fill();
        }
      });
      materials.litter = standard('#ffffff', { map: litter, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
    }
    materials.stone.userData.worldUV = materials.darkStone.userData.worldUV = true;
    const crownSet = detail => Array.from({ length: 3 }, (_, variant) => {
      const g = new T.IcosahedronGeometry(1, detail), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = 1 + .11 * Math.sin(x * 13 + y * 7 + z * 17 + variant) + .06 * Math.sin(x * 29 - z * 19); p.setXYZ(i, x * r, y * r, z * r); }
      // Preserve a rounded lighting normal while making the outline irregular.
      // Non-indexed vertex-normal recomputation would turn every leaf mass faceted.
      const normal = g.attributes.normal, v = new T.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); normal.setXYZ(i, v.x, v.y, v.z); }
      if(illustrated){const colors=[];for(let i=0;i<p.count;i++){const y=p.getY(i),shade=.81+.19*T.MathUtils.clamp((y+1)*.5,0,1);colors.push(shade,shade,shade);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}
      return g;
    });
    const crowns = crownSet(1), compactCrowns = illustrated || autumn ? crownSet(0) : crowns;
    const trunkGeometry = new T.CylinderGeometry(.63, 1, 1, 7), branchGeometry = new T.CylinderGeometry(.4, 1, 1, 6), leafCard = new T.PlaneGeometry(1, 1);
    function tree(x, z, h, variant, place, detailed = false, compact = false) {
      const variation = Math.sin(x * 21.1 + z * 9.7), species = variant % 4, slender = species === 1;
      // Nearby trees tend to share a colour family, with individual variation.
      // Each crown keeps one family so a single tree does not become a rainbow.
      const patch = Math.sin(Math.floor(x / 38) * 12.9898 + Math.floor(z / 38) * 78.233) * 43758.5453;
      const family = Math.floor(((patch - Math.floor(patch)) * .7 + (variation + 1) * .15) * materials.leaves.length) % materials.leaves.length;
      h *= .88 + .2 * Math.abs(Math.sin(x * 3.7 + z * 5.1));
      const radius = h * (compact ? illustrated ? (slender ? .23 : species === 3 ? .38 : .31) : .34 : slender ? .2 : species === 3 ? .36 : .29), limbs = compact ? (illustrated && species===3 ? 4 : 3) : species === 3 ? 4 : 3;
      place(leafCard, materials.contact, [x, detailed ? .45 : .19, z], [radius * 2.8, radius * 2.8, 1], [-Math.PI / 2, 0, 0]);
      if (autumn && (detailed || !compact && variant % 3 === 0)) place(leafCard, materials.litter, [x, detailed ? .62 : .08, z], [detailed ? 1.9 : radius * 2.5, detailed ? 1.9 : radius * 2.5, 1], [-Math.PI / 2, variation, 0]);
      place(trunkGeometry, materials.trunk, [x, h * .31, z], [h * .023, h * .62, h * .023], [0, variation, 0]);
      for (let i = 0; i < limbs; i++) {
        const a = i * 2.399 + variation, offset = radius * (illustrated ? (i===2 ? .18 : .5+.08*Math.sin(variation+i)) : (i === 2 ? .22 : .42)), xx = x + Math.cos(a) * offset, zz = z + Math.sin(a) * offset, y = h * (.64 + i * .07 + (illustrated ? Math.sin(variation+i*1.7)*.035 : 0));
        if (!compact) place(branchGeometry, materials.trunk, [x + Math.cos(a) * offset * .45, h * .51, z + Math.sin(a) * offset * .45], [h * .012, h * .33, h * .012], [Math.sin(a) * .45, 0, -Math.cos(a) * .45]);
        const leaf = materials.leaves[illustrated || autumn ? family : (variant + i) % 3];
        if (!detailed) place((compact ? compactCrowns : crowns)[(variant + i) % 3], leaf, [xx, y, zz], [radius * (.84 + i * .04), h * (slender ? .29 : .21), radius * (.8 + i * .05)], [0, a, 0]);
        if(detailed)place(crowns[(variant+i)%3],leaf,[xx,y,zz],[radius*.58,h*(slender?.19:.13),radius*.55],[0,a,0]);
        if(detailed)for (let j = 0; j < 42; j++) {
          // Opaque leaf cutouts leave real gaps through the crown. A Fibonacci
          // distribution avoids a spherical shell or a visible stack of planes.
          const theta = j * 2.399 + a, yy = 1 - 2 * (j + .5) / 42, rr = Math.sqrt(1 - yy * yy), shell = j % 3 === 0 ? .45 : .88;
          const size = h * (.22 + (j % 4) * .025);
          place(leafCard, twigVariants[autumn ? family : 0], [xx + Math.cos(theta) * rr * radius * shell, y + yy * h * (slender ? .25 : .19) * shell, zz + Math.sin(theta) * rr * radius * shell], [size, size, size], [Math.sin(theta) * 1.1, theta, Math.cos(theta * 2) * .8]);
        }
      }
    }
    function normals() {
      const n = 256, data = new Uint8Array(n * n * 4);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const a = x / n * Math.PI * 2, b = y / n * Math.PI * 2, i = (y * n + x) * 4;
        const dx = .07 * Math.sin(a * 11 + b * 3) + .035 * Math.sin(a * 23 - b * 7) + .018 * Math.cos(a * 47 + b * 13);
        const dz = .055 * Math.cos(a * 7 - b * 17) + .025 * Math.sin(a * 19 + b * 29);
        const v = new T.Vector3(dx, dz, 1).normalize(); data[i] = (v.x * .5 + .5) * 255; data[i + 1] = (v.y * .5 + .5) * 255; data[i + 2] = (v.z * .5 + .5) * 255; data[i + 3] = 255;
      }
      const tex = new T.DataTexture(data, n, n); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true; return tex;
    }
    function waterMaterial(water) {
      // Keep the existing planar reflection and its projective camera. Replace only
      // its optical response: river-scale waves, restrained glints, and water Fresnel.
      let shader = water.material.fragmentShader;
      shader = shader.replace(/vec4 getNoise\( vec2 uv \) \{[\s\S]*?\n\s*void sunLight/, `vec4 getNoise(vec2 uv){
        vec2 flow=vec2(time*.012,time*-.006);
        vec2 bend=vec2(sin(uv.y*.018),cos(uv.x*.013))*.025;
        vec4 a=texture2D(normalSampler,uv*.011+flow+bend);
        vec4 b=texture2D(normalSampler,mat2(.8,.6,-.6,.8)*uv*.019-flow*.7);
        vec4 c=texture2D(normalSampler,uv*.003+flow*.23);
        return (a*.48+b*.32+c*.2)*2.-1.;
      }
      void sunLight`);
      shader = shader.replace('float rf0 = 0.075;', 'float rf0 = 0.025;');
      shader = shader.replace('100.0, 2.0, 0.5', autumn ? '110.0, 1.25, 0.35' : '140.0, 1.0, 0.35');
      shader = shader.replace('vec3( 1.5, 1.0, 1.5 )', 'vec3( 1.4, 1.0, 1.4 )');
      shader = shader.replace('vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );', `vec2 reflectUV=mirrorCoord.xy/mirrorCoord.w+distortion;
        vec3 reflectionSample=texture2D(mirrorSampler,reflectUV).rgb*.4;
        reflectionSample+=texture2D(mirrorSampler,reflectUV+vec2(.0018,.0008)).rgb*.2;
        reflectionSample+=texture2D(mirrorSampler,reflectUV-vec2(.0018,.0008)).rgb*.2;
        reflectionSample+=texture2D(mirrorSampler,reflectUV+vec2(-.0009,.0014)).rgb*.2;`);
      if (illustrated || autumn) {
        water.material.uniforms.cityWaterShallows = { value: new T.Color(illustrated ? '#43d4ca' : '#48b7af') };
        shader = 'uniform vec3 cityWaterShallows;\n' + shader;
      }
      shader = shader.replace('vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;', `float drift=sin(worldPosition.x*.037+sin(worldPosition.z*.023)*2.${illustrated || autumn ? '+time*.09' : ''})*cos(worldPosition.z*.041${illustrated || autumn ? '-time*.06' : ''});
        vec3 riverColour=${illustrated || autumn ? 'mix(waterColor,cityWaterShallows,.28+drift*.18)' : 'waterColor*(.93+drift*.07)'};
        vec3 scatter=max(0.,dot(surfaceNormal,eyeDirection))*riverColour;`);
      shader = shader.replace('vec3 outgoingLight = mix(albedo, waterColor * 0.65, 0.2) + specularLight * 0.15;', illustrated || autumn ? 'vec3 outgoingLight = mix(albedo, riverColour * 0.8, 0.18) + specularLight * 0.12;' : 'vec3 outgoingLight = mix(albedo, waterColor * 0.65, 0.08) + specularLight * 0.09;');
      if(illustrated){
        // Keep the approved cyan/teal colour response on the original smooth
        // wave normals and planar reflection; no triangular surface shading.
        shader=shader.replace('vec3 outgoingLight = mix(albedo, riverColour * 0.8, 0.18) + specularLight * 0.12;', `
        vec3 painted=mix(waterColor,cityWaterShallows,.18+.2*sin(worldPosition.x*.024+worldPosition.z*.04))*.945;
        float reflected=.12+.28*pow(1.-theta,3.);
        vec3 outgoingLight=mix(painted*(.72+.28*getShadowMask()),reflectionSample,reflected)+specularLight*.42;`);
      }
      water.material.fragmentShader = shader;
      water.material.uniforms.size.value = 8;
    }
    function sky() { return daylight.skyMaterial(); }
    const surfaces=new Map();
    function surface(color,opts={}){
      if(color?.isMaterial)return color;
      const key=color+JSON.stringify(opts);if(surfaces.has(key))return surfaces.get(key);
      const c=new T.Color(color),hsl={};c.getHSL(hsl);
      const glass=['#83bcc8','#b8dedd','#83b5c4'].includes(color);
      const patina=['#548f7d','#67998a','#679583','#90b4a0'].includes(color);
      const metal=(opts.metalness||0)>.45||color==='#d7ae42';
      const m=standard(color,{map:patina?copperMap:glass?brushed:grain,roughness:glass?.22:metal?.43:.9,metalness:glass?.48:metal?.7:patina?.16:0,...opts,envMap:environment.texture,envMapIntensity:glass?.8:metal?.6:.25});
      surfaces.set(key,m);return m;
    }
    return { cityId:style.id, aesthetic:style.aesthetic, daylight, materials, grain, surface, tree, normals, waterMaterial, environment, sky, update: time => { wind.value = time; }, wind };
  }
};
