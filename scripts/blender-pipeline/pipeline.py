"""Blender background worker. Inputs: *.mesh.json, *.fbx, *.glb, *.obj.
Run via run.py. Original files are never modified. Output units are metres.
"""
import argparse,json,sys,math
from pathlib import Path
from contextlib import contextmanager
import bpy
import bmesh
sys.path.insert(0,str(Path(__file__).resolve().parent))
from furniture_materials import container_color, load_rules, classify, board_axes, project, audit_mesh, linear_color, resolved_spec, face_policy, studio_spec, countertop_candidate, countertop_uv
from mathutils import Vector, Matrix
from bounds_policy import transform_rows, bounds_changed, keep_geometry

@contextmanager
def stage(name, objects=None):
 print('STAGE: '+name+' BEGIN',flush=True)
 try:
  yield
 except BaseException:
  print('STAGE: '+name+' ERROR',flush=True)
  raise
 else:
  print('STAGE: '+name+' END',flush=True)
  if objects is not None:geometry_stage(name,objects)

# Coordinates are world metres after import normalization; reports use mm.
STAGE_METRICS=[]
LAST_METRICS={}
WELD_METRES=1e-7  # 0.0001 mm; previous 0.001 mm was already below 0.01 mm.
DEGENERATE_AREA=1e-18  # m^2: remove numerical zero, never merely slender faces.

def geometry_stage(name,objects):
 for o in objects:
  points=[o.matrix_world@v.co for v in o.data.vertices]
  if not points:raise ValueError(o.name+': empty mesh at '+name)
  if any(not math.isfinite(c) for p in points for c in p):raise ValueError(o.name+': non-finite geometry')
  bounds=[[min(p[i] for p in points)*1000 for i in range(3)],
          [max(p[i] for p in points)*1000 for i in range(3)]]
  longest=max(((points[e.vertices[0]]-points[e.vertices[1]]).length*1000 for e in o.data.edges),default=0)
  width=bounds[1][0]-bounds[0][0]
  previous=LAST_METRICS.get(o.name)
  flags=[]
  if previous:
   if width-previous['width_x_mm']>0.1:flags.append('WIDTH_GROWTH')
   if longest>max(previous['max_edge_mm']*1.5,previous['max_edge_mm']+10):flags.append('EDGE_GROWTH')
  record={'stage':name,'object':o.name,'width_x_mm':width,'max_edge_mm':longest,
          'bounds_mm':bounds,'vertices':len(points),'faces':len(o.data.polygons),'flags':flags}
  STAGE_METRICS.append(record);LAST_METRICS[o.name]=record
  print('STAGE: GEOMETRY '+json.dumps(record,ensure_ascii=False),flush=True)

def fragile_face(face):
 longest=max((e.calc_length() for e in face.edges),default=0)
 area=face.calc_area()
 # 0.01 mm^2, or approximate longest-edge / altitude > 100.
 return area<1e-8 or (longest>0 and 2*area/(longest*longest)<.01)

def protected_vertices(bm):
 protected={v for e in bm.edges if not e.is_manifold for v in e.verts}
 protected.update(v for f in bm.faces if fragile_face(f) for v in f.verts)
 return protected

def clean_degenerate(o):
 o.data.validate(clean_customdata=False);o.data.update()
 bm=bmesh.new()
 try:
  bm.from_mesh(o.data)
  bad=[f for f in bm.faces if f.calc_area()<=DEGENERATE_AREA]
  bmesh.ops.delete(bm,geom=bad,context='FACES_ONLY')
  # Loose remnants of zero-area faces must not enter collapse.
  loose=[e for e in bm.edges if not e.link_faces]
  bmesh.ops.delete(bm,geom=loose,context='EDGES')
  isolated=[v for v in bm.verts if not v.link_edges]
  bmesh.ops.delete(bm,geom=isolated,context='VERTS')
  print(f'STAGE: CLEAN {o.name} zero_area_faces={len(bad)} loose_edges={len(loose)}',flush=True)
  bm.to_mesh(o.data)
 finally:bm.free()
 o.data.validate(clean_customdata=False);o.data.update()

def safe_dissolve(o):
 bm=bmesh.new()
 try:
  bm.from_mesh(o.data)
  protected=protected_vertices(bm)
  edges=[e for e in bm.edges if e.is_manifold and not any(v in protected for v in e.verts)]
  verts=[v for v in bm.verts if v not in protected]
  # Do not dissolve any edge touching a thin face or an open/nonmanifold boundary.
  bmesh.ops.dissolve_limit(bm,angle_limit=math.radians(.02),use_dissolve_boundaries=False,
                          verts=verts,edges=edges,delimit={'NORMAL','UV','MATERIAL','SHARP'})
  bm.to_mesh(o.data)
 finally:bm.free()
 o.data.update()

