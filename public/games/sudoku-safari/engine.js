(function(root){
'use strict';
const levels=[
 ['First steps',4,2,2,4],['Little explorer',4,2,2,6],['Clever cub',4,2,2,8],['Mini master',4,2,2,10],
 ['Growing curious',6,2,3,12],['Pattern scout',6,2,3,16],['Brain adventurer',6,2,3,20],['Super solver',6,2,3,23],
 ['Big discoveries',9,3,3,30],['Star thinker',9,3,3,38],['Cosmic challenger',9,3,3,44],['Sudoku superstar',9,3,3,49]
].map(([name,n,h,w,holes],i)=>({name,n,h,w,holes,tier:i<4?'Easy':i<8?'Challenging':'Difficult'}));
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function candidates(b,i,l){const {n,h,w}=l,r=Math.floor(i/n),c=i%n,used=new Set();for(let k=0;k<n;k++){used.add(b[r*n+k]);used.add(b[k*n+c]);}for(let y=r-r%h;y<r-r%h+h;y++)for(let x=c-c%w;x<c-c%w+w;x++)used.add(b[y*n+x]);return Array.from({length:n},(_,k)=>k+1).filter(v=>!used.has(v));}
function countSolutions(input,l,limit=2){const b=input.slice();let count=0;function visit(){let at=-1,opts;for(let i=0;i<b.length;i++)if(!b[i]){const a=candidates(b,i,l);if(!a.length)return;if(!opts||a.length<opts.length){at=i;opts=a;if(a.length===1)break;}}if(at<0){count++;return;}for(const v of opts){b[at]=v;visit();if(count>=limit)break;}b[at]=0;}visit();return count;}
function generate(level,puzzle){const l=levels[level],{n,h,w}=l,r=rng(90317+level*1009+puzzle*7919),seq=k=>Array.from({length:k},(_,i)=>i),nums=shuffle(seq(n),r).map(v=>v+1),rows=shuffle(seq(n/h),r).flatMap(b=>shuffle(seq(h),r).map(x=>b*h+x)),cols=shuffle(seq(n/w),r).flatMap(b=>shuffle(seq(w),r).map(x=>b*w+x));const solution=rows.flatMap(y=>cols.map(x=>nums[(y*w+Math.floor(y/h)+x)%n]));const clues=solution.slice();let removed=0;for(const i of shuffle(seq(n*n),r)){const v=clues[i];clues[i]=0;if(countSolutions(clues,l)!==1)clues[i]=v;else removed++;if(removed===l.holes)break;}return {clues,solution};}
root.KidsSudoku={levels,generate,candidates,countSolutions};
})(typeof window==='undefined'?globalThis:window);
