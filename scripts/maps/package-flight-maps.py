import json,gzip,zipfile,pathlib,shapefile,math
from shapely.geometry import shape,box,Polygon,mapping
from shapely.ops import unary_union,transform
import argparse
parser=argparse.ArgumentParser(description='Package compact city maps with OSM coastline water.')
parser.add_argument('cache',help='Directory containing <city>-map.json files')
parser.add_argument('coast',help='Path to land_polygons.shp')
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[2];cache=pathlib.Path(args.cache)
r=shapefile.Reader(args.coast)
cities=json.loads((root/'public/games/city-flight/cities.json').read_text())
for c in cities:
 data=json.loads((cache/(c['id']+'-map.json')).read_text());bounds=c['bounds'];clip=box(*bounds)
 land=[shape(s.__geo_interface__).intersection(clip) for s in r.iterShapes(bbox=bounds)]
 sea=clip.difference(unary_union(land));lon,lat=c['origin'];sx=111320*math.cos(lat*math.pi/180)*.36;sz=111320*.36
 sea=transform(lambda x,y:((x-lon)*sx,(lat-y)*sz),sea)
 waters=[Polygon(f['p'],f.get('holes',[])).buffer(0) for f in data['features'] if f['k']=='water']
 water=unary_union([sea,*waters]).simplify(.18,preserve_topology=True)
 features=[f for f in data['features'] if f['k']!='water']
 for p in ([water] if water.geom_type=='Polygon' else getattr(water,'geoms',[])):
  if p.geom_type!='Polygon' or p.area<.1:continue
  f={'k':'water','p':[[round(x,2),round(y,2)] for x,y in list(p.exterior.coords)[:-1]]}
  holes=[[[round(x,2),round(y,2)] for x,y in list(h.coords)[:-1]] for h in p.interiors]
  if holes:f['holes']=holes
  features.append(f)
 data['features']=features;payload=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0)
 (root/'public/games/city-flight/data'/f"{c['id']}.bin").write_bytes(payload);c['mapBytes']=len(payload);c['buildings']=sum(f['k']=='building' for f in features)
 print(c['id'],len(payload),'water',len(features)-len([f for f in features if f['k']!='water']),flush=True)
(root/'public/games/city-flight/cities.json').write_text(json.dumps(cities,ensure_ascii=False,indent=2)+'\n')