def boundary_group(o):
 bm=bmesh.new()
 try:
  bm.from_mesh(o.data);bm.verts.ensure_lookup_table();bm.verts.index_update()
  protected={v.index for v in protected_vertices(bm)}
 finally:bm.free()
 group=o.vertex_groups.new(name='ReductionInterior')
 # Blender collapse excludes edges with either endpoint weight == 0.
 # Explicit zeros also cover closed-mesh sliver faces, not only open boundaries.
 indices=list(range(len(o.data.vertices)))
 if indices:group.add(indices,0.0,'REPLACE')
 interior=[i for i in indices if i not in protected]
 if interior:group.add(interior,1.0,'REPLACE')
 frozen={tuple(o.data.vertices[i].co) for i in protected}
 print(f'STAGE: PROTECT {o.name} fixed_vertices={len(protected)} interior_vertices={len(interior)}',flush=True)
 return group,frozen

def verify_fixed(o,frozen):
 # Collapse must retain the protected coordinates, not just the outer bounds.
 remaining={tuple(v.co) for v in o.data.vertices}
 missing=frozen-remaining
 if missing:raise RuntimeError(f'{o.name}: {len(missing)} protected coordinates changed; refusing export')

class ReductionRejected(RuntimeError):
 pass

def object_bounds_mm(o):
 points=[o.matrix_world@v.co for v in o.data.vertices]
 if not points:return None
 return [[min(p[i] for p in points)*1000 for i in range(3)],
         [max(p[i] for p in points)*1000 for i in range(3)]]

def load_texture(path):
 with stage('texture load '+str(path)):
  im=bpy.data.images.load(str(Path(path).resolve()),check_existing=True)
 with stage('texture pack '+str(path)):
  im.pack()
 return im

def args():
 p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--texture',required=True);p.add_argument('--ratio',type=float,default=.6);p.add_argument('--units',choices=['mm','m'],default='mm');p.add_argument('--samples',type=int,default=64);p.add_argument('--tile-mm',type=float,nargs=2,default=[300,900]);p.add_argument('--mode',choices=['floor','furniture-draft'],default='floor');p.add_argument('--face-texture');p.add_argument('--edge-texture')
 p.add_argument('--finish',choices=['birch','hexa'],default='birch')
 p.add_argument('--hexa-source')
 p.add_argument('--countertop-definition')
 p.add_argument('--container-color', type=container_color, help='Container and lid colour: #RRGGBB')
 p.add_argument('--face-source',choices=['studio','tetsuya'],default='studio')
 p.add_argument('--natural-face-texture');p.add_argument('--raw-face-texture');p.add_argument('--fabric-texture')
 p.add_argument('--ao-atlas-size',type=int,choices=[2048,4096],default=2048)
 p.add_argument('--ao-mode',choices=['plain','packed','lowres','gpu-off','none'],default='plain')
 p.add_argument('--skip-ao',action='store_true');p.add_argument('--skip-export',action='store_true')
 a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
 if any(not math.isfinite(v) or v<=0 for v in a.tile_mm) or not 0<a.ratio<=1:p.error('Invalid tile size or ratio')
 if a.samples<1:p.error('samples must be positive')
 if a.mode=='furniture-draft' and not (a.face_texture and a.edge_texture and a.natural_face_texture and a.raw_face_texture and a.fabric_texture):p.error('Furniture draft needs prepared face, edge and fabric textures; use run.py')
 if a.mode=='furniture-draft' and a.finish=='hexa' and not a.hexa_source:p.error('Hexa needs --hexa-source')
 return a

def custom(source):
 import struct
 data=json.loads(source.read_text());buf=(source.parent/data['binary']).read_bytes()
 def read(part,key,width):
  offset,count=part[key];values=struct.unpack_from('<'+('I' if key=='index' else 'f')*count,buf,offset)
  return [values[i:i+width] for i in range(0,len(values),width)]
 for body_index,body in enumerate(data['bodies']):
  for i,part in enumerate(body['parts']):
   mesh=bpy.data.meshes.new(body['name']);mesh.from_pydata(read(part,'position',3),[],read(part,'index',3));mesh.update()
   obj=bpy.data.objects.new(body['name']+'_'+str(i),mesh);bpy.context.collection.objects.link(obj)
   obj.matrix_world=Matrix(transform_rows(body.get('transform')))
   obj['source_body_index']=body_index;obj['source_part_index']=i
   obj['source_path']=body.get('path','');obj['source_body_name']=body['name'];obj['source_material']=part['material'];obj['source_role']=body.get('role','');obj['source_bounds_mm']=json.dumps(body['bounds'])
   uv=read(part,'uv',2);layer=mesh.uv_layers.new(name='UVMap0')
   for loop in mesh.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
   normals=read(part,'normal',3);mesh.normals_split_custom_set_from_vertices(normals)
 return data

