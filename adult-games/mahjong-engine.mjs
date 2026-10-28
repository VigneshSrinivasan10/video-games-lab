// Layouts adapted from tcottrill/myMahjong (Unlicense); see vendor/mahjong/LICENSE.txt.
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const LAYOUT_TURTLE = (() => {
    const out = [];
    // Layer 0: 8×9 main grid + ears + head/tail = 78
    for (let y = 2; y <= 18; y += 2)
        for (let x = 2; x <= 16; x += 2) out.push({z:0, x, y});
    out.push({z:0, x:0,  y:9});
    out.push({z:0, x:0,  y:11});
    out.push({z:0, x:18, y:9});
    out.push({z:0, x:18, y:11});
    out.push({z:0, x:8,  y:0});
    out.push({z:0, x:10, y:0});
    // Layer 1: 6×7 = 42
    for (let y = 4; y <= 16; y += 2)
        for (let x = 4; x <= 14; x += 2) out.push({z:1, x, y});
    // Layer 2: 4×4 = 16
    for (let y = 6; y <= 12; y += 2)
        for (let x = 6; x <= 12; x += 2) out.push({z:2, x, y});
    // Layer 3: 2×3 = 6
    for (let y = 7; y <= 11; y += 2)
        for (let x = 8; x <= 10; x += 2) out.push({z:3, x, y});
    // Layer 4: 2 apex
    out.push({z:4, x:9, y:8});
    out.push({z:4, x:9, y:10});
    return out;
})();

// Pyramid (120 tiles) — stepped square pyramid, no overhangs.
const LAYOUT_PYRAMID = (() => {
    const out = [];
    // Layer 0: 8×8 = 64
    for (let y = 2; y <= 16; y += 2)
        for (let x = 2; x <= 16; x += 2) out.push({z:0, x, y});
    // Layer 1: 6×6 = 36
    for (let y = 4; y <= 14; y += 2)
        for (let x = 4; x <= 14; x += 2) out.push({z:1, x, y});
    // Layer 2: 4×4 = 16
    for (let y = 6; y <= 12; y += 2)
        for (let x = 6; x <= 12; x += 2) out.push({z:2, x, y});
    // Layer 3: 2×2 = 4
    for (let y = 8; y <= 10; y += 2)
        for (let x = 8; x <= 10; x += 2) out.push({z:3, x, y});
    return out;
})();

// Dragon (140 tiles) — long narrow body with crown ridge, fans at head/tail.
const LAYOUT_DRAGON = (() => {
    const out = [];
    // z=0 body: 4 wide × 12 rows = 48 (x:4..10, y:2..24)
    for (let y = 2; y <= 24; y += 2)
        for (let x = 4; x <= 10; x += 2) out.push({z:0, x, y});
    // z=0 head fan (top): 6 wide × 1 row at y=0
    for (let x = 2; x <= 12; x += 2) out.push({z:0, x, y:0});
    // z=0 tail fan (bottom): 6 wide × 1 row at y=26
    for (let x = 2; x <= 12; x += 2) out.push({z:0, x, y:26});
    // z=0 side scales (4 tiles each side, half-row offset for organic feel)
    for (let y of [7, 11, 15, 19]) out.push({z:0, x:2, y});
    for (let y of [7, 11, 15, 19]) out.push({z:0, x:12, y});
    // z=1: 4 wide × 10 rows = 40 (x:4..10, y:4..22)
    for (let y = 4; y <= 22; y += 2)
        for (let x = 4; x <= 10; x += 2) out.push({z:1, x, y});
    // z=2: 2 wide × 8 rows = 16 (x:6..8, y:6..20)
    for (let y = 6; y <= 20; y += 2)
        for (let x = 6; x <= 8; x += 2) out.push({z:2, x, y});
    // z=3: 2 wide × 6 rows = 12 (x:6..8, y:8..18)
    for (let y = 8; y <= 18; y += 2)
        for (let x = 6; x <= 8; x += 2) out.push({z:3, x, y});
    return out;
})();

