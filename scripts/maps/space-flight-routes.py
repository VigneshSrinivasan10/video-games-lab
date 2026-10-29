"""Reorder existing sights for flowing flights, with no geographic additions."""
import json,math,random,re,pathlib
root=pathlib.Path(__file__).resolve().parents[2]

def distance(a,b):return math.hypot((a['lon']-b['lon'])*math.cos(math.radians((a['lat']+b['lat'])/2)),a['lat']-b['lat'])*111.32

def order(points,seed,max_leg=2.15,keep_end=False):
 n=len(points);d=[[distance(a,b) for b in points] for a in points]
 # Strongly reject adjacent cluster stops and distant detours; prefer ~1km legs.
 def edge(a,b):
  x=d[a][b];return x+(100+2000*(.75-x)**2 if x<.75 else 0)+(100+3000*(x-max_leg)**2 if x>max_leg else 0)
 costs=[[edge(a,b) for b in range(n)] for a in range(n)]
 def cost(r):return sum(costs[a][b] for a,b in zip(r,r[1:]))
 rng=random.Random(seed);best=list(range(n));best_cost=cost(best);end=n-1 if keep_end else n
 for restart in range(12):
  route=best[:];score=cost(route)
  for step in range(18000):
   i,j=sorted(rng.sample(range(1,end),2));trial=route[:];trial[i:j+1]=reversed(trial[i:j+1]);value=cost(trial);temp=8*(1-step/18000)**3+.015
   if value<score or rng.random()<math.exp(min(0,(score-value)/temp)):route=trial;score=value
   if score<best_cost:best=route[:];best_cost=score
 result=[points[i] for i in best];legs=[distance(a,b) for a,b in zip(result,result[1:])]
 assert min(legs)>=.75-1e-6,(seed,min(legs));assert max(legs)<=max_leg,(seed,max(legs))
 return result,{'minLegKm':round(min(legs),3),'maxLegKm':round(max(legs),3),'routeKm':round(sum(legs),2),'minSeparationMetres':750}

if __name__=='__main__':
 p=root/'public/games/city-flight/cities.json';cities=json.loads(p.read_text())
 for c in cities:
  if c.get('routeVersion')==6:continue
  c['previousRouteIds']=[l['id'] for l in c['landmarks']]
  c['landmarks'],stats=order(c['landmarks'],c['id']);c.update(stats);c['routeVersion']=6
  print(c['id'],stats,flush=True)
 p.write_text(json.dumps(cities,ensure_ascii=False,indent=2)+'\n')
 p=root/'public/games/city-flight/berlin/game.js';s=p.read_text()
 if '// Spaced tour route v5:' in s:raise SystemExit(0)
 match=re.search(r'const hoopData=(\[.*?\])\.map\(p=>',s);points=json.loads(match[1]);ordered,stats=order(points,'berlin',max_leg=4.5,keep_end=True)
 s=s[:match.start(1)]+json.dumps(ordered,ensure_ascii=False)+s[match.end(1):];s=s.replace('const hoopData=[','// Spaced tour route v5: nearby sights are separated by other stops.\nconst hoopData=[');p.write_text(s);print('berlin',stats,flush=True)
