/* Mapped urban quays, natural banks, and structural road bridges. */
window.CityWaterfront={build({T,scene,environment,features,obstacles,waterLevel,exclusions=[]}){
    const {M,cache,roots,stats,kit}=CityGeometry.create({T,scene,environment});
    const waters = features.filter(f => f.k === 'water');
    const inside = (x, z, p) => { let yes = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes; } return yes; };
    const central = waters, cells = new Map(), urban = new Map();
    function index(map,item,minx,minz,maxx,maxz){for(let x=Math.floor(minx/80);x<=Math.floor(maxx/80);x++)for(let z=Math.floor(minz/80);z<=Math.floor(maxz/80);z++){const key=x+':'+z;if(!map.has(key))map.set(key,[]);map.get(key).push(item);}}
    for(const f of central){const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]);index(cells,f,Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));}
    for(const f of features)if(f.k==='building') {const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]),b={x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2,w:(Math.max(...xs)-Math.min(...xs))/2,d:(Math.max(...zs)-Math.min(...zs))/2};index(urban,b,b.x-b.w-12,b.z-b.d-12,b.x+b.w+12,b.z+b.d+12);}
    const urbanEdge=(x,z)=>(urban.get(Math.floor(x/80)+':'+Math.floor(z/80))||[]).some(b=>Math.abs(x-b.x)<b.w+12&&Math.abs(z-b.z)<b.d+12);
    const excluded=(x,z)=>exclusions.some(b=>Math.abs(x-b.x)<b.wx+5&&Math.abs(z-b.z)<b.dz+5);
    const wet = (x, z) => (cells.get(Math.floor(x/80)+':'+Math.floor(z/80))||[]).some(f => inside(x, z, f.p) && !(f.holes || []).some(h => inside(x, z, h)));
    const banks = new Map();
    for (const f of central) for (const points of [f.p, ...(f.holes || [])]) for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length < .6 || length > 240 || excluded(x,z)) continue;
      let nx = dz / length, nz = -dx / length;
      const left = wet(x + nx * .4, z + nz * .4), right = wet(x - nx * .4, z - nz * .4);
      if (left === right) continue; if (left) { nx *= -1; nz *= -1; }
      const key = Math.floor(x / 150) + ':' + Math.floor(z / 150);
      if (!banks.has(key)) banks.set(key, kit('Mapped bank ' + key, 0, 0));
      const k = banks.get(key), angle = -Math.atan2(dz, dx), top = .22;
      if(!urbanEdge(x,z)) {
        // A sloping earth edge follows lakes and wooded rivers; it leaves urban
        // canals to the masonry path below. Both outer rings and islands count.
        const q=[a[0]+nx*1.2,.02,a[1]+nz*1.2],r=[b[0]+nx*1.2,.02,b[1]+nz*1.2],u=[a[0]-nx*.25,waterLevel-.12,a[1]-nz*.25],v=[b[0]-nx*.25,waterLevel-.12,b[1]-nz*.25];
        k.tri([q,u,r],M.darkStone);k.tri([u,v,r],M.darkStone);stats.naturalBanks++;continue;
      }
      k.box(x + nx * .1, (top + waterLevel - .3) / 2, z + nz * .1, length + .1, top - waterLevel + .3, .45, M.quay, angle);
      k.box(x + nx * .12, .27, z + nz * .12, length + .12, .15, .65, M.trim, angle);
      k.box(x + nx * 1.05, -.08, z + nz * 1.05, length, .5, 1.5, M.concrete, angle);
      // A damp masonry course marks the changing waterline, rather than white surf.
      k.box(x - nx * .135, waterLevel + .18, z - nz * .135, length, .38, .035, M.copperDark, angle);
      if(length>2.5) {
        const landX=x+nx*.55,landZ=z+nz*.55;
        k.box(landX,.9,landZ,length,.055,.055,M.dark,angle);
        k.box(landX,.64,landZ,length,.035,.04,M.dark,angle);
        const posts=Math.ceil(length/3.6);
        for(let j=0;j<=posts;j++) k.box(a[0]+dx*j/posts+nx*.55,.6,a[1]+dz*j/posts+nz*.55,.065,.63,.065,M.dark,angle);
      }
      stats.banks++;
    }
    for (const k of banks.values()) k.finish();
    // Merge parallel mapped carriageways into a single structural bridge. The
    // existing road surface remains at y=2.3; arches and parapets meet that level.
    const bridges = [];
    for (const f of features) if (f.k === 'road' && f.bridge && f.w >= 2) for (let i = 1; i < f.p.length; i++) {
      const a = f.p[i - 1], b = f.p[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz), x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
      if (length < 4 || excluded(x,z) || !wet(x, z)) continue;
      const ux = dx / length, uz = dz / length;
      const found = bridges.find(p => Math.abs(p.ux * ux + p.uz * uz) > .96 && Math.hypot(x - p.x, z - p.z) < Math.max(f.w, p.width) * 1.25 && Math.abs(p.length - length) < 10);
      if (found) {
        const offset = (x - found.x) * found.uz - (z - found.z) * found.ux;
        found.min = Math.min(found.min, offset - f.w / 2); found.max = Math.max(found.max, offset + f.w / 2); found.width = found.max - found.min;
      } else bridges.push({ x, z, ux, uz, length, width: f.w, min: -f.w / 2, max: f.w / 2 });
    }
    for (const p of bridges) {
      const k = kit('Mapped bridge', p.x, p.z, -Math.atan2(p.uz, p.ux)), half = p.length / 2;
      const middle = -(p.min + p.max) / 2, width = p.max - p.min, spans = Math.max(1, Math.round(p.length / 15)), span = p.length / spans;
      k.box(0, 2.02, middle, p.length, .45, width + .55, M.quay);
      for (const side of [-1, 1]) {
        const z = middle + side * (width / 2 + .35);
        k.box(0, 2.7, z, p.length + .3, .7, .45, M.stone);
        k.box(0, 3.1, z, p.length + .5, .16, .62, M.trim);
        for (let j = 0; j < spans; j++) {
          const shape = new T.Shape(), h = span / 2;
          shape.moveTo(-h, 2.05); shape.lineTo(h, 2.05);
          for (let t = 0; t <= 24; t++) { const x = h - span * t / 24, y = waterLevel - .35 + (1.6 - waterLevel + .35) * Math.sqrt(Math.max(0, 1 - x * x / (h * h))); shape.lineTo(x, y); }
          shape.closePath(); const g = new T.ExtrudeGeometry(shape, { depth: .65, bevelEnabled: false, curveSegments: 12 });
          k.stamp(g, M.quay, -half + span * (j + .5), 0, z - .325); g.dispose();
        }
      }
      for (let j = 0; j <= spans; j++) k.box(-half + span * j, .2, middle, j === 0 || j === spans ? 1.4 : .8, 3, width + .7, M.quay);
      k.finish(); obstacles.push({ x: p.x, z: p.z, w: Math.abs(p.ux) * half + Math.abs(p.uz) * (width / 2 + 1), d: Math.abs(p.uz) * half + Math.abs(p.ux) * (width / 2 + 1), h: 3.3 }); stats.bridges++;
    }
    for(const g of cache.values())g.dispose();return {roots,stats,update:(camera,radius)=>{for(const root of roots){const b=root.userData.sceneryBounds;root.visible=b.center.distanceTo(camera.position)<radius+b.radius;}}};
}};
