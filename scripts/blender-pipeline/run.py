"""Folder-to-folder entry point; Blender UI is never opened."""
import argparse,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');p.add_argument('--texture',default='exports/hexa-public/layouts/assets/floor-finish-oak.jpg');p.add_argument('--blender',default='/Applications/Blender.app/Contents/MacOS/Blender');p.add_argument('--ratio',default='.15');a=p.parse_args()
result=subprocess.run([a.blender,'--background','--factory-startup','--python',str(Path(__file__).with_name('pipeline.py')),'--','--input',str(Path(a.input).resolve()),'--output',str(Path(a.output).resolve()),'--texture',str(Path(a.texture).resolve()),'--ratio',a.ratio],capture_output=True,text=True)
out=Path(a.output);out.mkdir(parents=True,exist_ok=True);(out/'blender-run.log').write_text(result.stdout+'\n'+result.stderr);print(result.stdout,result.stderr);sys.exit(0 if result.returncode==0 else 1)