def planar_uv(o, tile_mm, furniture=False):
 # Reacquire all data after topology changes / edit-mode round trips.
 # Never retain RNA layer/loop references while writing mesh custom data.
 mesh=o.data
 mesh.validate(clean_customdata=False)
 mesh.update()
 if mesh.uv_layers.get('UVMap0') is None:mesh.uv_layers.new(name='UVMap0')
 normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
 points=[tuple(o.matrix_world@v.co) for v in mesh.vertices]
 vertex_indices=[int(loop.vertex_index) for loop in mesh.loops]
 faces=[(tuple((normal_matrix@face.normal).normalized()),tuple(face.loop_indices)) for face in mesh.polygons]
 uv=[0.0]*(2*len(vertex_indices));materials=[]
 for normal,indices in faces:
  edge=furniture and abs(normal[2])<.7
  materials.append(1 if edge else 0)
  for index in indices:
   if not 0<=index<len(vertex_indices):raise ValueError(f'{o.name}: invalid loop {index}')
   vertex=vertex_indices[index]
   if not 0<=vertex<len(points):raise ValueError(f'{o.name}: invalid vertex {vertex} at loop {index}')
   x,y,z=points[vertex]
   if edge:
    across=y if abs(normal[0])>abs(normal[1]) else x
    value=(across/.3,z/.015)
   elif furniture:value=(x/1.22,y/2.44)
   else:value=(x*1000/tile_mm[0],y*1000/tile_mm[1])
   uv[2*index:2*index+2]=value
 # Bulk writes occur only after the snapshot, so writes cannot stale read handles.
 mesh.polygons.foreach_set('material_index',materials)
 mesh.uv_layers['UVMap0'].data.foreach_set('uv',uv)
 mesh.update()


def material(o, texture, ao, resin=False, spec=None):
 mat=bpy.data.materials.new(o.name);mat.use_nodes=True
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
 bsdf.inputs['Roughness'].default_value=.94
 bsdf.inputs['Base Color'].default_value=(.0185,.0185,.023,1) if resin else (1,1,1,1)
 if spec:
  bsdf.inputs['Roughness'].default_value=spec['roughness']
  bsdf.inputs['Metallic'].default_value=spec['metalness']
  bsdf.inputs['Base Color'].default_value=spec.get('color_linear',linear_color(spec['color']))
 if not resin and texture is not None:
  tex=nodes.new('ShaderNodeTexImage');tex.image=texture;tex.extension='REPEAT' if spec and spec.get('repeat') else 'MIRROR'
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='UVMap0'
  links.new(uv.outputs['UV'],tex.inputs['Vector']);links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 if ao is None or (spec and spec.get('ao_constant') == 1):return mat
 bake=nodes.new('ShaderNodeTexImage');bake.image=ao;nodes.active=bake
 group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
 group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 g=nodes.new('ShaderNodeGroup');g.node_tree=group
 uv=nodes.new('ShaderNodeUVMap');uv.uv_map='AO'
 links.new(uv.outputs['UV'],bake.inputs['Vector']);links.new(bake.outputs['Color'],g.inputs['Occlusion'])
 return mat


def furniture_uv(o, axes, rules, finish, plywood, origin=(0,0,0), preserve_face=False):
 mesh=o.data;mesh.update()
 uv=[0.0]*(2*len(mesh.loops));indices=[]
 mesh.uv_layers['UVMap0'].data.foreach_get('uv',uv)
 # Local axes follow each body, including rotated imported objects. Scale was applied.
 for face in mesh.polygons:
  index=0
  for loop in face.loop_indices:
   point=tuple(mesh.vertices[mesh.loops[loop].vertex_index].co[i]-origin[i] for i in range(3))
   if plywood:
    index,value=project(point,tuple(face.normal),axes,rules['mapping'],finish)
    if not (preserve_face and index==0):uv[2*loop:2*loop+2]=value
   # Cloth and other source UVs must survive; (0,0) erased the weave before.
  indices.append(index)
 mesh.polygons.foreach_set('material_index',indices)
 mesh.uv_layers['UVMap0'].data.foreach_set('uv',uv)
 mesh.update()


