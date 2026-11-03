/* Roofscape and facade variation for viewing the mapped city from flight height. */
window.CityBuildings = {
  create({ T, renderer, environment, style = {} }) {
    let seed = 81273;
    const rand = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
    const c = canvas.getContext('2d'), cell = 256, historic=style.historic, neutral=style.aesthetic==='illustrated'||style.id==='berlin', illustrated=style.aesthetic==='illustrated';
    const families = style.facades || ['#d5c8ad', '#c9c7bd', '#b19d8b', '#a17962', '#bdc7c4', '#d1c6ad', '#d0c4b7', '#b1b8b5'];
    // Two variants of eight families share one atlas and one draw material.
    for (let style = 0; style < 16; style++) {
      c.save(); c.translate(style % 4 * cell, Math.floor(style / 4) * cell);
      c.fillStyle = families[style % 8]; c.fillRect(0, 0, cell, cell);
      const modern = !historic && (style % 8 === 4 || style % 8 === 7), brick = style % 8 === 3;
      if (brick && !illustrated) for (let y = 0; y < cell; y += 8) for (let x = -12; x < cell; x += 24) {
        c.fillStyle = `rgba(60,43,31,${.08 + rand() * .13})`; c.fillRect(x + y % 16, y, 23, 7);
      }
      for (let floor = 0; floor < 4; floor++) {
        const y = floor * 64;
        c.fillStyle = modern ? '#d7ded66b' : neutral ? '#f4f7f977' : '#fff3d577'; c.fillRect(0, y, cell, modern ? 2 : 4);
        c.fillStyle = '#2c302938'; c.fillRect(0, y + 4, cell, 4);
        for (let bay = 0; bay < 4; bay++) {
          const x = bay * 64 + (modern ? 5 : 17), w = modern ? 54 : 29, h = modern ? 48 : 39;
          c.fillStyle = '#3d403b'; c.fillRect(x - 3, y + 10, w + 7, h + 7);
          c.fillStyle = modern ? '#869490' : neutral ? '#e1e5e6' : '#e1d7be'; c.fillRect(x - 2, y + 10, w + 4, h + 4);
          const glass = c.createLinearGradient(0, y + 13, 0, y + 13 + h);
          glass.addColorStop(0, illustrated ? '#28627f' : '#263d47'); glass.addColorStop(.55, ['#586d70', '#728084', '#40575e', (neutral?'#8a9ca5':'#a19479')][(floor + bay + style) % 4]); glass.addColorStop(1, illustrated ? '#6d9eae' : '#435458');
          c.fillStyle = glass; c.fillRect(x, y + 12, w, h);
          c.fillStyle = '#172b386b'; c.fillRect(x, y + 12, w, 5); c.fillRect(x, y + 12, 3, h);
          c.fillStyle = modern ? '#aab6af' : neutral ? '#cbd1d3' : '#c9c5b4'; c.fillRect(x + w * .49, y + 12, 2, h);
          if (!modern) { c.fillRect(x, y + 27, w, 2); c.fillStyle = neutral ? '#eef1f2' : '#eee6ce'; c.fillRect(x - 4, y + 53, w + 8, 3); }
          if (style % 8 === 2 && floor % 2) { c.fillStyle = '#343d3c'; c.fillRect(x - 6, y + 50, w + 12, 7); for (let k = 0; k < 5; k++) c.fillRect(x - 5 + k * 9, y + 42, 1, 9); }
          if (style % 8 === 5) { c.fillStyle = '#a5967f'; c.fillRect(bay * 64, y, 4, 64); }
        }
      }
      for (let i = 0; i < (illustrated ? 0 : 4000); i++) { c.fillStyle = i % 2 ? (neutral ? '#ffffff0c' : '#fff9df0c') : '#363b320c'; c.fillRect(rand() * cell, rand() * cell, 1, 2); }
      c.restore();
    }
    const atlas = new T.CanvasTexture(canvas); atlas.colorSpace = T.SRGBColorSpace;
    atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const walls = new T.MeshStandardMaterial({ map: atlas, vertexColors: true, roughness: .92, envMap: environment.environment.texture, envMapIntensity: .45, side: T.DoubleSide });
    walls.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float facadeStyle; attribute float elevation; varying float vFacadeStyle; varying float vElevation;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFacadeStyle=facadeStyle;vElevation=elevation;');
      shader.fragmentShader = 'varying float vFacadeStyle; varying float vElevation;\n' + shader.fragmentShader;
      if(!historic)shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nfloat facadeFamily=mod(floor(vFacadeStyle+.5),8.);if(facadeFamily==4.||facadeFamily==7.)roughnessFactor=.45;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        float family=floor(vFacadeStyle+.5);
        vec2 cell=vec2(mod(family,4.),3.-floor(family/4.));
        vec2 atlasUV=(cell+(fract(vMapUv)*.98+.01))/4.;
        diffuseColor*=texture2D(map,atlasUV);
        float contact=mix(.84,1.,smoothstep(0.,.14,vElevation));
        contact*=mix(.9,1.,smoothstep(0.,.055,1.-vElevation));
        diffuseColor.rgb*=contact;`);
    };
    walls.customProgramCacheKey = () => 'city-facade-daylight-v2';
    const roofs = new T.MeshStandardMaterial({ map: environment.grain, vertexColors: true, roughness: .95, side: T.DoubleSide });
    roofs.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec2 tile=fract(vMapUv*vec2(32.,56.));
        float seam=1.-smoothstep(.025,.09,min(tile.x,tile.y));
        float visibility=1.-smoothstep(.06,.3,max(fwidth(vMapUv.x*32.),fwidth(vMapUv.y*56.)));
        diffuseColor.rgb*=1.-seam*.1*visibility;`);
    };
    roofs.customProgramCacheKey = () => 'berlin-roof-seams-v1';
    const palette = (style.roofs || ['#8e9089', '#928174', '#7c878c', '#a87f66', '#7d8e70', '#7d9890']).map(x => new T.Color(x));
    const stats = { roofs: 0, styles: Array(6).fill(0), roofTriangles: 0, fixtures: 0 };
    function distance(x, z, rings, gradient) {
      let d = Infinity;
      for (const ring of rings) for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1];
        if(dx*dx+dz*dz<1e-10)continue;
        const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
        const vx=x-a[0]-dx*u,vz=z-a[1]-dz*u,next=Math.hypot(vx,vz);
        if(next<d){d=next;if(gradient){gradient.gx=next>.0001?vx/next:dz/Math.hypot(dx,dz);gradient.gz=next>.0001?vz/next:-dx/Math.hypot(dx,dz);}}
      }
      return d;
    }
    const styleFor = f => f.roofStyle ?? (style.flatRoofs ? (f.c%2?0:4) : style.historic ? (f.c%2?1:3) : f.h>28 ? 0 : (Math.abs(Math.floor(f.x * 17 + f.z * 31)) % 6));
    const lift = (style, d) => style === 0 || style === 4 ? 0 : style === 2 ? Math.min(1.55, d * 1.35) : Math.min(style === 5 ? .8 : 1.45, d * .65);
    const height = (f, x, z) => f.h + .08 + lift(styleFor(f), distance(x, z, [f.p, ...(f.holes || [])]));
    function roof(f, batch, vertex, box, inside) {
      if (f.h < 3) return false;
      const hash = Math.abs(Math.floor(f.x * 17 + f.z * 31)), style = styleFor(f), rings = [f.p, ...(f.holes || [])];
      const all = rings.flat(), tris = T.ShapeUtils.triangulateShape(f.p.map(p => new T.Vector2(...p)), rings.slice(1).map(r => r.map(p => new T.Vector2(...p))));
      const color = palette[style], shade = new T.Color();
      const showcase = f.detailedRoof || (environment.cityId==='berlin' && f.x>-220 && f.x<850 && f.z>-260 && f.z<360);
      function emit(a, b, c, depth = 0) {
        const p = [a, b, c], lengths = p.map((v, i) => Math.hypot(v[0] - p[(i + 1) % 3][0], v[1] - p[(i + 1) % 3][1])), longest = Math.max(...lengths), edge = lengths.indexOf(longest);
        if (style!==0 && style!==4 && longest > (f.detailedRoof ? 1.25 : historic && all.length>24 ? 2.5 : 5) && depth < (f.detailedRoof ? 11 : showcase || historic && all.length>24 ? 8 : historic ? 4 : 2)) { const u = p[edge], v = p[(edge + 1) % 3], w = p[(edge + 2) % 3], m = [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2]; emit(u, m, w, depth + 1); emit(m, v, w, depth + 1); return; }
        const mx=(a[0]+b[0]+c[0])/3,mz=(a[1]+b[1]+c[1])/3;
        const samples=[a,b,c].map(([x,z])=>{const p={x,z,gx:0,gz:0};p.d=distance(x,z,rings,p);if(p.d<.0001)distance(x+(mx-x)*.001,z+(mz-z)*.001,rings,p);return p;});
        const slope=style===0||style===4?0:style===2?1.35:.65,cap=style===2?1.55:style===5?.8:1.45,cut=cap/(slope||1);
        // Split at the eave/flat-top contour. Clamping only the vertices creates
        // a jagged ridge and inconsistent triangular facets along long courtyards.
        function clipped(low){const out=[];for(let i=0;i<3;i++){
          const a=samples[i],b=samples[(i+1)%3],aIn=low?a.d<=cut:a.d>=cut,bIn=low?b.d<=cut:b.d>=cut;
          if(aIn)out.push(a);if(aIn!==bIn){const t=(cut-a.d)/(b.d-a.d);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,d:cut,gx:a.gx+(b.gx-a.gx)*t,gz:a.gz+(b.gz-a.gz)*t});}
        }return out;}
        function surface(points,gradient){for(let i=1;i<points.length-1;i++){
          for(const p of [points[0],points[i+1],points[i]]){
            const {x,z,d}=p,ao=.9+.1*Math.min(1,d/.6),patch=.96+.04*Math.sin(x*.37+z*.19);
            shade.copy(color).multiplyScalar(ao*patch);vertex(batch,x,f.h+.08+lift(style,d),z,x/8,z/8,shade);
            const nx=-p.gx*gradient,nz=-p.gz*gradient,len=Math.hypot(nx,1,nz),n=batch.n;n[n.length-3]=nx/len;n[n.length-2]=1/len;n[n.length-1]=nz/len;
          }stats.roofTriangles++;
        }}
        if(!slope)surface(samples,0);else{surface(clipped(true),slope);surface(clipped(false),0);}
      }
      for (const tri of tris) emit(...tri.map(i => all[i]));
      // Fixtures are retained inside both the footprint and courtyard boundaries.
      let count = 0;
      for (let x = f.x - f.w + 2.5; x < f.x + f.w && count < (showcase ? 5 : 1) && !f.detailedRoof && (showcase || hash%5===0); x += 7.7) for (let z = f.z - f.d + 2.5; z < f.z + f.d && count < (showcase ? 5 : 1); z += 9.1) {
        if (!inside([x, z], f.p) || rings.slice(1).some(r => inside([x, z], r)) || distance(x, z, rings) < 1.8 || (Math.floor(x * 3 + z * 5) + hash) % 3) continue;
        const y = f.h + lift(style, distance(x, z, rings));
        if (style % 2) { box(x, y + .58, z, .7, 1.16, .8, environment.materials.darkStone); box(x, y + 1.22, z, .95, .16, 1.05, environment.materials.trim); }
        else { box(x, y + .2, z, 1.7, .3, 2.4, environment.materials.dark); box(x, y + .38, z, 1.45, .08, 2.15, environment.materials.glass); }
        count++; stats.fixtures++;
      }
      stats.roofs++; stats.styles[style]++; return true;
    }
    return { walls, roofs, roof, height, stats };
  }
};
