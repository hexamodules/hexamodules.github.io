import bpy,sys,math,os,argparse
from pathlib import Path
argv=sys.argv[sys.argv.index('--')+1:]
parser=argparse.ArgumentParser()
parser.add_argument('glb');parser.add_argument('out');parser.add_argument('--reference',help='Use the same reference GLB for both images to lock the camera')
a=parser.parse_args(argv);glb,out=a.glb,a.out
if Path(out).exists():raise FileExistsError('Choose a new output image')
Path(out).parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(a.reference or glb).resolve()))
objs=[o for o in bpy.data.objects if o.type=='MESH']
# 外形
import mathutils
mn=mathutils.Vector((1e9,1e9,1e9)); mx=mathutils.Vector((-1e9,-1e9,-1e9))
for o in objs:
    for c in o.bound_box:
        w=o.matrix_world@mathutils.Vector(c)
        mn=mathutils.Vector(map(min,mn,w)); mx=mathutils.Vector(map(max,mx,w))
ctr=(mn+mx)/2; size=(mx-mn); d=max(size)
if a.reference:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(glb).resolve()))
    objs=[o for o in bpy.data.objects if o.type=='MESH']
sc=bpy.context.scene
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.location=ctr+mathutils.Vector((d*0.9,-d*1.1,d*0.8)); cam.rotation_euler=(cam.location-ctr).to_track_quat('Z','Y').to_euler()
cam.data.lens=40
sun=bpy.data.objects.new('sun',bpy.data.lights.new('sun','SUN')); sc.collection.objects.link(sun); sun.rotation_euler=(math.radians(50),math.radians(10),math.radians(30)); sun.data.energy=3
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.85,0.85,0.85,1); w.node_tree.nodes['Background'].inputs[1].default_value=1.0
engines=sc.render.bl_rna.properties['engine'].enum_items.keys()
sc.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
sc.render.resolution_percentage=100; sc.render.image_settings.file_format='PNG'
sc.render.resolution_x=1400; sc.render.resolution_y=900; sc.render.filepath=out
bpy.ops.render.render(write_still=True)
tri=sum(len(o.data.polygons) for o in objs)
print('RENDER_OK',out,'tris',tri,'camera_reference_size_mm',[round(x*1000) for x in size])