// Simple (72 tiles) — fast, beginner-friendly play. Mostly flat.
const LAYOUT_SIMPLE = (() => {
    const out = [];
    // Layer 0: 6×8 = 48
    for (let y = 2; y <= 16; y += 2)
        for (let x = 4; x <= 14; x += 2) out.push({z:0, x, y});
    // Layer 1: 4×4 = 16
    for (let y = 6; y <= 12; y += 2)
        for (let x = 6; x <= 12; x += 2) out.push({z:1, x, y});
    // Layer 2: 2×4 = 8
    for (let y = 6; y <= 12; y += 2)
        for (let x = 8; x <= 10; x += 2) out.push({z:2, x, y});
    return out;
})();

const LAYOUTS = {
    TURTLE:  LAYOUT_TURTLE,
    PYRAMID: LAYOUT_PYRAMID,
    DRAGON:  LAYOUT_DRAGON,
    SIMPLE:  LAYOUT_SIMPLE,
};

export const layouts=[LAYOUT_SIMPLE,LAYOUT_PYRAMID,LAYOUT_TURTLE,LAYOUT_DRAGON];
// Adapted isFreeAmong: test every higher layer, including half-tile overhangs.
export function isFreeAmong(tile,layout,present){let top=false,left=false,right=false;for(const i of present){const t=layout[i];if(t===tile)continue;if(t.z>tile.z&&Math.abs(t.x-tile.x)<2&&Math.abs(t.y-tile.y)<2)top=true;if(t.z===tile.z&&Math.abs(t.y-tile.y)<2){if(t.x===tile.x-2)left=true;if(t.x===tile.x+2)right=true;}}return !top&&(!left||!right);}
export function free(tiles){const set=new Set(tiles.flatMap((t,i)=>t.active?[i]:[]));return [...set].filter(i=>isFreeAmong(tiles[i],tiles,set));}
export function pairs(tiles){const a=free(tiles),out=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(tiles[a[i]].face===tiles[a[j]].face)out.push([a[i],a[j]]);return out;}
export function sequence(layout,rand){for(let attempt=0;attempt<100;attempt++){const present=new Set(layout.map((_,i)=>i)),seq=[];while(present.size){const a=[...present].filter(i=>isFreeAmong(layout[i],layout,present));if(a.length<2)break;const x=a.splice(Math.floor(rand()*a.length),1)[0],y=a[Math.floor(rand()*a.length)];seq.push([x,y]);present.delete(x);present.delete(y);}if(!present.size)return seq;}return null;}
export function deal(l,n){const rand=rng(137*Math.floor(n+1)+10007*(l+1)),layout=layouts[l],seq=sequence(layout,rand);if(!seq)throw Error('Could not create a solvable deal.');const faces=seq.map((_,i)=>i%36);for(let i=faces.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[faces[i],faces[j]]=[faces[j],faces[i]];}const tiles=layout.map(t=>({...t,active:true,face:0}));seq.forEach((p,i)=>p.forEach(j=>tiles[j].face=faces[i]));return{tiles,sequence:seq};}
export function reshuffle(tiles,seed){const rand=rng(seed),active=tiles.filter(t=>t.active),layout=active.map(t=>({...t}));let seq=sequence(layout,rand),rearranged=false;if(!seq){layout.forEach((t,i)=>{t.x=(i%8)*2;t.y=(i/8|0)*2;t.z=0;});seq=sequence(layout,rand);rearranged=true;}if(!seq)throw Error('Please undo the last pair.');const counts=new Map();active.forEach(t=>counts.set(t.face,(counts.get(t.face)||0)+1));const faces=[];for(const[f,n]of counts){if(n%2)throw Error('Unmatched tile in save.');for(let i=0;i<n/2;i++)faces.push(f);}for(let i=faces.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[faces[i],faces[j]]=[faces[j],faces[i]];}seq.forEach((p,i)=>p.forEach(j=>{layout[j].face=faces[i];}));return{tiles:layout,sequence:seq,rearranged};}