def apply_countertop(o, slot, bounds, tile_mm):
 # Exact studio upper-surface rule in source Y-up coordinates; keep cut edges.
 mesh=o.data;mesh.update()
 normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
 uv=[0.0]*(2*len(mesh.loops));mesh.uv_layers['UVMap0'].data.foreach_get('uv',uv)
 normals=[(normal_matrix@n.vector).normalized().z for n in mesh.corner_normals]
 count=0
 for face in mesh.polygons:
  if not all(normals[i] > .8 for i in face.loop_indices):continue
  face.material_index=slot;count+=1
  for i in face.loop_indices:
   p=o.matrix_world@mesh.vertices[mesh.loops[i].vertex_index].co
   uv[2*i:2*i+2]=countertop_uv((p.x*1000,p.z*1000,-p.y*1000),bounds,tile_mm)
 mesh.uv_layers['UVMap0'].data.foreach_set('uv',uv)
 mesh.update()
 return count


def ao_settings(a):
 mode='none' if a.skip_ao else a.ao_mode
 size=getattr(a,'ao_atlas_size',2048) if getattr(a,'mode','floor')=='furniture-draft' else (512 if mode=='lowres' else 1024)
 return {'mode':mode,'size':size,
         'samples':max(128,a.samples) if getattr(a,'mode','floor')=='furniture-draft' else (4 if mode=='lowres' else a.samples),
         'margin':32 if getattr(a,'mode','floor')=='furniture-draft' else (2 if mode=='lowres' else 8)}

def plain_material(ao=None):
 mat=bpy.data.materials.new('AO temporary white');mat.use_nodes=True
 nodes=mat.node_tree.nodes;nodes.clear()
 diffuse=nodes.new('ShaderNodeBsdfDiffuse');diffuse.inputs['Color'].default_value=(1,1,1,1)
 output=nodes.new('ShaderNodeOutputMaterial')
 mat.node_tree.links.new(diffuse.outputs['BSDF'],output.inputs['Surface'])
 if ao is not None:
  # The sole image node is the generated bake destination, not a source texture.
  target=nodes.new('ShaderNodeTexImage');target.image=ao
  for node in nodes:node.select=False
  target.select=True;nodes.active=target
 return mat

@contextmanager
def plain_bake_materials(o,ao):
 saved=[];temporary=[]
 try:
  with stage('AO mode plain materials swap '+o.name):
   target=plain_material(ao);temporary.append(target)
   white=plain_material();temporary.append(white)
   # Cycles can inspect other objects too. Replace every scene material slot.
   # Keep slot counts and polygon material indices unchanged.
   for obj in bpy.context.scene.objects:
    for slot in obj.material_slots:
     saved.append((slot,slot.material))
     slot.material=target if obj==o else white
   bpy.context.view_layer.update()
  yield
 finally:
  with stage('AO mode plain materials restore '+o.name):
   for slot,original in reversed(saved):slot.material=original
   bpy.context.view_layer.update()
   for mat in temporary:bpy.data.materials.remove(mat)

def bake_ao(o,ao,settings):
 mode=settings['mode'];scene=bpy.context.scene
 with stage('AO mode '+mode+' configure '+o.name):
  scene.render.engine='CYCLES';scene.cycles.device='CPU'
  scene.cycles.samples=settings['samples'];scene.render.bake.margin=settings['margin']
  if mode=='gpu-off':
   bpy.context.preferences.addons['cycles'].preferences.compute_device_type='NONE'
   scene.cycles.use_denoising=False
   scene.cycles.use_auto_tile=True;scene.cycles.tile_size=64
   print('STAGE: AO mode gpu-off device=CPU compute_device_type=NONE denoising=False tile_size=64',flush=True)
  print('STAGE: AO settings '+json.dumps(settings),flush=True)
 if mode=='packed':
  with stage('AO mode packed images '+o.name):
   for im in list(bpy.data.images):
    with stage('AO mode packed image '+im.name):im.pack()
 def bake():
  with stage('AO bake '+o.name+' mode='+mode):
   bpy.ops.object.bake(type='AO',margin=settings['margin'],use_clear=not settings.get('white_background',False))
 if mode=='plain':
  with plain_bake_materials(o,ao):bake()
 else:bake()


def tag_atlas_parts(objects):
 identities=[]
 for index,obj in enumerate(objects):
  identities.append((obj.name,dict(obj.items())))
  tag=obj.data.attributes.new(name='source_part_tag',type='INT',domain='FACE')
  tag.data.foreach_set('value',[index]*len(obj.data.polygons))
 return identities

