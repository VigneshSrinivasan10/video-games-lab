function sudokuEngine(level,number){
 let seed=((level+1)*1000003+number*7919)>>>0;
 const rand=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 function solve(input,random=false,limit=2){const a=input.slice(),rows=new Int32Array(9),cols=new Int32Array(9),boxes=new Int32Array(9);let count=0,solution;
  for(let i=0;i<81;i++)if(a[i]){const r=i/9|0,c=i%9,b=(r/3|0)*3+(c/3|0),bit=1<<a[i];if((rows[r]|cols[c]|boxes[b])&bit)return{count:0};rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;}
  function search(){if(count>=limit)return;let idx=-1,mask=0,best=10;for(let i=0;i<81;i++)if(!a[i]){const r=i/9|0,c=i%9,b=(r/3|0)*3+(c/3|0),m=1022&~(rows[r]|cols[c]|boxes[b]);let n=0;for(let t=m;t;t&=t-1)n++;if(!n)return;if(n<best){best=n;idx=i;mask=m;if(n===1)break;}}if(idx<0){count++;solution=a.slice();return;}const r=idx/9|0,c=idx%9,b=(r/3|0)*3+(c/3|0),digits=[];for(let d=1;d<=9;d++)if(mask&(1<<d))digits.push(d);if(random)shuffle(digits);for(const d of digits){const bit=1<<d;a[idx]=d;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;search();a[idx]=0;rows[r]^=bit;cols[c]^=bit;boxes[b]^=bit;if(count>=limit)return;}}
  search();return{count,solution};
 }
 const target=[52,48,44,40,37,34,32,30,28,26][level];let best;
 for(let attempt=0;attempt<12;attempt++){
  const solution=solve(Array(81).fill(0),true,1).solution,givens=solution.slice();let clues=81;
  for(const i of shuffle(Array.from({length:81},(_,i)=>i))){const old=givens[i];givens[i]=0;if(solve(givens).count!==1)givens[i]=old;else clues--;if(clues===target)break;}
  if(!best||clues<best.clues)best={givens,solution,clues};if(clues===target)break;
 }
 return best;
}
