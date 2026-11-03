"""Package a Dubai extract with its snapshot of OSM coastlines built with build-flight-city.py.
Usage: python scripts/maps/package-dubai.py DUBAI-map.json
Requires shapely. The raw extract may be larger than dubai.json's final bounds.
All output coordinates are projected at .36 units/metre, as in the importer.
"""
import gzip,json,math,pathlib,sys
from shapely.geometry import Polygon,LineString,box
from shapely.ops import unary_union,polygonize,transform
root=pathlib.Path(__file__).resolve().parents[2]
config=json.loads((root/'scripts/maps/dubai.json').read_text())
data=json.loads(pathlib.Path(sys.argv[1]).read_text());lon,lat=config['origin'];sx=111320*math.cos(math.radians(lat))*.36;sz=111320*.36
west,south,east,north=config['bounds'];clip=box((west-lon)*sx,(lat-north)*sz,(east-lon)*sx,(lat-south)*sz)
features=[];waters=[]
def ring(r):return [[round(x,2),round(z,2)] for x,z in list(r.coords)[:-1]]
for f in data['features']:
 line=f['k'] in ('road','rail','runway');g=LineString(f['p']) if line else Polygon(f['p'],f.get('holes',[]))
 if not g.is_valid:g=g.buffer(0)
 if not g.intersects(clip):continue
 g=g.intersection(clip)
 if f['k']=='water':waters.append(g);continue
 for part in ([g] if g.geom_type in ('Polygon','LineString') else getattr(g,'geoms',[])):
  if line and part.geom_type=='LineString':n={**f,'p':[[round(x,2),round(z,2)] for x,z in part.coords]}
  elif not line and part.geom_type=='Polygon' and part.area>1:
   n={**f,'p':ring(part.exterior)};n.pop('holes',None)
   if part.interiors:n['holes']=[ring(h) for h in part.interiors]
  else:continue
  features.append(n)
# Coastline direction is authoritative: water is on the right in lon/lat.
# Keep this snapshot alongside the city config so rebuilds are reproducible.
coast=json.loads((root/'scripts/maps/dubai-coast.json').read_text())['lines'];geo_clip=box(*config['bounds']);segments=[]
for points in coast:
 for a,b in zip(points,points[1:]):
  if a!=b:segments.append((LineString([a,b]),a,b))
network=unary_union([geo_clip.boundary,*[LineString(p).intersection(geo_clip) for p in coast]])
for area in polygonize(network):
 q=area.representative_point();line,a,b=min(segments,key=lambda s:s[0].distance(q))
 if (b[0]-a[0])*(q.y-a[1])-(b[1]-a[1])*(q.x-a[0])<0:
  waters.append(transform(lambda x,y:((x-lon)*sx,(lat-y)*sz),area))
water=unary_union(waters).simplify(.18,preserve_topology=True)
for part in ([water] if water.geom_type=='Polygon' else getattr(water,'geoms',[])):
 if part.geom_type!='Polygon' or part.area<.1:continue
 f={'k':'water','p':ring(part.exterior)}
 if part.interiors:f['holes']=[ring(h) for h in part.interiors]
 features.append(f)
data.update(bounds=config['bounds'],features=features,pois=[p for p in data['pois'] if clip.bounds[0]<=p['x']<=clip.bounds[2] and clip.bounds[1]<=p['z']<=clip.bounds[3]])
payload=gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),mtime=0)
(root/'public/games/city-flight/data/dubai.bin').write_bytes(payload)
p=root/'public/games/city-flight/cities.json';cities=json.loads(p.read_text());city=next(c for c in cities if c['id']=='dubai');city.update(mapBytes=len(payload),buildings=sum(f['k']=='building' for f in features));p.write_text(json.dumps(cities,ensure_ascii=False,indent=2)+'\n')
print(city['buildings'],'buildings;',len(payload),'bytes;',len([f for f in features if f['k']=='water']),'water polygons')
