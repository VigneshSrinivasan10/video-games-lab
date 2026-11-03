/* Architectural approximations from the monument references in city-flight.txt.
   Models use map-scale metres and original geometry, not extracted game assets. */
window.BerlinArchitecture = {
  build({ T, scene, geo, obstacles, features, environment, waterLevel }) {
    const {M,cache,roots,stats,geometry,kit}=CityGeometry.create({T,scene,environment});
    const cathedral = geo(13.401, 52.5191), tv = geo(13.4094, 52.5208);
    {
      // Follow the mapped building's diagonal: its eastern wall stays on the
      // island instead of projecting into the Spree at the north-east corner.
      const k = kit('Berlin Cathedral · stone and copper', cathedral.x, cathedral.z, -1.02), { box, cyl, sphere, ring, beam, arch, archFrame } = k;
      function dome(x, base, z, radius, height, lantern = false) {
        const profile = [[1, 0], [1.02, .035], [.99, .1], [.95, .25], [.84, .46], [.68, .67], [.47, .83], [.24, .95], [.14, 1]].map(([r, y]) => new T.Vector2(r * radius, y * height));
        const smoothProfile = new T.SplineCurve(profile).getPoints(40);
        const g = new T.LatheGeometry(smoothProfile, 64); k.stamp(g, M.copper, x, base, z); g.dispose();
        ring(x, base, z, radius * 1.01, .12, M.copperDark); ring(x, base + .3, z, radius, .065, M.copperDark);
        for (let j = 0; j < 16; j++) {
          const a = j * Math.PI / 8;
          for (let i = 1; i < profile.length; i++) { const p = profile[i - 1], q = profile[i]; beam([x + p.x * Math.cos(a), base + p.y, z + p.x * Math.sin(a)], [x + q.x * Math.cos(a), base + q.y, z + q.x * Math.sin(a)], radius * .007, M.copperDark); }
          if (radius > 5 && j % 2 === 0) {
            const rr = radius * .91, y = base + height * .32;
            const torus = geometry('dome-oculus', () => new T.TorusGeometry(.32, .07, 6, 20));
            k.stamp(torus, M.copperDark, x + rr * Math.cos(a), y, z + rr * Math.sin(a), 1, 1, 1, Math.PI / 2 - a, -.38);
          }
        }
        const top = base + height;
        if (lantern) {
          cyl(x, top + .25, z, 1.05, .35, M.copperDark);
          cyl(x, top + 1.1, z, .7, 1.5, M.dark);
          for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; cyl(x + Math.cos(a) * .78, top + 1.05, z + Math.sin(a) * .78, .065, 1.5, M.copper); }
          cyl(x, top + 1.9, z, .95, .35, M.copper, .45); cyl(x, top + 2.45, z, .45, .8, M.copper, .1);
          sphere(x, top + 2.9, z, .18, .18, .18, M.brass); box(x, top + 3.55, z, .08, 1.1, .08, M.brass); box(x, top + 3.7, z, .66, .08, .08, M.brass);
        } else { cyl(x, top + .2, z, .22, .4, M.copperDark); sphere(x, top + .55, z, .18, .2, .18, M.brass); }
      }
      function cornice(y, w, d) { for(let x=-w/2+.5;x<w/2;x+=.55)for(const side of [-1,1])box(x,y-.22,side*d/2,.22,.4,.38,M.trim); box(0, y, 0, w, .2, d, M.darkStone); box(0, y + .21, 0, w + .5, .22, d + .5, M.trim); box(0, y + .42, 0, w + .18, .16, d + .18, M.trim); }
      box(0, .4, 0, 35, .8, 29, M.darkStone); box(0, 7, 0, 32, 13, 26, M.stone);
      cornice(5.4, 32.5, 26.5); cornice(13.6, 33, 27); box(0, 14.2, 0, 31, .35, 25, M.copperDark);
      // West front: recessed portals, two-storey columns, cornices and pediments.
      for (const side of [-1, 1]) for (const x of [6, 9.3, 12.6]) {
        arch(side * x, 1.1, 13.04, .72, 2.15, M.dark); archFrame(side * x, 1.1, 13.1, .9, 2.15);
        arch(side * x, 7.1, 13.04, .7, 2.3, M.glass); archFrame(side * x, 7.1, 13.1, .92, 2.3);
        box(side * x, 8.4, 13.3, .065, 2.5, .08, M.trim); box(side * x, 8.4, 13.3, 1.25, .07, .08, M.trim);
      }
      for (const x of [-15, -10.8, -7.6, -4.6, 4.6, 7.6, 10.8, 15]) {
        box(x, 1.5, 13.8, 1.15, 1.5, 1.25, M.darkStone); cyl(x, 7.3, 13.8, .46, 10.3, M.stone, .39);
        cyl(x, 12.5, 13.8, .61, .28, M.trim); box(x, 12.82, 13.8, 1.3, .35, 1.35, M.trim);
        for(const dx of [-.33,.33]) for(const dz of [-.33,.33]) sphere(x+dx,12.45,13.8+dz,.19,.25,.19,M.trim);
      }
      box(0, 6.9, 14.05, 8.5, 12.8, 1.5, M.stone);
      arch(0, 1.1, 14.83, 2.9, 5.8, M.dark); archFrame(0, 1.1, 14.9, 3.3, 5.8, .42);
      for (const x of [-1.65, 0, 1.65]) { box(x, 3.1, 15.13, 1.32, 4.05, .14, M.glass); box(x, 3.1, 15.24, .08, 4.1, .08, M.brass); }
      for (let j = 0; j < 6; j++) box(0, .18 + j * .16, 17.3 - j * .4, 12 - j * .25, .22, 1, M.trim);
      box(0,14.15,14.7,2.1,.45,1.2,M.trim);
      cyl(0,15.1,14.7,.32,1.5,M.copperDark,.18,12);sphere(0,16.05,14.7,.23,.27,.23,M.copper);
      for(const side of [-1,1])beam([side*.15,15.45,14.7],[side*1.6,15.95,14.6],.12,M.copperDark);
      // Sculpted upper front: nested arch, inset lunette and paired pediments.
      arch(0, 8.8, 14.98, 3.2, .05, M.darkStone, .18);
      archFrame(0, 8.8, 15.22, 3.72, .05, .24);
      archFrame(0, 8.8, 15.34, 3.4, .05, .12);
      for(const side of [-1,1]) {
        const x=side*9.3;
        k.tri([[x-2.3,11.25,13.65],[x+2.3,11.25,13.65],[x,12.55,13.65]],M.darkStone);
        beam([x-2.4,11.25,13.8],[x,12.65,13.8],.09,M.trim);beam([x,12.65,13.8],[x+2.4,11.25,13.8],.09,M.trim);
      }
      // Side elevations face the Spree and neighbouring streets.
      for (const side of [-1, 1]) for (let z = -10; z <= 10; z += 4) {
        for (const y of [2, 7.6]) { arch(side * 16.02, y, z, .8, 2.2, M.dark, .12, side * Math.PI / 2); archFrame(side * 16.1, y, z, 1, 2.2, .2, side * Math.PI / 2); }
        box(side * 16.2, 7.5, z + 1.6, .45, 11, .45, M.trim);
      }
      // Drum with inset arched lights and paired columns, below the great dome.
      cyl(0, 18.2, 0, 8.4, 7.5, M.darkStone, 8.4, 64);
      cyl(0, 22.15, 0, 8.7, .5, M.trim); ring(0, 14.7, 0, 8.65, .28); ring(0, 21.8, 0, 8.7, .25); ring(0, 22.15, 0, 8.9, .14);
      for (let j = 0; j < 16; j++) {
        const a = j * Math.PI / 8, x = Math.sin(a) * 8.45, z = Math.cos(a) * 8.45;
        arch(x, 15.3, z, .6, 3.9, M.dark, .1, a); archFrame(x, 15.3, z, .79, 3.9, .18, a);
        for(const y of [15.0,21.55]){const r=8.7;k.stamp(geometry("drum-panel",()=>new T.BoxGeometry(1,1,1)),M.trim,Math.sin(a)*r,y,Math.cos(a)*r,2.35,.22,.4,a);}
        for (const s of [-1, 1]) { const b = a + s * .115; cyl(Math.sin(b) * 8.6, 18.35, Math.cos(b) * 8.6, .16, 6.1, M.stone); }
      }
      dome(0, 22.4, 0, 8.65, 9, true);
      for (const side of [-1, 1]) for (const back of [-1, 1]) {
        const x = side * 13, z = back * 9.7;
        box(x, 16.1, z, 5.6, 4.1, 5.6, M.stone); cyl(x, 20.2, z, 2.55, 4.5, M.darkStone, 2.55, 8);
        for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, xx = x + Math.sin(a) * 2.58, zz = z + Math.cos(a) * 2.58; arch(xx, 18.5, zz, .61, 2, M.dark, .1, a); archFrame(xx, 18.5, zz, .75, 2, .14, a); }
        for(let j=0;j<8;j++){const a=j*Math.PI/4;for(const side of [-1,1]){const b=a+side*.28;cyl(x+Math.sin(b)*2.72,20.25,z+Math.cos(b)*2.72,.12,4.35,M.stone);}}
        cyl(x, 22.55, z, 2.86, .55, M.trim); ring(x, 22.6, z, 2.85, .2); dome(x, 22.8, z, 2.9, 3.6);
      }
      // Balustrades and small statuary break the otherwise box-like roofline.
      for (let x = -15; x <= 15; x += 1.15) { box(x, 14.95, 12.8, .15, .9, .18, M.trim); box(x, 14.95, -12.8, .15, .9, .18, M.trim); }
      for (const z of [-12.8, 12.8]) box(0, 15.45, z, 31, .16, .45, M.trim);
      for (const x of [-16, -8, 8, 16]) { box(x, 15, 13.1, .75, 1.1, .7, M.darkStone); cyl(x, 16.2, 13.1, .22, 1.2, M.copperDark, .15, 8); sphere(x, 17, 13.1, .18, .21, .18, M.copperDark); }
      k.finish(); obstacles.push({ ...cathedral, w: 23, d: 25.5, h: 36 });
    }

    {
      const k = kit('Fernsehturm · concrete and faceted stainless steel', tv.x, tv.z), { cyl, ring, box, beam } = k;
      // 368 m overall; 32 m sphere, starting about 200 m above ground.
      const center = 77.76, radius = 5.76;
      cyl(0, 45, 0, 2.8, 90, M.concrete, 1.35, 64);
      for (let y = 4; y < 70; y += 2.7) ring(0, y, 0, 2.8 - y / 90 * 1.45, .012, M.darkStone);
      cyl(0, 71.4, 0, 2.25, .6, M.frame); cyl(0, 86.7, 0, 2.2, .7, M.frame); ring(0, 89.5, 0, 2.35, .08, M.frame);
      const levels = [-5.76, -5.1, -4.55, -3.6, -3.15, -2.3, -1.5, -.7, .1, .9, 1.7, 2.5, 3.3, 4.1, 4.8, 5.35, 5.76];
      const point = (a, y, lift = 0) => { const r = Math.sqrt(Math.max(0, radius * radius - y * y)) + lift; return [Math.cos(a) * r, center + y, Math.sin(a) * r]; };
      for (let band = 0; band < levels.length - 1; band++) for (let j = 0; j < 64; j++) {
        const y0 = levels[band], y1 = levels[band + 1], a0 = j * Math.PI / 32, a1 = (j + 1) * Math.PI / 32, glass = band === 2 || band === 5;
        const corners = [point(a0 + .002, y0 + .008), point(a0 + .002, y1 - .008), point(a1 - .002, y1 - .008), point(a1 - .002, y0 + .008)];
        if (glass) { k.tri([corners[0], corners[1], corners[2]], M.glass); k.tri([corners[0], corners[2], corners[3]], M.glass); beam(point(a0, y0), point(a0, y1), .025, M.frame); }
        else { const peak = point((a0 + a1) / 2, (y0 + y1) / 2, .09); for (let i = 0; i < 4; i++) k.tri([corners[i], corners[(i + 1) % 4], peak], M.steel); }
      }
      for (const y of levels.slice(1, -1)) ring(0, center + y, 0, Math.sqrt(radius * radius - y * y), .018, M.frame);
      for (let j = 0; j < 12; j++) { const y = 90 + j * 3.54, r = 1.1 - j * .082; cyl(0, y + 1.77, 0, r, 3.54, j % 2 ? M.ivory : M.red, Math.max(.14, r - .06), 24); }
      for (const y of [91, 96, 101]) { ring(0, y, 0, 1.55, .06, M.frame); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; box(Math.cos(a) * 1.4, y - .25, Math.sin(a) * 1.4, .16, .8, .16, M.ivory); } }
      // Low entrance pavilion and the sloping roof planes at the foot of the shaft.
      cyl(0, .6, 0, 11, .9, M.darkStone, 11, 6); cyl(0, 1.9, 0, 7.6, 2.3, M.glass, 7.6, 6);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, b = (i + 1) * Math.PI / 3; k.tri([[Math.cos(a) * 9, 1.7, Math.sin(a) * 9], [0, 4.5, 0], [Math.cos(b) * 9, 1.7, Math.sin(b) * 9]], M.concrete); }
      k.finish(); obstacles.push({ ...tv, w: 6.2, d: 6.2, h: 133 });
    }

    // Quays follow the water polygons. Test both sides of each edge to omit
    // internal seams between adjoining OSM water features and island holes.
    const waterfront=CityWaterfront.build({T,scene,environment,features,obstacles,waterLevel});
    roots.push(...waterfront.roots);for(const key of ['triangles','meshes','banks','naturalBanks','bridges'])stats[key]+=waterfront.stats[key];
    for (const g of cache.values()) g.dispose();
    return { roots, stats, cathedral, tv, update:waterfront.update };
  }
};
