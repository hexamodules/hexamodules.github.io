"""Blender background worker. Inputs: *.mesh.json, *.fbx, *.glb, *.obj.
Run via run.py. Original files are never modified. Output units are metres.
"""
import argparse,json,sys,math
from pathlib import Path
from contextlib import contextmanager
import bpy
from mathutils import Vector

@contextmanager
def stage(name):
 print('STAGE: '+name+' BEGIN',flush=True)
 try:
  yield
 except BaseException:
  print('STAGE: '+name+' ERROR',flush=True)
  raise
 else:
  print('STAGE: '+name+' END',flush=True)

def load_texture(path):
 with stage('texture load '+str(path)):
  im=bpy.data.images.load(str(Path(path).resolve()),check_existing=True)
 with stage('texture pack '+str(path)):
  im.pack()
 return im

def args():
 p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--texture',required=True);p.add_argument('--ratio',type=float,default=.2);p.add_argument('--units',choices=['mm','m'],default='mm');p.add_argument('--samples',type=int,default=16);p.add_argument('--tile-mm',type=float,nargs=2,default=[300,900]);p.add_argument('--mode',choices=['floor','furniture-draft'],default='floor');p.add_argument('--face-texture');p.add_argument('--edge-texture')
 p.add_argument('--skip-ao',action='store_true');p.add_argument('--skip-export',action='store_true')
 a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
 if any(not math.isfinite(v) or v<=0 for v in a.tile_mm) or not 0<a.ratio<=1:p.error('Invalid tile size or ratio')
 if a.samples<1:p.error('samples must be positive')
 if a.mode=='furniture-draft' and not (a.face_texture and a.edge_texture):p.error('Furniture draft needs face and edge textures')
 return a

def custom(source):
 import struct
 data=json.loads(source.read_text());buf=(source.parent/data['binary']).read_bytes()
 def read(part,key,width):
  offset,count=part[key];values=struct.unpack_from('<'+('I' if key=='index' else 'f')*count,buf,offset)
  return [values[i:i+width] for i in range(0,len(values),width)]
 for body in data['bodies']:
  for i,part in enumerate(body['parts']):
   mesh=bpy.data.meshes.new(body['name']);mesh.from_pydata(read(part,'position',3),[],read(part,'index',3));mesh.update()
   obj=bpy.data.objects.new(body['name']+'_'+str(i),mesh);bpy.context.collection.objects.link(obj)
   obj['source_material']=part['material'];obj['source_role']=body.get('role','');obj['source_bounds_mm']=json.dumps(body['bounds'])
   uv=read(part,'uv',2);layer=mesh.uv_layers.new(name='UVMap0')
   for loop in mesh.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
   normals=read(part,'normal',3);mesh.normals_split_custom_set_from_vertices(normals)
 return data

def planar_uv(o, grain, tile_mm, furniture=False):
 # Work in Blender world metres after the source Y-up -> Blender Z-up conversion.
 normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
 for face in o.data.polygons:
  normal=(normal_matrix@face.normal).normalized()
  edge=furniture and abs(normal.z)<.7
  face.material_index=1 if edge else 0
  for index in face.loop_indices:
   point=o.matrix_world@o.data.vertices[o.data.loops[index].vertex_index].co
   if edge:
    across=point.y if abs(normal.x)>abs(normal.y) else point.x
    grain.data[index].uv=(across/.3,point.z/.015)
   elif furniture:
    grain.data[index].uv=(point.x/1.22,point.y/2.44)
   else:
    grain.data[index].uv=(point.x*1000/tile_mm[0],point.y*1000/tile_mm[1])


def material(o, texture, ao, resin=False):
 mat=bpy.data.materials.new(o.name);mat.use_nodes=True
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
 bsdf.inputs['Roughness'].default_value=.94
 bsdf.inputs['Base Color'].default_value=(.0185,.0185,.023,1) if resin else (1,1,1,1)
 if not resin:
  tex=nodes.new('ShaderNodeTexImage');tex.image=texture;tex.extension='MIRROR'
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='UVMap0'
  links.new(uv.outputs['UV'],tex.inputs['Vector']);links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 if ao is None:return mat
 bake=nodes.new('ShaderNodeTexImage');bake.image=ao;nodes.active=bake
 group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
 group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 g=nodes.new('ShaderNodeGroup');g.node_tree=group
 uv=nodes.new('ShaderNodeUVMap');uv.uv_map='AO'
 links.new(uv.outputs['UV'],bake.inputs['Vector']);links.new(bake.outputs['Color'],g.inputs['Occlusion'])
 return mat


