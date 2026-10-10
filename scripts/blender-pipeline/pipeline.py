"""Blender background worker. Inputs: *.mesh.json, *.fbx, *.glb, *.obj.
Run via run.py. Original files are never modified. Output units are metres.
"""
import argparse,json,sys,math
from pathlib import Path
import bpy
from mathutils import Vector

def args():
 p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--texture',required=True);p.add_argument('--ratio',type=float,default=.2);p.add_argument('--units',choices=['mm','m'],default='mm');p.add_argument('--samples',type=int,default=16)
 return p.parse_args(sys.argv[sys.argv.index('--')+1:])

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

def run(a,source):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 out=Path(a.output)/source.name.replace('.mesh.json','').replace(source.suffix,'');out.mkdir(parents=True,exist_ok=False)
 if source.name.endswith('.mesh.json'):meta=custom(source)
 elif source.suffix.lower()=='.fbx':bpy.ops.import_scene.fbx(filepath=str(source));meta={}
 elif source.suffix.lower()=='.glb':bpy.ops.import_scene.gltf(filepath=str(source));meta={}
 elif source.suffix.lower()=='.obj':bpy.ops.wm.obj_import(filepath=str(source));meta={}
 else:raise ValueError(source)
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
 # FBX importer converts declared units to metres; do not multiply a second time.
 scale=.001 if source.name.endswith('.mesh.json') or (source.suffix.lower()=='.obj' and a.units=='mm') else 1
 for o in objects:
  o.matrix_world=__import__('mathutils').Matrix.Scale(scale,4)@o.matrix_world
 bpy.ops.object.select_all(action='DESELECT')
 before=sum(len(o.data.polygons) for o in objects)
 texture=bpy.data.images.load(str(Path(a.texture).resolve()))
 for o in objects:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  # Weld only coincident vertices; UV and sharp edges delimit planar dissolve.
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.000001);bpy.ops.object.mode_set(mode='OBJECT')
  dissolve=o.modifiers.new('Planar preservation','DECIMATE');dissolve.decimate_type='DISSOLVE';dissolve.angle_limit=math.radians(.2);dissolve.delimit={'NORMAL','UV','MATERIAL','SHARP'}
  bpy.ops.object.modifier_apply(modifier=dissolve.name)
  # Trial collapse ratio is a target, not a manufacturing tolerance guarantee.
  dec=o.modifiers.new('Trial reduction','DECIMATE');dec.ratio=a.ratio;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
  if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap0')
  grain=o.data.uv_layers[0];grain.name='UVMap0'
  # Preserve the source grain UVs; unwrap only the second AO channel.
  grain.active_render=True
  aoUV=o.data.uv_layers.new(name='AO');o.data.uv_layers.active=aoUV;aoUV.active_render=True
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
  mat=bpy.data.materials.new(o.name);mat.use_nodes=True;o.data.materials.clear();o.data.materials.append(mat)
  nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.94
  resin='step' in o.get('source_role','') or 'resin' in o.get('source_material','').lower()
  bsdf.inputs['Base Color'].default_value=(.0185,.0185,.023,1) if resin else (1,1,1,1)
  if not resin:
   tex=nodes.new('ShaderNodeTexImage');tex.image=texture;uv=nodes.new('ShaderNodeUVMap');uv.uv_map='UVMap0';links.new(uv.outputs['UV'],tex.inputs['Vector']);links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
  ao=bpy.data.images.new(o.name+' AO',1024,1024);ao.colorspace_settings.name='Non-Color';bake=nodes.new('ShaderNodeTexImage');bake.image=ao;nodes.active=bake
  bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.device='CPU';bpy.context.scene.cycles.samples=a.samples
  bpy.ops.object.bake(type='AO',margin=8,use_clear=True)
  ao.filepath_raw=str(out/(o.name.replace('/','_')+'-ao.png'));ao.file_format='PNG';ao.save()
  # glTF exporter recognizes the glTF Material Output occlusion group.
  group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');g=nodes.new('ShaderNodeGroup');g.node_tree=group
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='AO';links.new(uv.outputs['UV'],bake.inputs['Vector']);links.new(bake.outputs['Color'],g.inputs['Occlusion'])
  o.data.uv_layers.active=grain;grain.active_render=True;o.select_set(False)
 points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
 bounds=[[min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)]]
 # Millimetre custom format is Y-up; glTF exporter converts Blender Z-up to Y-up.
 if source.name.endswith('.mesh.json'):
  from mathutils import Matrix
  for o in objects:o.matrix_world=Matrix.Rotation(math.pi/2,4,'X')@o.matrix_world
 after=0
 for o in objects:o.data.calc_loop_triangles();after+=len(o.data.loop_triangles)
 target=out/'trial.glb';bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_extras=True,export_yup=True)
 (out/'metrics.json').write_text(json.dumps({'source':str(source),'triangles_before':meta.get('triangles',before),'triangles_after':after,'bounds_metres_before_axis_conversion':bounds,'scale_applied':scale,'bytes':target.stat().st_size,'visual_approval':False},indent=2))

if __name__=='__main__':
 a=args();src=Path(a.input).resolve();sources=[src] if src.is_file() else sorted(p for p in src.iterdir() if p.name.endswith('.mesh.json') or p.suffix.lower() in ['.fbx','.glb','.obj'])
 if not sources:raise RuntimeError('No supported inputs')
 for source in sources:run(a,source)