def restore_atlas_parts(o,identities):
 result=[]
 for index,(name,extras) in enumerate(identities):
  mesh=o.data.copy();bm=bmesh.new()
  try:
   bm.from_mesh(mesh);tag=bm.faces.layers.int.get('source_part_tag')
   if tag is None:raise RuntimeError('Atlas lost body identity')
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f[tag]!=index],context='FACES')
   bm.to_mesh(mesh)
  finally:bm.free()
  if not mesh.polygons:raise RuntimeError('Atlas lost source part '+name)
  mesh.attributes.remove(mesh.attributes['source_part_tag'])
  obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
  obj.matrix_world=o.matrix_world.copy()
  for key,value in extras.items():obj[key]=value
  result.append(obj)
 bpy.data.objects.remove(o,do_unlink=True)
 return result

def finish_ao_pixels(ao):
 # AO is Non-Color; remap once after baking, before PNG packing/export.
 import numpy as np
 pixels=np.empty(len(ao.pixels),dtype=np.float32)
 ao.pixels.foreach_get(pixels)
 rgba=pixels.reshape((-1,4))
 rgba[:,:3]=.92+.08*np.clip(rgba[:,:3],0,1)
 rgba[:,3]=1
 ao.pixels.foreach_set(pixels);ao.update()


def body_projection_frames(objects):
 # Aggregate all material parts of each body. Coordinates are local metres after
 # scale application, so rotations and material-slot splitting cannot shift grain.
 groups={}
 for o in objects:
  key=o.get('source_body_index',o.name)
  scale=o.matrix_world.to_scale()
  points=[tuple(v.co[i]*scale[i] for i in range(3)) for v in o.data.vertices]
  groups.setdefault(key,[]).extend(points)
 frames={}
 for key,points in groups.items():
  bounds=[[min(v[i] for v in points) for i in range(3)],
          [max(v[i] for v in points) for i in range(3)]]
  frames[key]=(board_axes(bounds),tuple(bounds[0]),bounds)
 return frames


def furniture_atlas(objects,ao,settings,out):
 # One source file is one furniture item. Join only after per-body reduction
 # and UV0/material assignment, retaining material slots and world positions.
 if not objects:raise ValueError('Furniture input contains no meshes')
 identities=tag_atlas_parts(objects)
 with stage('furniture atlas join'):
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]
  if len(objects)>1:bpy.ops.object.join()
  o=bpy.context.view_layer.objects.active
  o.name='Furniture AO atlas'
 with stage('furniture atlas UV1 Smart UV', [o]):
  o.data.uv_layers.new(name='AO')
  o.data.uv_layers.active=o.data.uv_layers['AO']
  o.data.uv_layers['AO'].active_render=True
  bpy.ops.object.mode_set(mode='EDIT')
  try:
   bpy.ops.mesh.select_all(action='SELECT')
   # FRACTION gives a pixel-derived gap after packing all bodies together.
   bpy.ops.uv.smart_project(angle_limit=math.radians(66),margin_method='FRACTION',
                            island_margin=(2*settings['margin']+2)/settings['size'])
  finally:bpy.ops.object.mode_set(mode='OBJECT')
 if ao is not None:
  settings=dict(settings,white_background=True)
  bake_ao(o,ao,settings)
  finish_ao_pixels(ao)
  with stage('furniture atlas PNG save'):
   ao.filepath_raw=str(out/'furniture-ao.png');ao.file_format='PNG'
   ao.save()
   # Generated non-float, alpha-free image must stay 8-bit RGB/grayscale.
   import struct
   header=Path(ao.filepath_raw).read_bytes()[:29]
   width,height,depth,kind=struct.unpack('>IIBB',header[16:26])
   if header[:8]!=b'\x89PNG\r\n\x1a\n' or depth!=8 or kind not in (0,2):
    raise RuntimeError('Atlas must be an 8-bit grayscale or RGB PNG')
   if (width,height)!=(settings['size'],settings['size']):raise RuntimeError('Wrong atlas size')
   ao.pack()
 else:print('STAGE: furniture atlas AO bake/save SKIP',flush=True)
 grain=o.data.uv_layers['UVMap0'];o.data.uv_layers.active=grain;grain.active_render=True
 o.select_set(False)
 return restore_atlas_parts(o,identities)