def run(a,source):
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
 bpy.ops.object.select_all(action='DESELECT')
 before=sum(len(o.data.polygons) for o in objects)
 texture=load_texture(a.texture)
 furniture=a.mode=='furniture-draft'
 face_texture=load_texture(a.face_texture) if furniture else None
 edge_texture=load_texture(a.edge_texture) if furniture else None
 for o in objects:
  with stage('apply scale '+o.name):
   bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  # Weld only coincident vertices; UV and sharp edges delimit planar dissolve.
  with stage('weld coincident vertices '+o.name):
   bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.000001);bpy.ops.object.mode_set(mode='OBJECT')
  with stage('decimate '+o.name):
   dissolve=o.modifiers.new('Planar preservation','DECIMATE');dissolve.decimate_type='DISSOLVE';dissolve.angle_limit=math.radians(.2);dissolve.delimit={'NORMAL','UV','MATERIAL','SHARP'}
   bpy.ops.object.modifier_apply(modifier=dissolve.name)
   # Trial collapse ratio is a target, not a manufacturing tolerance guarantee.
   dec=o.modifiers.new('Trial reduction','DECIMATE');dec.ratio=a.ratio;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
  with stage('UV0 planar projection '+o.name):
   if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap0')
   o.data.update();o.data.validate()
   grain=o.data.uv_layers[0];grain.name='UVMap0'
   for extra in list(o.data.uv_layers)[1:]:o.data.uv_layers.remove(extra)
   # UV0 is world XY planar projection. UV1 alone receives Smart UV.
   planar_uv(o,grain,a.tile_mm,furniture)
   grain.active_render=True
  with stage('UV1 Smart UV '+o.name):
   aoUV=o.data.uv_layers.new(name='AO')
   o.data.update();o.data.validate()
   grain=o.data.uv_layers['UVMap0'];aoUV=o.data.uv_layers['AO']
   o.data.uv_layers.active=aoUV;aoUV.active_render=True
   bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
  resin='step' in o.get('source_role','') or 'resin' in o.get('source_material','').lower()
  ao=None
  if not a.skip_ao:
   with stage('AO image create '+o.name):
    ao=bpy.data.images.new(o.name+' AO',1024,1024);ao.colorspace_settings.name='Non-Color'
  with stage('materials '+o.name):
   o.data.materials.clear()
   o.data.materials.append(material(o,face_texture if furniture else texture,ao,resin))
   if furniture:o.data.materials.append(material(o,edge_texture,ao,resin))
  # Set indices after installing slots: clearing slots may reset polygon indices.
  with stage('UV0 planar projection after materials '+o.name):
   planar_uv(o,grain,a.tile_mm,furniture)
  if a.skip_ao:
   print('STAGE: AO bake SKIP '+o.name,flush=True)
   print('STAGE: AO save SKIP '+o.name,flush=True)
  else:
   with stage('AO bake '+o.name):
    bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.device='CPU';bpy.context.scene.cycles.samples=a.samples
    bpy.ops.object.bake(type='AO',margin=8,use_clear=True)
   with stage('AO save '+o.name):
    ao.filepath_raw=str(out/(o.name.replace('/','_')+'-ao.png'));ao.file_format='PNG'
    with stage('AO pack '+o.name):
     ao.pack()
    ao.save()
  o.data.uv_layers.active=grain;grain.active_render=True;o.select_set(False)
 points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
 bounds=[[min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)]]
 after=0
 for o in objects:o.data.calc_loop_triangles();after+=len(o.data.loop_triangles)
 target=out/'trial.glb'
 if a.skip_export:
  print('STAGE: GLB export SKIP',flush=True)
 else:
  with stage('GLB export'):
   bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_extras=True,export_yup=True)
 (out/'metrics.json').write_text(json.dumps({'source':str(source),'triangles_before':meta.get('triangles',before),'triangles_after':after,'bounds_metres_blender_z_up':bounds,'tile_mm':a.tile_mm,'grain_uv':'world XY metres * 1000 / tile_mm; MIRROR','mode':a.mode,'scale_applied':scale,'skip_ao':a.skip_ao,'skip_export':a.skip_export,'bytes':None if a.skip_export else target.stat().st_size,'visual_approval':False},indent=2))

if __name__=='__main__':
 a=args();src=Path(a.input).resolve();sources=[src] if src.is_file() else sorted(p for p in src.iterdir() if p.name.endswith('.mesh.json') or p.suffix.lower() in ['.fbx','.glb','.obj'])
 if not sources:raise RuntimeError('No supported inputs')
 for source in sources:run(a,source)
