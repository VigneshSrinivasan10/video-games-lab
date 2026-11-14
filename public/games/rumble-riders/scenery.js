/* Cached, hand-drawn Canvas scenery. No generated images or runtime dependencies. */
window.RumbleScenery = class {
  constructor() {
    this.trees = Array.from({ length: 5 }, (_, i) => this.tree(i));
    this.shrubs = Array.from({ length: 3 }, (_, i) => this.shrub(i));
    const [grain, g] = this.surface(128, 128), random = this.random(76);
    for (let i=0;i<5000;i++) { g.fillStyle=random()>.5?'#ffffff18':'#152c3420';g.fillRect(random()*128,random()*128,1,1); }
    this.grain = grain;
  }
  random(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  surface(width, height) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    return [canvas, canvas.getContext('2d')];
  }
  oval(c, x, y, rx, ry, color) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  }
  tree(seed) {
    const [canvas, c] = this.surface(440, 520), rng = this.random(seed * 1237 + 19);
    const spread = seed === 2 ? .74 : 1;
    // Irregular, branching trunks underneath a layered canopy.
    c.lineCap = 'round'; c.strokeStyle = '#565247'; c.lineWidth = 20;
    c.beginPath(); c.moveTo(220, 506); c.bezierCurveTo(209, 420, 229, 365, 207, 300); c.stroke();
    c.strokeStyle = '#a99872'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(224, 500); c.bezierCurveTo(216, 422, 235, 368, 213, 305); c.stroke();
    for (let i = 0; i < 12; i++) {
      const x = 90 + rng() * 260, y = 125 + rng() * 210;
      c.strokeStyle = i % 2 ? '#615f49' : '#797353'; c.lineWidth = 3 + rng() * 8;
      c.beginPath(); c.moveTo(217, 425); c.quadraticCurveTo(220, 320, x, y); c.stroke();
    }
    const palette = ['#294e43', '#355a45', '#42684b', '#537950', '#668752', '#7d965b', '#9ba768'];
    const clusters = Array.from({ length: 34 }, () => ({ x: 220 + (rng() - .5) * 290 * spread, y: 170 + (rng() - .5) * 200, r: 32 + rng() * 37 }));
    clusters.sort((a,b) => b.y-a.y);
    for (const p of clusters) {
      const gradient = c.createRadialGradient(p.x + 14, p.y - 24, 2, p.x, p.y, p.r);
      gradient.addColorStop(0, palette[4]); gradient.addColorStop(.6, palette[2]); gradient.addColorStop(1, palette[0]);
      this.oval(c, p.x, p.y, p.r, p.r * .8, gradient);
      for (let j = 0; j < 72; j++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * p.r;
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * .8;
        const light = Math.max(0, Math.min(6, Math.floor(3 + (p.y-y) / p.r * 3 + rng()*2)));
        this.oval(c, x, y, 2 + rng()*7, 2 + rng()*4, palette[light]);
      }
    }
    // Fine twigs and tufts break the silhouette instead of leaving round blobs.
    for (let i=0;i<190;i++) {
      const p=clusters[Math.floor(rng()*clusters.length)], a=rng()*Math.PI*2;
      this.oval(c,p.x+Math.cos(a)*p.r,p.y+Math.sin(a)*p.r*.8,2+rng()*5,2+rng()*3,palette[2+Math.floor(rng()*4)]);
    }
    return canvas;
  }
  shrub(seed) {
    const [canvas,c]=this.surface(240,140),rng=this.random(seed+89);
    for(let i=0;i<120;i++) {
      const x=30+rng()*180,y=50+rng()*65;
      this.oval(c,x,y,8+rng()*16,5+rng()*10,['#566b43','#73834d','#93a25b','#b0af67'][Math.floor(rng()*4)]);
      if(i%7===0)this.oval(c,x,y-5,2,3,seed%2?'#e6b969':'#e1d5b0');
    }
    return canvas;
  }
  resize(w,h) {
    [this.background, this.bg] = this.surface(w,h);
    const c=this.bg,rng=this.random(301);
    let gradient=c.createLinearGradient(0,0,0,h*.58);
    gradient.addColorStop(0,'#77aabb');gradient.addColorStop(.55,'#c9d5cc');gradient.addColorStop(.85,'#f8dec0');gradient.addColorStop(1,'#f7ceaa');
    c.fillStyle=gradient;c.fillRect(0,0,w,h);
    // A soft sunset glow and wispy cloud banks.
    gradient=c.createRadialGradient(w*.8,h*.23,h*.015,w*.8,h*.23,h*.39);
    gradient.addColorStop(0,'#fff2d9bb');gradient.addColorStop(.2,'#ffe1b45c');gradient.addColorStop(1,'#ffe1b400');
    c.fillStyle=gradient;c.fillRect(0,0,w,h*.65);
    this.oval(c,w*.8,h*.23,h*.026,h*.026,'#fff3d8');
    c.filter='blur(5px)';
    for(let bank=0;bank<7;bank++){
      const x=rng()*w,y=h*(.09+rng()*.19);
      for(let i=0;i<14;i++)this.oval(c,x+(rng()-.5)*w*.19,y+(rng()-.5)*h*.026,w*(.015+rng()*.045),h*(.003+rng()*.006),'#ffeedb29');
    }
    c.filter='none';
    // Smooth coastal ridgelines, progressively quieter and cooler with distance.
    const ridge=(points,color,bottom=.53)=>{c.fillStyle=color;c.beginPath();c.moveTo(points[0][0]*w,h*bottom);c.lineTo(points[0][0]*w,points[0][1]*h);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];c.bezierCurveTo((a[0]+(b[0]-a[0])*.4)*w,a[1]*h,(a[0]+(b[0]-a[0])*.6)*w,b[1]*h,b[0]*w,b[1]*h)}c.lineTo(points.at(-1)[0]*w,h*bottom);c.closePath();c.fill()};
    ridge([[0,.28],[.1,.21],[.18,.23],[.29,.27],[.38,.25],[.46,.32],[.62,.36]],'#9eafb0');
    ridge([[0,.32],[.11,.29],[.19,.31],[.27,.28],[.35,.33],[.46,.36],[.59,.375]],'#829e97');
    ridge([[0,.32],[.07,.34],[.17,.315],[.26,.35],[.34,.365],[.46,.38],[.57,.39]],'#64877a');
    c.save();
    c.globalAlpha=.16;
    for(let i=0;i<12;i++) {
      c.strokeStyle=i%2?'#d5d6ae':'#38695f';c.lineWidth=2+i*.5;
      c.beginPath();c.moveTo(0,h*(.34+i*.004));
      c.bezierCurveTo(w*.08,h*(.39+i*.003),w*.17,h*(.325+i*.003),w*.32,h*(.37+i*.002));c.stroke();
    }
    c.restore();
    // Faint terraces and trees on the hills give them scale.
    for(let i=0;i<170;i++) {const x=rng()*w*.36,y=h*(.36+rng()*.035);this.oval(c,x,y,1+rng()*3,2+rng()*5,'#53796b55')}
    gradient=c.createLinearGradient(0,h*.385,0,h);
    gradient.addColorStop(0,'#94bfbb');gradient.addColorStop(.25,'#68aaa9');gradient.addColorStop(.7,'#3d9197');gradient.addColorStop(1,'#367f89');
    c.fillStyle=gradient;c.fillRect(w*.5,h*.385,w*.5,h*.615);
    for(let i=0;i<180;i++) {const y=h*(.39+rng()*.5),x=w*(.55+rng()*.5);c.strokeStyle=i%4?'#d7e8d447':'#fff2d16b';c.lineWidth=.5+rng();c.beginPath();c.moveTo(x,y);c.lineTo(x+w*(.003+rng()*.025)*(y/h),y);c.stroke()}
    // Tiny sailboats and an offshore island.
    ridge([[.79,.397],[.84,.381],[.91,.389],[1,.40]],'#7fa59b',.402);
    for(const [x,y,s] of [[.73,.425,.8],[.91,.45,1.15]]){
      c.strokeStyle='#e4dfc9';c.lineWidth=1;c.beginPath();c.moveTo(x*w,y*h);c.lineTo(x*w,y*h-25*s);c.stroke();
      c.fillStyle='#fff1d4';c.beginPath();c.moveTo(x*w-2,y*h-25*s);c.quadraticCurveTo(x*w-15*s,y*h-9*s,x*w-14*s,y*h-5*s);c.lineTo(x*w-2,y*h-5*s);c.fill();
      c.strokeStyle='#4c7779';c.lineWidth=2;c.beginPath();c.moveTo(x*w-16*s,y*h);c.lineTo(x*w+7*s,y*h);c.stroke();
    }
    // Distant warm village nestled against the left headland.
    for(let i=0;i<17;i++){
      const x=w*(.38+rng()*.15),y=h*(.368+rng()*.023),size=3+rng()*5;
      c.fillStyle=i%2?'#ddd3b5':'#cbbb99';c.fillRect(x,y,size,size*1.4);
      c.fillStyle='#a87762';c.fillRect(x-1,y-2,size+2,2);
      c.fillStyle='#748c81';c.fillRect(x+size*.4,y+3,1,2);
    }
  }
};