def run(a,source):
 STAGE_METRICS.clear();LAST_METRICS.clear()
 settings=ao_settings(a)
 print('STAGE: AO mode '+settings['mode']+' SELECTED requested='+a.ao_mode+' skip_ao='+str(a.skip_ao),flush=True)
 with stage('reset'):
  bpy.ops.wm.read_factory_settings(use_empty=True)
 out=Path(a.output)/source.name.replace('.mesh.json','').replace(source.suffix,'');out.mkdir(parents=True,exist_ok=False)
 with stage('read '+source.name):
  if source.name.endswith('.mesh.json'):meta=custom(source)
  elif source.suffix.lower()=='.fbx':bpy.ops.import_scene.fbx(filepath=str(source));meta={}
  elif source.suffix.lower()=='.glb':bpy.ops.import_scene.gltf(filepath=str(source));meta={}
  elif source.suffix.lower()=='.obj':bpy.ops.wm.obj_import(filepath=str(source));meta={}
  else:raise ValueError(source)
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
 # FBX importer converts declared units to metres; do not multiply a second time.
 with stage('scale and axis conversion'):
  scale=.001 if source.name.endswith('.mesh.json') or (source.suffix.lower()=='.obj' and a.units=='mm') else 1
  for o in objects:
   o.matrix_world=__import__('mathutils').Matrix.Scale(scale,4)@o.matrix_world
   if source.name.endswith('.mesh.json'):
    o.matrix_world=__import__('mathutils').Matrix.Rotation(math.pi/2,4,'X')@o.matrix_world
 geometry_stage('normalized input',objects)
 if 'bodies' in meta:
  for index,body in enumerate(meta['bodies']):
   parts=[o for o in objects if o.get('source_body_index')==index]
   if not parts:raise RuntimeError('Missing source body '+str(index))
   points=[o.matrix_world@v.co for o in parts for v in o.data.vertices]
   y_up=[(p.x*1000,p.z*1000,-p.y*1000) for p in points]
   actual=[[min(p[i] for p in y_up) for i in range(3)],
           [max(p[i] for p in y_up) for i in range(3)]]
   if bounds_changed(body['bounds'],actual):
    raise RuntimeError('Input body bounds/transform mismatch '+str(index))
 bpy.ops.object.select_all(action='DESELECT')
 before=sum(len(o.data.polygons) for o in objects)
 texture=load_texture(a.texture) if a.mode=='floor' else None
 furniture=a.mode=='furniture-draft'
 face_texture=load_texture(a.face_texture) if furniture else None
 face_textures={}
 fabric_texture=None
 countertop_definition=None;countertop_texture=None
 if furniture:
  face_textures={'toned':face_texture,'natural':load_texture(a.natural_face_texture),'raw':load_texture(a.raw_face_texture)}
  fabric_texture=load_texture(a.fabric_texture)
  countertop_definition=json.loads(Path(a.countertop_definition).read_text())
  countertop_texture=load_texture(Path(a.countertop_definition).parent.parent/countertop_definition['web_surface']['image'])
  countertop_texture.colorspace_settings.name='sRGB'
  for image in [*face_textures.values(),fabric_texture]:image.colorspace_settings.name='sRGB'
 edge_texture=load_texture(a.edge_texture) if furniture else None
 rules=load_rules(container_color_override=a.container_color);shared={};decisions=[]
 frames=body_projection_frames(objects) if furniture else {}
 if furniture:
  face_texture.colorspace_settings.name='sRGB'
  edge_texture.colorspace_settings.name='sRGB'
 if furniture and a.finish=='hexa':
  # Prepared studio tile: preserve encoded RGB; no float-pixel crop conversion.
  hexa_texture=load_texture(a.hexa_source)
  hexa_texture.colorspace_settings.name='sRGB'
 atlas=None
 if furniture and settings['mode']!='none':
  with stage('furniture atlas image create'):
   atlas=bpy.data.images.new('Furniture AO',settings['size'],settings['size'],alpha=False,float_buffer=False)
   atlas.colorspace_settings.name='Non-Color';atlas.generated_color=(1,1,1,1)
   import numpy as np
   atlas.pixels.foreach_set(np.ones(len(atlas.pixels),dtype=np.float32));atlas.update()
 for o in objects:
  if furniture:
   # Capture source material labels before replacing slots; source bounds include all parts.
   label=o.get('source_material',' '.join(slot.material.name for slot in o.material_slots if slot.material))
   source_body=meta.get('bodies',[])[o['source_body_index']] if 'source_body_index' in o and 'bodies' in meta else {}
   decision=classify(o.get('source_body_name',o.name),label,meta.get('materials',{}),rules,path=o.get('source_path',''),role=o.get('source_role',''),model_key=meta.get('key',''),bounds=source_body.get('bounds'))
   decisions.append(dict(object=o.name,source_material=label,**decision))
   axes,origin,local_bounds=frames[o.get('source_body_index',o.name)]
   spec,color_source=studio_spec(decision['kind'],label,meta.get('materials',{}),rules,o.get('source_role',''),model_key=meta.get('key',''))
   policy=face_policy(label,meta.get('materials',{}),a.finish,
                      model_key=meta.get('key',''),body=source_body,kind=decision['kind'])
   albero=countertop_candidate(meta.get('base_module') or meta.get('key',''),label,meta.get('materials',{}),countertop_definition,body=source_body)
   decisions[-1]['albero_candidate']=albero
   preserve_face=a.face_source=='studio' and policy['finish']!='hexa'
   decisions[-1].update(face_policy=policy,face_source=a.face_source)
   decisions[-1].update(source_body_index=o.get('source_body_index'),source_part_index=o.get('source_part_index'),source_path=o.get('source_path',''),spec=spec,color_source=color_source,projection_origin_m=origin,projection_axes=axes)
  with stage('apply scale '+o.name,[o]):
   bpy.ops.object.select_all(action='DESELECT')
   bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  original=o.data.copy()
  original_bounds=object_bounds_mm(o)
  try:
   o.data.calc_loop_triangles()
   body_triangles=sum(p['index'][1]//3 for p in meta['bodies'][o['source_body_index']]['parts']) if furniture and 'source_body_index' in o else len(o.data.loop_triangles)
   protected=furniture and keep_geometry(body_triangles,[[c*1000 for c in row] for row in local_bounds])
   if furniture:decisions[-1].update(geometry_preserved=protected,body_triangles=body_triangles)
   if protected:
    print('STAGE: small/thin body kept unchanged '+o.name,flush=True)
   else:
    with stage('validate and degenerate cleanup before weld '+o.name,[o]):
     clean_degenerate(o)
    with stage('weld coincident vertices '+o.name,[o]):
     bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=WELD_METRES);bpy.ops.object.mode_set(mode='OBJECT')
    with stage('limited dissolve protected '+o.name,[o]):
     safe_dissolve(o)
    with stage('validate and degenerate cleanup before decimate '+o.name,[o]):
     clean_degenerate(o)
    with stage('boundary vertex group '+o.name,[o]):
     group,frozen=boundary_group(o)
    with stage('decimate '+o.name,[o]):
     dec=o.modifiers.new('Trial reduction','DECIMATE');dec.ratio=a.ratio
     dec.use_collapse_triangulate=True;dec.use_symmetry=False
     dec.vertex_group=group.name;dec.invert_vertex_group=False;dec.vertex_group_factor=1.0
     bpy.ops.object.modifier_apply(modifier=dec.name)
     verify_fixed(o,frozen)
   if not o.data.polygons or bounds_changed(original_bounds,object_bounds_mm(o)):
    raise ReductionRejected('outer bounds changed or empty mesh')
  except (ReductionRejected, RuntimeError, ValueError) as error:
   # Restore actual source geometry; never stretch a reduced mesh to fit its box.
   if o.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
   for modifier in list(o.modifiers):
    if modifier.type=='DECIMATE':o.modifiers.remove(modifier)
   reduced=o.data;o.data=original;bpy.data.meshes.remove(reduced)
   print('STAGE: RESTORE '+o.name+' '+str(error),flush=True)
  else:
   bpy.data.meshes.remove(original)
  o.vertex_groups.clear()
  geometry_stage('bounds guarded', [o])
  with stage('UV0 planar projection '+o.name,[o]):
   if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap0')
   o.data.update()
   if not furniture:o.data.validate()
   grain=o.data.uv_layers[0];grain.name='UVMap0'
   for name in [layer.name for layer in o.data.uv_layers][1:]:o.data.uv_layers.remove(o.data.uv_layers[name])
   # UV0 is world XY planar projection. UV1 alone receives Smart UV.
   furniture_uv(o,axes,rules,policy['finish'],decision['kind']=='plywood',origin,preserve_face) if furniture else planar_uv(o,a.tile_mm)
   o.data.uv_layers['UVMap0'].active_render=True
  if not furniture:
   with stage('UV1 Smart UV '+o.name,[o]):
    aoUV=o.data.uv_layers.new(name='AO')
    o.data.update();o.data.validate()
    grain=o.data.uv_layers['UVMap0'];aoUV=o.data.uv_layers['AO']
    o.data.uv_layers.active=aoUV;aoUV.active_render=True
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
  resin='step' in o.get('source_role','') or 'resin' in o.get('source_material','').lower()
  ao=atlas if furniture else None
  if not furniture and settings['mode']!='none':
   with stage('AO image create '+o.name):
    ao=bpy.data.images.new(o.name+' AO',settings['size'],settings['size']);ao.colorspace_settings.name='Non-Color'
  with stage('materials '+o.name):
   o.data.materials.clear()
   if furniture:
    kind=decision['kind']
    keys=['plywood-face','plywood-edge'] if kind=='plywood' else [kind]
    for key in keys:
     slot_spec=dict(spec)
     if kind=='plywood':slot_spec['repeat']=True
     if key=='plywood-face' and policy['finish']=='hexa':slot_spec=dict(rules['hexa_face'],repeat=True)
     if key=='plywood-face':slot_spec.update(roughness=.45,metalness=0,ao_constant=1)
     image=None
     if key=='plywood-face':image=hexa_texture if policy['finish']=='hexa' else face_textures[policy['variant']]
     elif key=='plywood-edge':image=edge_texture
     elif kind=='seat_fabric' and meta.get('key','')!='seat' and o.get('source_role','')!='seam':
      image=fabric_texture;slot_spec['repeat']=True
     # Do not merge distinct source colors just because their kinds match.
     cache_key=key+':'+json.dumps(slot_spec,sort_keys=True)+':'+(image.name if image is not None else 'solid')
     if cache_key not in shared:
      shared[cache_key]=material(type('Name',(),{'name':cache_key})(),image,atlas,spec=slot_spec)
     o.data.materials.append(shared[cache_key])
   else:o.data.materials.append(material(o,texture,ao,resin))
  # Set indices after installing slots: clearing slots may reset polygon indices.
  with stage('UV0 planar projection after materials '+o.name,[o]):
   furniture_uv(o,axes,rules,policy['finish'],decision['kind']=='plywood',origin,preserve_face) if furniture else planar_uv(o,a.tile_mm)
  if furniture and albero:
   albero_key='ALBERO melamine surface'
   if albero_key not in shared:
    shared[albero_key]=material(type('Name',(),{'name':albero_key})(),countertop_texture,atlas,spec=dict(color='#ffffff',roughness=.86,metalness=0,repeat=False,ao_constant=1))
   o.data.materials.append(shared[albero_key])
   decisions[-1]['albero_faces']=apply_countertop(o,len(o.data.materials)-1,source_body['bounds'],countertop_definition['web_surface']['tile_mm'])
  if furniture:
   o.select_set(False)
   continue
  if settings['mode']=='none':
   print('STAGE: AO mode none bake SKIP '+o.name,flush=True)
   print('STAGE: AO mode none save SKIP '+o.name,flush=True)
  else:
   bake_ao(o,ao,settings)
   with stage('AO save '+o.name):
    ao.filepath_raw=str(out/(o.name.replace('/','_')+'-ao.png'));ao.file_format='PNG'
    with stage('AO pack '+o.name):
     ao.pack()
    ao.save()
  grain=o.data.uv_layers['UVMap0'];o.data.uv_layers.active=grain;grain.active_render=True;o.select_set(False)
 if furniture:
  (out/'material-report.json').write_text(json.dumps({'finish':a.finish,'shared_materials':list(shared),'decisions':decisions,'unclassified':[d for d in decisions if d['fallback']], 'source_parts':audit_mesh(meta,rules) if 'bodies' in meta else []},ensure_ascii=False,indent=2))
  objects=furniture_atlas(objects,atlas,settings,out)
 points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
 bounds=[[min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)]]
 after=0
 for o in objects:o.data.calc_loop_triangles();after+=len(o.data.loop_triangles)
 target=out/'trial.glb'
 if a.skip_export:
  print('STAGE: GLB export SKIP',flush=True)
 else:
  with stage('GLB export',objects):
   bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_extras=True,export_yup=True)
  if 'bodies' in meta:
   from compare_bounds import compare,decode
   check=compare(meta,decode(target))
   (out/'bounds-check.json').write_text(json.dumps(check,ensure_ascii=False,indent=2))
   if not check['passed']:raise RuntimeError('Export bounds/body identity check failed')
 (out/'metrics.json').write_text(json.dumps({'source':str(source),'triangles_before':meta.get('triangles',before),'triangles_after':after,'bounds_metres_blender_z_up':bounds,'tile_mm':a.tile_mm,'grain_uv':'world XY metres * 1000 / tile_mm; MIRROR','mode':a.mode,'scale_applied':scale,'skip_ao':settings['mode']=='none','ao_settings':settings,'ao_atlas_images':(1 if atlas is not None else 0) if furniture else None,'ao_mode_requested':a.ao_mode,'skip_export':a.skip_export,'bytes':None if a.skip_export else target.stat().st_size,'visual_approval':False,'stage_metrics':STAGE_METRICS},indent=2))

if __name__=='__main__':
 a=args();src=Path(a.input).resolve();sources=[src] if src.is_file() else sorted(p for p in src.iterdir() if p.name.endswith('.mesh.json') or p.suffix.lower() in ['.fbx','.glb','.obj'])
 if not sources:raise RuntimeError('No supported inputs')
 for source in sources:run(a,source)
