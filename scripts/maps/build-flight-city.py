"""Build a compact city map from a clipped OpenStreetMap PBF extract.
Run in an environment with osmium and shapely installed:
  python build-flight-city.py INPUT.osm.pbf OUTPUT.json CITY_CONFIG.json
Origin and bounds come from CITY_CONFIG.json; 0.36 game units/metre.
Map data: OpenStreetMap contributors, ODbL 1.0. Heights without tags are estimated.
"""
import sys,json,math,osmium
from shapely.geometry import shape,box
from shapely.ops import transform
factory=osmium.geom.GeoJSONFactory()
config=json.load(open(sys.argv[3]));origin_lon,origin_lat=config["origin"]
SCALE=.36;X=111320*math.cos(math.radians(origin_lat))*SCALE;Z=111320*SCALE
bounds=box(*config["bounds"])
def proj(x,y,z=None):return ((x-origin_lon)*X,(origin_lat-y)*Z)
def ring(coords):return [[round(x,1),round(y,1)] for x,y in list(coords)[:-1]]
features=[];pois={};counts={}
def poi(tags,lon,lat):
 cat=tags.get('amenity','')
 if tags.get('shop')=='mall':cat='mall'
 if cat not in ('hospital','university','library','fire_station','mall'):return
 name=tags.get('name')
 if name and bounds.contains(shape({'type':'Point','coordinates':[lon,lat]})):
  x,z=proj(lon,lat);pois[name]={'name':name,'type':cat,'x':round(x,1),'z':round(z,1)}
class Handler(osmium.SimpleHandler):
 def node(self,n):
  if n.location.valid():poi(dict(n.tags),n.location.lon,n.location.lat)
 def way(self,w):
  t=dict(w.tags);h=t.get('highway');rail=t.get('railway');air=t.get('aeroway',t.get('abandoned:aeroway',t.get('disused:aeroway')))
  if h not in ('primary','secondary','tertiary','residential','living_street','pedestrian','service','unclassified','trunk','motorway','footway','path') and rail!='rail' and air!='runway':return
  if t.get('tunnel')=='yes':return
  try:g=shape(json.loads(factory.create_linestring(w)))
  except:return
  if not g.intersects(bounds):return
  g=transform(proj,g.intersection(bounds)).simplify(.35)
  for line in ([g] if g.geom_type=='LineString' else getattr(g,'geoms',[])):
   if line.geom_type!='LineString' or line.length<2:continue
   width={'primary':6,'secondary':5,'tertiary':4.2,'residential':3.5,'service':2,'footway':.9,'path':.7,'pedestrian':4,'motorway':7,'trunk':6}.get(h,3)
   kind='rail' if rail=='rail' else 'runway' if air=='runway' else 'road'
   features.append({'k':kind,'p':[[round(x,1),round(y,1)] for x,y in line.coords],'w':18 if kind=='runway' else width,'bridge':t.get('bridge')=='yes'})
 def area(self,a):
  t=dict(a.tags)
  k='building' if 'building' in t and t['building'] not in ('no','roof') else 'water' if t.get('natural')=='water' or t.get('waterway')=='riverbank' else 'park' if t.get('leisure') in ('park','garden','pitch','nature_reserve') or t.get('landuse') in ('forest','grass','recreation_ground','village_green','cemetery') or t.get('natural') in ('wood','grassland') else None
  if not k and not (t.get('amenity') or t.get('shop')):return
  try:g=shape(json.loads(factory.create_multipolygon(a)))
  except:return
  if not g.is_valid:g=g.buffer(0)
  if not g.intersects(bounds):return
  c=g.centroid;poi(t,c.x,c.y)
  if not k:return
  g=transform(proj,g.intersection(bounds)).simplify(.25,preserve_topology=True)
  polys=[g] if g.geom_type=='Polygon' else getattr(g,'geoms',[])
  for poly in polys:
   if poly.geom_type!='Polygon' or poly.area<(3 if k=='building' else 5):continue
   f={'k':k,'p':ring(poly.exterior.coords)}
   holes=[ring(r.coords) for r in poly.interiors]
   if holes:f['holes']=holes
   if k=='building':
    try:height=float(t.get('height','').split()[0])*.36
    except:
     try:height=float(t.get('building:levels',''))*3.2*.36
     except:height={'garage':1.4,'garages':1.4,'house':3.2,'detached':3.2,'church':14,'school':7,'hospital':12,'commercial':8,'retail':5,'industrial':5}.get(t.get('building'),7+int(a.orig_id())%6)
    f['h']=round(max(1,min(150,height)),1);f['c']=int(a.orig_id())%8
    if t.get('name'):f['n']=t['name']
    cat=t.get('amenity',t.get('shop',t.get('building')))
    if cat in ('hospital','school','mall','university','train_station'):f['cat']=cat
   elif k=='park':f['pitch']=t.get('leisure')=='pitch';f['trees']=t.get('landuse')=='forest' or t.get('natural')=='wood' or t.get('leisure') in ('park','garden');f['name']=t.get('name','')
   features.append(f)
h=Handler();h.apply_file(sys.argv[1],locations=True,idx='flex_mem')
from collections import Counter
result={'source':'OpenStreetMap contributors / BBBike / Geofabrik, 2026-10-24','bounds':config['bounds'],'origin':config['origin'],'city':config['id'],'scale':.36,'features':features,'pois':list(pois.values())}
open(sys.argv[2],'w').write(json.dumps(result,ensure_ascii=False,separators=(',',':')))
print(Counter(f['k'] for f in features),'POIs',len(pois),flush=True)
