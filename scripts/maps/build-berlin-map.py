"""Build the embedded Berlin map from a Geofabrik berlin-latest.osm.pbf extract.
Run in an environment with osmium and shapely installed:
  python build-berlin-map.py INPUT.osm.pbf OUTPUT.json
Coordinates: longitude 13.38 / latitude 52.52 origin; 0.36 game units/metre.
Map data: OpenStreetMap contributors, ODbL 1.0. Heights without tags are estimated.
"""
import sys,json,math,osmium
from shapely.geometry import shape,box,Point,Polygon
from shapely.ops import transform
factory=osmium.geom.GeoJSONFactory()
SCALE=.36;X=111320*math.cos(math.radians(52.52))*SCALE;Z=111320*SCALE
# Retain the original tour and extend the connected eastern city through the
# Wuhlheide to Köpenick. Avoid loading unrelated southern suburbs.
bounds=box(13.28,52.47,13.54,52.546).union(box(13.48,52.435,13.64,52.515))
parkstadt=None
parkstadt_search=box(13.5065,52.4795,13.5133,52.4845)
parkstadt_nodes=[]
reader=osmium.io.Reader(sys.argv[1]);header=reader.header()
timestamp=header.get('osmosis_replication_timestamp');reader.close()
if not timestamp:raise ValueError('The map extract must provide its actual data timestamp')
def proj(x,y,z=None):return ((x-13.38)*X,(52.52-y)*Z)
def ring(coords):return [[round(x,1),round(y,1)] for x,y in list(coords)[:-1]]
features=[];pois={};counts={}
def poi(tags,lon,lat):
 cat=tags.get('amenity','')
 if tags.get('shop')=='mall':cat='mall'
 if cat not in ('hospital','school','university','library','fire_station','mall'):return
 name=tags.get('name')
 if name and bounds.contains(shape({'type':'Point','coordinates':[lon,lat]})):
  x,z=proj(lon,lat);pois[name]={'name':name,'type':cat,'x':round(x,1),'z':round(z,1)}
class Handler(osmium.SimpleHandler):
 def node(self,n):
  if n.location.valid():
   tags=dict(n.tags);lon,lat=n.location.lon,n.location.lat;poi(tags,lon,lat)
   if parkstadt_search.contains(Point(lon,lat)) and (tags.get('natural')=='tree' or tags.get('amenity')=='bench'):
    parkstadt_nodes.append({'id':n.id,'lon':lon,'lat':lat,'kind':'tree' if tags.get('natural')=='tree' else 'bench'})
 def way(self,w):
  global parkstadt
  t=dict(w.tags);h=t.get('highway');rail=t.get('railway');air=t.get('aeroway',t.get('abandoned:aeroway',t.get('disused:aeroway')))
  if t.get('name')=='Parkstadt Karlshorst' and t.get('place')=='neighbourhood':
   from shapely.geometry import Polygon
   parkstadt=Polygon([(n.lon,n.lat) for n in w.nodes])
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
   f={'k':kind,'p':[[round(x,1),round(y,1)] for x,y in line.coords],'w':18 if kind=='runway' else width,'bridge':t.get('bridge','no') not in ('no','')}
   if t.get('name'):f['n']=t['name']
   if t.get('lane_markings')=='no':f['noMarkings']=True
   if rail=='rail':f['service']=t.get('service');f['usage']=t.get('usage')
   features.append(f)
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
    height_source='height'
    try:height=float(t.get('height','').split()[0])*.36
    except:
     height_source='levels'
     try:height=float(t.get('building:levels',''))*3.2*.36
     except:
      height_source='estimated'
      height={'garage':1.4,'garages':1.4,'house':3.2,'detached':3.2,'church':14,'school':7,'hospital':12,'commercial':8,'retail':5,'industrial':5}.get(t.get('building'),7+int(a.orig_id())%6)
    f['h']=round(max(1,min(150,height)),1);f['c']=int(a.orig_id())%8
    f['id']=int(a.orig_id());f['heightSource']=height_source
    if t.get('roof:shape')=='flat':f['roofStyle']=0
    if parkstadt_search.covers(c):
     f['tags']={key:value for key,value in t.items() if key.startswith(('building','roof','addr:')) or key in ('height','start_date','name')}
    if t.get('name'):f['n']=t['name']
    cat=t.get('amenity',t.get('shop',t.get('building')))
    if cat in ('hospital','school','mall','university','train_station'):f['cat']=cat
   elif k=='park':
    f['pitch']=t.get('leisure')=='pitch'
    if t.get('name'):f['n']=t['name']
   features.append(f)
h=Handler();h.apply_file(sys.argv[1],locations=True,idx='flex_mem')
from collections import Counter
result={'source':'OpenStreetMap contributors / Geofabrik, '+timestamp,'dataTimestamp':timestamp,'sourceUrl':'https://download.geofabrik.de/europe/germany/berlin.html','bounds':list(bounds.bounds),'coverage':[[round(x,7),round(y,7)] for x,y in list(bounds.exterior.coords)[:-1]],'origin':[13.38,52.52],'scale':.36,'features':features,'pois':list(pois.values())}
if parkstadt is not None:
 district=transform(proj,parkstadt)
 for f in features:
  if f['k']!='building' or 'tags' not in f:continue
  poly=Polygon(f['p'],f.get('holes',[]))
  if not district.covers(poly.centroid):del f['tags'];continue
  f['district']='parkstadt'
  if f['tags'].get('building')=='apartments':
   # Storeys from OSM; missing tags use a clearly marked district estimate.
   f['floors']=int(f['tags'].get('building:levels','5'))
   if f['heightSource']=='estimated':f['h']=round(f['floors']*3.2*SCALE,1)
   f['roofStyle']=0
   # An authored setback, inferred from the architects' completed-building
   # photographs. This is not a surveyed roof outline.
   inset=poly.buffer(-.72,join_style=2)
   polys=[inset] if inset.geom_type=='Polygon' else list(getattr(inset,'geoms',[]))
   f['setbacks']=[{'p':ring(p.exterior.coords),'holes':[ring(r.coords) for r in p.interiors]} for p in polys if not p.is_empty and p.area>2]
 nodes=[]
 for n in parkstadt_nodes:
  if parkstadt.covers(Point(n['lon'],n['lat'])):
   x,z=proj(n['lon'],n['lat']);nodes.append({'id':n['id'],'x':round(x,1),'z':round(z,1),'kind':n['kind']})
 result['parkstadt']={'p':ring(district.exterior.coords),'osmWay':1445246996,'nodes':nodes,'roofDetailSource':'Authored setbacks based on ENS Architekten and PORR project photographs; not surveyed roof geometry.'}
open(sys.argv[2],'w').write(json.dumps(result,ensure_ascii=False,separators=(',',':')))
print(Counter(f['k'] for f in features),'POIs',len(pois),flush=True)
