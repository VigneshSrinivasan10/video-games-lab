/* Pariser Platz architectural study. Original procedural artwork; mapped footprints
   remain © OpenStreetMap contributors. Distances use the game's 0.36 map scale. */
window.BerlinDistrict = (() => {
  'use strict';
  const bounds = { west: -69, east: 136, north: 102, south: 211 };
  const contains = f => f.x > bounds.west && f.x < bounds.east && f.z > bounds.north && f.z < bounds.south;
  const spawn = { x: -98, y: 25, z: 160, heading: 1.46 };
  const views = [
    { name: 'Pariser Platz', caption: 'Sandstone, copper roofs, and the Brandenburg Gate.', eye: [55, 32, 101], target: [-29, 3, 147] },
    { name: 'The grand boulevard', caption: 'Along Unter den Linden, toward the gate.', eye: [104, 29, 149], target: [-39, 6, 149] },
    { name: 'Above the rooftops', caption: 'Courtyards, dormers, and the Hotel Adlon.', eye: [43, 43, 218], target: [-20, 5, 151] },
    { name: 'At the gate', caption: 'Doric columns beneath the copper Quadriga.', eye: [-15, 8, 153], target: [-56, 5.5, 149] },
    { name: 'Berlin Cathedral', caption: 'Weathered copper above the stone arches of the Berliner Dom.', eye: [468, 26, 73], target: [512, 17, 36] },
    { name: 'The television tower', caption: 'Concrete, stainless steel, and the observation decks above Alexanderplatz.', eye: [690, 85, 3], target: [718, 78, -32] },
    { name: 'Along the Spree', caption: 'Quiet reflections beneath the stone quays of Museum Island.', eye: [511, 7, -6], target: [539, 3, 52] },
    { name: 'Unter den Linden', caption: 'Golden leaves and green canopies beneath a clear blue sky.', eye: [16, 4, 143], target: [54, 3, 136] },
    { name: 'River and rooftops', caption: 'Museum Island, weathered copper, and the Spree from above.', eye: [575, 100, 170], target: [490, 6, 10] },
    { name: 'The Reichstag dome', caption: 'Glass, steel ribs, and the spiral paths around the mirrored cone.', eye: [-145, 48, 95], target: [-93, 20, 56] }
  ];

  function build({ T, scene, buildings, obstacles, renderer, environment, aerial }) {
    const illustrated=environment.aesthetic==='illustrated';
    const root = new T.Group(); root.name = 'Pariser Platz district'; scene.add(root);
    const bins = new Map(), details = [], dynamics = [];
    const transform = new T.Object3D(), normalMatrix = new T.Matrix3();
    const boxGeo = new T.BoxGeometry(1, 1, 1), cylinderGeo = new T.CylinderGeometry(1, 1, 1, 12);
    const sphereGeo = new T.SphereGeometry(1, 12, 8), canopyGeo = new T.IcosahedronGeometry(1, 2);
    let randomSeed = 1949;
    const random = () => ((randomSeed = Math.imul(1664525, randomSeed) + 1013904223 >>> 0) / 4294967296);
    const stats = { buildings: 0, windows: 0, roofDetails: 0, trees: 0, streetlights: 0, crossings: 0, parkedCars: 0, staticMeshes: 0, triangles: 0 };

    function texture(draw, size = 256, repeat = true) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      draw(canvas.getContext('2d'), size);
      const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
      map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (repeat) map.wrapS = map.wrapT = T.RepeatWrapping;
      return map;
    }
    const stoneMap = texture((c, n) => {
      if(illustrated){c.fillStyle='#f7f5ed';c.fillRect(0,0,n,n);c.fillStyle='#e6e7de';for(let y=0;y<n;y+=64)c.fillRect(0,y,n,1);return;}
      c.fillStyle = '#dedfdf'; c.fillRect(0, 0, n, n);
      for (let y = 0; y < n; y += 32) for (let x = -64; x < n; x += 64) {
        const xx = x + (y / 32 % 2) * 32, shade = 205 + Math.floor(random() * 28);
        c.fillStyle = `rgb(${shade + 4},${shade + 4},${shade + 4})`; c.fillRect(xx + 1, y + 1, 62, 30);
        c.fillStyle = '#ffffff55'; c.fillRect(xx + 1, y + 1, 62, 1);
      }
      for (let i = 0; i < 7000; i++) { c.fillStyle = random() > .5 ? '#50565b10' : '#ffffff18'; c.fillRect(random() * n, random() * n, 1, 1); }
    });
    const roofMap = texture((c, n) => {
      if(illustrated){c.fillStyle='#a4bec7';c.fillRect(0,0,n,n);c.fillStyle='#7d9eae';for(let x=0;x<n;x+=32)c.fillRect(x,0,2,n);return;}
      c.fillStyle = '#83918f'; c.fillRect(0, 0, n, n);
      for (let y = 0; y < n; y += 32) for (let x = 0; x < n; x += 16) {
        c.fillStyle = `rgba(32,49,47,${.08 + random() * .18})`; c.fillRect(x + (y / 32 % 2) * 8, y, 15, 30);
        c.fillStyle = '#e8e5d43b'; c.fillRect(x, y + 30, 16, 1);
      }
    });
    const pavementMap = texture((c, n) => {
      if(illustrated){c.fillStyle='#ebeee7';c.fillRect(0,0,n,n);return;}
      c.fillStyle = '#bfc2c2'; c.fillRect(0, 0, n, n);
      for (let y = 0; y < n; y += 32) for (let x = 0; x < n; x += 32) {
        const v = 169 + Math.floor(random() * 30); c.fillStyle = `rgb(${v + 8},${v + 8},${v + 8})`; c.fillRect(x + 1, y + 1, 30, 30);
      }
    });
    const glassMap = texture((c, n) => {
      const g = c.createLinearGradient(0, 0, n, n); g.addColorStop(0, '#304d5b'); g.addColorStop(.38, '#678a94'); g.addColorStop(.4, '#9db3b5'); g.addColorStop(.7, '#4c6468'); g.addColorStop(1, '#253e49');
      c.fillStyle = g; c.fillRect(0, 0, n, n); c.fillStyle = '#dbe6dd26'; c.fillRect(0, 0, n * .2, n);
      c.fillStyle = '#182c3430'; for (let i = 0; i < 8; i++) c.fillRect(i * 37, n * .57 + random() * 40, 21, n);
    }, 128, false);
    const material = (color, extras = {}) => new T.MeshStandardMaterial({ color, roughness: .84, vertexColors: true, ...extras });
    const M = {
      walls: ['#f2e5c8', '#f6f4e7', '#d8d5c6', '#e8c5a7', '#c7dce1'].map(color => material(color, { map: stoneMap })),
      trim: material('#e7e9e6'), darkTrim: material('#b5bab8'), base: material('#a6aaa7', { map: stoneMap }),
      roof: material('#abc0b5', { map: roofMap, metalness: .14, roughness: .64 }), slate: material('#9fa8ab', { map: roofMap }),
      glass: material('#d3e0da', { map: glassMap, roughness: .27, metalness: .18 }), dark: material('#344344'),
      brass: material('#b49a60', { metalness: .6, roughness: .38 }), copper: material('#507b69', { metalness: .27, roughness: .6 }),
      paving: material('#d7dadd', { map: pavementMap }), curb: material('#bec4c6'), asphalt: material('#777b78'),
      lawn: environment.materials.lawn, soil: material('#56513c', { map: environment.grain }), hedge: environment.materials.leaves[2],
      wood: material('#856e51'), iron: material('#3c4b49', { metalness: .25 }), ivory: material('#e9dfc8'),
      water: material('#75999b', { metalness: .35, roughness: .25 }), lamp: material('#f5e6bd', { emissive: '#c8ac73', emissiveIntensity: .18 }),
      awning: material('#354d45'), red: material('#75493d'), white: material('#e5e2d6')
    };
    M.contact = new T.MeshBasicMaterial({ transparent: true, depthWrite: false, map: texture((c, n) => {
      const g = c.createLinearGradient(0, 0, 0, n); g.addColorStop(0, '#29302a00'); g.addColorStop(1, '#29302a55'); c.fillStyle = g; c.fillRect(0, 0, n, n);
    }, 32, false) });
    function bin(mat, x, z, near) {
      const key = `${mat.uuid}:${Math.floor(x / 70)}:${Math.floor(z / 70)}:${near}`;
      if (!bins.has(key)) bins.set(key, { mat, near, p: [], n: [], uv: [], c: [] });
      return bins.get(key);
    }
    function stamp(geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, near = false, rx = 0, rz = 0) {
      const b = bin(mat, x, z, near), p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
      transform.position.set(x, y, z); transform.rotation.set(rx, ry, rz); transform.scale.set(sx, sy, sz); transform.updateMatrix();
      normalMatrix.getNormalMatrix(transform.matrix);
      const point = new T.Vector3(), normal = new T.Vector3(), count = geometry.index?.count || p.count;
      for (let j = 0; j < count; j++) {
        const i = geometry.index ? geometry.index.getX(j) : j;
        point.fromBufferAttribute(p, i).applyMatrix4(transform.matrix); normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
        b.p.push(point.x, point.y, point.z); b.n.push(normal.x, normal.y, normal.z); const ao = normal.y < -.2 ? .64 : normal.y < .2 ? .92 : 1; b.c.push(ao, ao, ao); b.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      }
    }
    const box = (x, y, z, w, h, d, mat, ry = 0, near = false) => stamp(boxGeo, mat, x, y, z, w, h, d, ry, near);
    const cyl = (x, y, z, r, h, mat, near = false) => stamp(cylinderGeo, mat, x, y, z, r, h, r, 0, near);
    function face(points, mat, uv, near = false, shade = [1,1,1,1]) {
      const b = bin(mat, points[0][0], points[0][2], near);
      const a = new T.Vector3(...points[0]), n = new T.Vector3(...points[1]).sub(a).cross(new T.Vector3(...points[2]).sub(a)).normalize();
      for (const i of (points.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2])) { b.p.push(...points[i]); b.n.push(n.x, n.y, n.z); b.c.push(shade[i], shade[i], shade[i]); b.uv.push(...(uv?.[i] || [points[i][0] / 4, points[i][2] / 4])); }
    }
    function polygon(ring, holes, y, mat) {
      const pts = [...ring, ...holes.flat()];
      const tris = T.ShapeUtils.triangulateShape(ring.map(p => new T.Vector2(...p)), holes.map(h => h.map(p => new T.Vector2(...p))));
      for (const tri of tris) {
        const points = tri.map(i => [pts[i][0], y, pts[i][1]]);
        if (new T.Vector3(...points[1]).sub(new T.Vector3(...points[0])).cross(new T.Vector3(...points[2]).sub(new T.Vector3(...points[0]))).y < 0) points.reverse();
        face(points, mat);
      }
    }
    const area = ring => ring.reduce((s, a, i) => { const b = ring[(i + 1) % ring.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
    const inside = (x, z, ring) => { let yes = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes; } return yes; };
    const selected = buildings.filter(contains);
    function surfaceAt(x, z) { return selected.some(f => inside(x, z, f.p) && !(f.holes || []).some(h => inside(x, z, h))); }
    function wallEdge(a, b, height, mat, hole = false, variant = 0, modern = false, roofStyle = 2) {
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz); if (length < .15) return;
      const nx = dz / length, nz = -dx / length, ry = -Math.atan2(dz, dx), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      const local = (u, y, out, w, h, d, m, near = false) => box(a[0] + dx * u / length + nx * out, y, a[1] + dz * u / length + nz * out, w, h, d, m, ry, near);
      const panel = (u, y, out, w, h, m) => {
        const points = [[-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2]].map(([xx, yy]) => [a[0] + dx * (u + xx) / length + nx * out, y + yy, a[1] + dz * (u + xx) / length + nz * out]);
        face(points, m, [[0, 0], [0, 1], [1, 1], [1, 0]]);
      };
      const levels = [.22, .95, height - .7, height], tones = [.62, 1, 1, .66];
      for (let i = 0; i < 3; i++) face([[a[0], levels[i], a[1]], [a[0], levels[i+1], a[1]], [b[0], levels[i+1], b[1]], [b[0], levels[i], b[1]]], mat, [[0,levels[i]/3],[0,levels[i+1]/3],[length/3,levels[i+1]/3],[length/3,levels[i]/3]], false, [tones[i],tones[i+1],tones[i+1],tones[i]]);
      local(length / 2, .75, .035, length, 1, .14, M.base);
      local(length / 2, height - .22, .12, length + .1, .26, .34, M.trim);
      local(length / 2, height + .02, .15, length + .25, .16, .45, M.trim);
      if (length < 2.1) return;
      const floors = Math.max(2, Math.round(height / 1.5)), floorH = (height - 1.8) / (floors - 1);
      const bays = Math.max(1, Math.floor(length / (modern ? 1.7 : 1.45))), bay = length / bays;
      // A neighbour on the other side of the wall means this is a party wall.
      const exterior = !surfaceAt(mx + nx * .55, mz + nz * .55);
      if (!exterior && !hole) return;
      face([[a[0], .34, a[1]], [b[0], .34, b[1]], [b[0] + nx * 1.2, .34, b[1] + nz * 1.2], [a[0] + nx * 1.2, .34, a[1] + nz * 1.2]], M.contact, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      local(length / 2, 1.9, .12, length, .18, .32, M.trim);
      for (let floor = 0; floor < floors; floor++) {
        const y = floor === 0 ? 1.03 : 2.45 + (floor - 1) * floorH, wh = floor === 0 ? 1.25 : Math.min(1.08, floorH * .7);
        if (y + wh * .5 > height - .4) continue;
        for (let j = 0; j < bays; j++) {
          const u = (j + .5) * bay, ww = Math.min(modern ? 1.45 : .78, bay * .66);
          panel(u, y, .083, ww + .17, wh + .16, M.dark);
          panel(u, y, .108, ww, wh, M.glass);
          const frame = modern ? M.iron : M.trim;
          for (const side of [-1, 1]) local(u + side * (ww / 2 + .045), y, .13, .09, wh + .17, .13, frame, true);
          local(u, y + wh / 2 + .06, .14, ww + .24, .1, .2, frame, true);
          local(u, y - wh / 2 - .06, .19, ww + .28, .1, .34, frame, true);
          local(u, y, .15, .045, wh, .06, frame, true);
          if (floor > 0) local(u, y + .15, .15, ww, .04, .06, frame, true);
          if (floor === 0 && j % 4 === 1 && !hole) {
            local(u, .83, .17, ww * .7, 1.45, .1, M.dark);
            local(u + .16, .83, .24, .025, .27, .025, M.brass, true);
          }
          if (variant === 3 && floor === 2 && j % 3 === 1 && !hole) {
            local(u, y - .6, .4, ww + .45, .09, .8, M.trim, true);
            local(u, y - .16, .77, ww + .42, .04, .04, M.iron, true);
            for (let k = -2; k <= 2; k++) local(u + k * .18, y - .35, .77, .025, .42, .025, M.iron, true);
          }
          stats.windows++;
        }
      }
      if (!hole && length > 4 && !modern && [1,2,3].includes(roofStyle)) {
        const r = variant % 2 ? M.slate : M.roof;
        for (let u = 1.5; u < length - 1; u += 3.4) {
          local(u, height + .66, -.54, .85, 1.05, .85, M.trim, true);
          local(u, height + .7, -.09, .57, .67, .04, M.glass, true);
          local(u, height + 1.24, -.52, 1.03, .13, 1.03, r, true); stats.roofDetails++;
        }
      }
    }
    for (const f of selected) {
      if (/Brandenburger Tor|Torhaus/.test(f.n || '') || (Math.abs(f.x + 56) < 4 && Math.abs(f.z - 149) < 11)) continue;
      const modern = /Akademie|Axica/.test(f.n || ''), adlon = /Adlon/.test(f.n || '');
      const height = Math.max(5.5, f.h, adlon ? 10.7 : 0), variant = adlon ? 3 : f.c % 5, wall = M.walls[variant];
      const roofStyle = modern ? (f.c % 2 ? 4 : 0) : adlon ? 2 : [1,2,3,5][f.c % 4], roofFeature = {...f,h:height,roofStyle,detailedRoof:true};
      const ring = area(f.p) > 0 ? f.p : [...f.p].reverse();
      const holes = (f.holes || []).map(h => area(h) < 0 ? h : [...h].reverse());
      for (const [i, r] of [ring, ...holes].entries()) for (let j = 0; j < r.length; j++) wallEdge(r[j], r[(j + 1) % r.length], height, wall, i > 0, variant, modern, roofStyle);
      const roofBin=bin(aerial.roofs,f.x,f.z,false);
      aerial.roof(roofFeature,roofBin,(b,x,y,z,u,v,c)=>{b.p.push(x,y,z);b.n.push(0,1,0);b.uv.push(u,v);b.c.push(c.r,c.g,c.b);},box,(p,r)=>inside(p[0],p[1],r));
      for (const h of holes) polygon(h, [], .24, M.paving);
      // Roof equipment is only placed inside the mapped footprint, never over courtyards.
      for (let x = f.x - f.w + 2; x < f.x + f.w; x += 6.3) for (let z = f.z - f.d + 2; z < f.z + f.d; z += 7.7) {
        if (!inside(x, z, ring) || holes.some(h => inside(x, z, h)) || ![[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]].every(([dx, dz]) => inside(x + dx, z + dz, ring) && !holes.some(h => inside(x + dx, z + dz, h)))) continue;
        const roofY = aerial.height(roofFeature, x, z);
        if (random() < .42) { box(x, roofY + .6, z, 1.4, .95, .85, M.base, 0, true); box(x, roofY + 1.12, z, 1.6, .13, 1.02, M.trim, 0, true); }
        else { box(x, roofY + .24, z, 1.8, .3, 2.7, M.dark, 0, true); box(x, roofY + .42, z, 1.6, .12, 2.5, M.glass, 0, true); }
        stats.roofDetails++;
      }
      obstacles.push({ x: f.x, z: f.z, w: f.w + .7, d: f.d + .7, h: height + 4.3 }); stats.buildings++;
    }

    // Street axis follows the surveyed east–west alignment, including the square.
    const angle = -.115, cs = Math.cos(angle), sn = Math.sin(angle);
    const plaza = (u, v) => ({ x: -32 + cs * u - sn * v, z: 146 + sn * u + cs * v });
    function pbox(u, y, v, w, h, d, mat, near = false) { const p = plaza(u, v); box(p.x, y, p.z, w, h, d, mat, -angle, near); }
    function slab(u, v, w, d, mat, y = .28) {
      const pts = [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2]].map(([x, z]) => { const p = plaza(u + x, v + z); return [p.x, y, p.z]; });
      face(pts, mat, [[0, 0], [0, d / 4], [w / 4, d / 4], [w / 4, 0]]);
    }
    slab(1, 0, 38, 34, M.paving, .31);
    for (const side of [-1, 1]) {
      pbox(1, .35, side * 16.6, 38, .12, .35, M.darkTrim);
      pbox(1, .42, side * 10.4, 25, .3, 7.6, M.curb);
      pbox(1, .59, side * 10.4, 24.4, .07, 7, M.lawn);
      for (const edge of [-1, 1]) {
        pbox(1, .65, side * 10.4 + edge * 3.05, 23, .08, .75, M.soil, true);
        for (let u = -10; u < 12.5; u += 1.25) {
          const p = plaza(u, side * 10.4 + edge * 3.05 + (random() - .5) * .12);
          stamp(canopyGeo, M.hedge, p.x, .83, p.z, .7, .26 + random() * .15, .43, random() * 3, true);
        }
      }
      const p = plaza(1, side * 10.4); cyl(p.x, .75, p.z, 2.1, .34, M.trim); cyl(p.x, .94, p.z, 1.8, .09, M.water); cyl(p.x, 1.25, p.z, .32, .6, M.trim); cyl(p.x, 1.58, p.z, .7, .1, M.water);
    }
    // Boulevard surface, curbs, central promenade, and dashed lane markings.
    slab(95, 0, 145, 14.2, M.asphalt, .29);
    slab(95, 0, 145, 4.2, M.paving, .37);
    for (const side of [-1, 1]) {
      slab(95, side * 8.8, 145, 3.4, M.paving, .32);
      pbox(95, .42, side * 7.14, 145, .3, .2, M.curb);
      pbox(95, .43, side * 2.15, 145, .32, .22, M.curb);
      for (let u = 30; u < 165; u += 5.4) pbox(u, .305, side * 4.6, 2.5, .025, .09, M.ivory, true);
    }
    // A few legible street details at flight height, with parking clear of crossings.
    for(const u of [43,126]) {
      for(const side of [-1,1])for(let v=2.65;v<7;v+=.62)pbox(u,.315,side*v,2.1,.025,.3,M.ivory);
      stats.crossings++;
    }
    for(const [i,u] of [70,108].entries())for(const side of [-1,1]) {
      const v=side*6.55,paint=i%2?M.red:M.ivory;
      pbox(u,.61,v,1.7,.45,.73,paint);pbox(u-.08,.94,v,.8,.32,.62,M.glass);
      for(const end of [-1,1])pbox(u+end*.56,.43,v,.27,.26,.79,M.dark);
      stats.parkedCars++;
    }
    function tree(x, z, h = 5) {
      if (surfaceAt(x, z)) return;
      cyl(x, .48, z, 1.15, .18, M.curb); cyl(x, .58, z, 1, .05, M.soil);
      environment.tree(x, z, h, stats.trees % 3, (g, m, p, s, r) => stamp(g, m, ...p, ...s, r[1], false, r[0], r[2]), true);
      stats.trees++;
    }
    function lamp(x, z) {
      cyl(x, .4, z, .25, .45, M.iron, true); cyl(x, 2.3, z, .065, 4, M.iron, true);
      box(x, 4.12, z, 1.7, .08, .09, M.iron, 0, true);
      for (const s of [-1, 1]) { box(x + s * .72, 4.05, z, .31, .46, .31, M.lamp, 0, true); box(x + s * .72, 4.32, z, .45, .1, .45, M.iron, 0, true); }
      stats.streetlights++;
    }
    function bench(u, v) {
      const p = plaza(u, v); for (const s of [-1, 1]) box(p.x + s * .65, .65, p.z, .11, .6, .55, M.iron, -angle, true);
      pbox(u, .9, v, 1.65, .12, .65, M.wood, true); pbox(u, 1.2, v + .28, 1.65, .55, .09, M.wood, true);
    }
    for (let u = 29; u < 165; u += 9) { const p = plaza(u, 0); tree(p.x, p.z, 4.6 + random()); for (const side of [-1, 1]) { const l = plaza(u, side * 8.2); lamp(l.x, l.z); } }
    // Extra pavement trees and low flower beds leave gaps for entrances and crossings.
    const clearPlanting=(u,v,w,d)=>[[-w,-d],[-w,d],[w,-d],[w,d],[0,0]].every(([du,dv])=>{const p=plaza(u+du,v+dv);return !surfaceAt(p.x,p.z);});
    for(const side of [-1,1]){
      for(let u=36;u<159;u+=18)if(Math.abs(u-43)>5&&Math.abs(u-126)>5&&clearPlanting(u,side*9.5,1.2,1.2)){
        const p=plaza(u,side*9.5);tree(p.x,p.z,4.3+(Math.sin(u)*.5+.5)*1.2);
      }
      for(const u of [53,89,143])if(clearPlanting(u,side*9.2,2,.8)){
        pbox(u,.48,side*9.2,3.6,.3,1.2,M.curb);pbox(u,.66,side*9.2,3.3,.08,.96,M.soil);
        for(const du of [-1,0,1]){
          const p=plaza(u+du,side*9.2);stamp(canopyGeo,M.hedge,p.x,.85,p.z,.66,.33,.44,0,true);
          for(const off of [-.22,.22]){const f=plaza(u+du+off,side*9.2);stamp(sphereGeo,du===0?M.ivory:environment.materials.leaves[3],f.x,1.14,f.z,.18,.13,.18,0,true);}
        }
      }
      for(const u of [62,98,152])if(clearPlanting(u,side*9.7,1,.6))bench(u,side*9.7);
    }
    for (const side of [-1, 1]) for (const u of [-12, 13]) { const p = plaza(u, side * 14.2); tree(p.x, p.z, 4.5); }
    for (const side of [-1, 1]) for (const u of [-10, -3, 6, 13]) bench(u, side * 6);
    for (const side of [-1, 1]) for (let u = -16; u < 22; u += 5) { const p = plaza(u, side * 17); cyl(p.x, .76, p.z, .09, .85, M.iron, true); }

    // Hotel entrance and cafe terrace: a few local details, not a generic city stamp.
    const adlon = selected.find(f => /Adlon/.test(f.n || ''));
    if (adlon) {
      box(5, 1.7, 155.8, 8, .23, 2.6, M.awning, .115);
      for (const x of [1.4, 8.6]) cyl(x, .9, 154.5, .055, 1.7, M.brass, true);
      for (let x = -.5; x < 13; x += 2.8) { cyl(x, .7, 153, .7, .07, M.ivory, true); cyl(x, .44, 153, .055, .5, M.iron, true); for (const s of [-1, 1]) box(x + s * .9, .57, 153, .45, .09, .45, M.wood, 0, true); }
      const signMap = texture((c, n) => { c.fillStyle = '#354d45'; c.fillRect(0, 0, n, n); c.fillStyle = '#e6cc8e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '22px Georgia'; c.fillText('HOTEL ADLON', n / 2, n / 2); }, 256, false);
      const signMat = material('#ffffff', { map: signMap });
      box(5, 2.35, 154.44, 6.5, .85, .04, signMat, .115, true);
    }

    // Brandenburg Gate. The six pairs of columns run north–south; passages face east.
    const gate = { x: -56, z: 149.3 }, sandstone = M.walls[0];
    function gbox(x, y, z, w, h, d, mat, near = false) { box(gate.x + x, y, gate.z + z, w, h, d, mat, 0, near); }
    for (const side of [-1, 1]) for (let j = 0; j < 6; j++) {
      const z = (j - 2.5) * 2.13, x = side * 1.8;
      gbox(x, .55, z, 1, .3, 1, M.trim); cyl(gate.x + x, 3.25, gate.z + z, .4, 5.1, sandstone);
      cyl(gate.x + x, 5.86, gate.z + z, .57, .22, M.trim); gbox(x, 6.08, z, 1.12, .23, 1.12, M.trim);
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; cyl(gate.x + x + Math.cos(a) * .39, 3.35, gate.z + z + Math.sin(a) * .39, .027, 4.65, M.darkTrim, true); }
    }
    gbox(0, 6.55, 0, 5.1, .8, 13.4, sandstone); gbox(0, 7.06, 0, 5.55, .24, 13.9, M.trim);
    gbox(0, 7.45, 0, 4.9, .65, 12.6, sandstone); gbox(0, 7.84, 0, 5.5, .2, 13.5, M.trim);
    gbox(0, 8.2, 0, 4.4, .55, 5.9, sandstone);
    for (const side of [-1, 1]) for (let j = -12; j <= 12; j++) gbox(side * 2.57, 6.55, j * .5, .06, .45, .17, M.darkTrim, true);
    for (const side of [-1, 1]) {
      gbox(0, 2.8, side * 8.5, 5.3, 5.2, 3.7, sandstone); gbox(0, 5.51, side * 8.5, 5.7, .26, 4.1, M.trim);
      gbox(2.68, 2.1, side * 8.5, .06, 3, 1.65, M.dark); gbox(0, 5.8, side * 8.5, 5.2, .3, 3.8, M.slate);
    }
    // Four small horse silhouettes and a chariot, all in weathered copper.
    for (let j = 0; j < 4; j++) {
      const z = gate.z + (j - 1.5) * .8;
      stamp(sphereGeo, M.copper, gate.x + .65, 9.1, z, .8, .35, .27);
      stamp(sphereGeo, M.copper, gate.x + 1.2, 9.55, z, .22, .48, .19);
      stamp(sphereGeo, M.copper, gate.x + 1.43, 9.86, z, .35, .17, .18);
      for (const x of [.17, 1.07]) for (const s of [-1, 1]) box(gate.x + x, 8.57, z + s * .18, .09, .8, .09, M.copper);
    }
    gbox(-.8, 8.9, 0, 1, .65, 1.25, M.copper);
    const wheel = new T.TorusGeometry(.43, .065, 5, 16);
    for (const side of [-1, 1]) stamp(wheel, M.copper, gate.x - .8, 8.61, gate.z + side * .7);
    cyl(gate.x - .8, 9.8, gate.z, .17, 1.1, M.copper); stamp(sphereGeo, M.copper, gate.x - .8, 10.5, gate.z, .19, .23, .19);
    cyl(gate.x - .5, 10.65, gate.z + .6, .035, 2.2, M.copper); stamp(wheel, M.copper, gate.x - .5, 11.7, gate.z + .6, .65, .65, .65, Math.PI / 2);
    obstacles.push({ x: gate.x, z: gate.z, w: 3, d: 10.6, h: 12.2 }); wheel.dispose();

    // Merge static geometry by material and neighbourhood cell. Close detail can be
    // culled without replacing the building shells or recompiling any materials.
    for (const b of bins.values()) {
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3)); if(b.n.length)g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));else g.computeVertexNormals();g.setAttribute('color',new T.Float32BufferAttribute(b.c,3)); g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2)); g.computeBoundingSphere();
      const mesh = new T.Mesh(g, b.mat); mesh.castShadow = !b.near && b.mat !== M.contact && b.mat !== environment.materials.contact && b.mat !== environment.materials.litter; if(b.mat.userData.depth)mesh.customDepthMaterial=b.mat.userData.depth; mesh.receiveShadow = true; root.add(mesh);
      if (b.near) details.push(mesh); stats.staticMeshes++; stats.triangles += b.p.length / 9;
    }
    bins.clear(); boxGeo.dispose(); cylinderGeo.dispose(); sphereGeo.dispose(); canopyGeo.dispose();
    // Reusable moving scenery; updates only transform already allocated objects.
    const carGeometry = new T.BoxGeometry(1, 1, 1), carColors = ['#f3f4e9','#d56c53','#579bb6','#b9c7c8'].map(c=>environment.surface(c));
    const busPaint=environment.surface('#e9bd43'),vehicleGlass=environment.surface('#456c86');stats.movingBuses=0;
    for (let i = 0; i < 6; i++) {
      const bus=i%3===0,paint=bus?busPaint:carColors[i%4];if(bus)stats.movingBuses++;
      const car = new T.Group(), body = new T.Mesh(carGeometry, paint), cabin = new T.Mesh(carGeometry, vehicleGlass);
      body.scale.set(bus?4.6:2.2,bus?1.1:.55,bus?1.12:.95); body.position.y=bus?.9:.65;
      cabin.scale.set(bus?3.9:1.15,bus?.44:.38,bus?1.14:.85);cabin.position.set(-.1,bus?1.25:1.04,0);
      body.castShadow = cabin.castShadow = true; const roof = new T.Mesh(carGeometry,paint);roof.scale.set(bus?4:1.2,.08,bus?1.2:.9);roof.position.set(-.1,bus?1.52:1.27,0);car.add(body,cabin,roof);root.add(car);dynamics.push({car,offset:i*23.7,side:i%2?1:-1});
    }
    const pedestrian = new T.InstancedMesh(new T.CylinderGeometry(.09, .13, .45, 6), environment.surface('#344344'), 24), heads = new T.InstancedMesh(new T.SphereGeometry(.09, 6, 4), environment.surface('#c6ab88'), 24);
    pedestrian.boundingSphere = new T.Sphere(new T.Vector3(-31, 1, 146), 24); heads.boundingSphere = pedestrian.boundingSphere.clone();
    pedestrian.instanceMatrix.setUsage(T.DynamicDrawUsage); heads.instanceMatrix.setUsage(T.DynamicDrawUsage); root.add(pedestrian, heads);
    const citizens = Array.from({ length: 24 }, (_, i) => ({ u: -16 + random() * 35, v: (i % 2 ? 1 : -1) * (3.4 + random() * 2), rate: .2 + random() * .25 }));
    let lastLodX = Infinity, lastLodZ = Infinity, lastQuality, elapsed = 0, previousTime = 0, lastAnimation = -Infinity;
    function update(camera, quality, time, moving) {
      if (Math.hypot(camera.position.x - lastLodX, camera.position.z - lastLodZ) > 10 || lastQuality !== quality) {
        lastLodX = camera.position.x; lastLodZ = camera.position.z; lastQuality = quality;
        const distance = quality === 'High' ? 220 : quality === 'Performance' ? 70 : 125;
        for (const m of details) m.visible = m.geometry.boundingSphere.center.distanceTo(camera.position) < distance + m.geometry.boundingSphere.radius;
      }
      const dt = Math.max(0, time - previousTime); previousTime = time;
      if (moving) elapsed += dt;
      const visible = Math.hypot(camera.position.x - 20, camera.position.z - 150) < 330;
      for (const d of dynamics) { const p = plaza(29 + ((d.offset + elapsed * d.side * 1.6) % 131 + 131) % 131, d.side * 5.6); d.car.position.set(p.x, 0, p.z); d.car.rotation.y = -angle + (d.side < 0 ? Math.PI : 0); d.car.visible = visible; }
      pedestrian.visible = heads.visible = visible;
      if (Math.abs(elapsed - lastAnimation) < .05) return;
      lastAnimation = elapsed;
      if (pedestrian.visible) for (let i = 0; i < citizens.length; i++) { const c = citizens[i], p = plaza(-16 + ((c.u + 16 + elapsed * c.rate) % 35), c.v); transform.position.set(p.x, .64, p.z); transform.rotation.set(0, 0, 0); transform.scale.setScalar(1.4); transform.updateMatrix(); pedestrian.setMatrixAt(i, transform.matrix); transform.position.y = .96; transform.updateMatrix(); heads.setMatrixAt(i, transform.matrix); }
      pedestrian.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    }
    return { update, stats, bounds, spawn, views, root };
  }
  return { contains, build, spawn, views };
})();
