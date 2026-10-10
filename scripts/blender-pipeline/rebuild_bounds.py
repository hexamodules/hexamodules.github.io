"""Furniture rebuild (13 modules plus bed/front accessories). Defaults to dry-run; --execute starts Blender."""
import argparse
import subprocess
import sys
from pathlib import Path
import shlex
from furniture_materials import container_color

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
if ROOT.name=='hexa-public':ROOT=ROOT.parent.parent
DEFAULT_PARTS=['aluminum-bed','active-side-cabinet','aluminum-front-kitchen','i-seat']
PARTS=['front-module','aluminum-front-kitchen','i-seat','seat','side-cabinet',
       'simple-side-cabinet','aluminum-side-cabinet','active-side-cabinet',
       'slide-bed','lounge-slide-bed','aluminum-bed','lounge-bed','two-side-bed']
FRONT_REARS=[f'front-module-rear-{n}' for n in (20,114,130,140)]
ACCESSORIES={'front-module':FRONT_REARS, 'two-side-bed':['centre-mattresses'], 'lounge-bed':['lounge-fillers']}

def selected_parts(value):
    parts=PARTS.copy() if value.strip()=='all' else list(dict.fromkeys(p.strip() for p in value.split(',')))
    allowed=PARTS+[p for items in ACCESSORIES.values() for p in items]
    if any(p not in allowed for p in parts):
        raise ValueError('--parts must be all or comma-separated: '+','.join(allowed))
    for part in parts.copy():
        for accessory in ACCESSORIES.get(part,[]):
            if accessory not in parts:parts.append(accessory)
    return parts


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--container-color',type=container_color,help='Container and lid colour: #RRGGBB')
    p.add_argument('--execute',action='store_true')
    p.add_argument('--tag',default='match-20261010-1')
    p.add_argument('--face-source',choices=['studio','tetsuya'],default='studio')
    p.add_argument('--max-bytes',type=int,default=4_000_000,help='Furniture size target forwarded to compress.py')
    p.add_argument('--parts',default=','.join(DEFAULT_PARTS),help='all or comma-separated parts: '+','.join(PARTS))
    p.add_argument('--finishes', default='birch,hexa', help='Comma-separated finishes: birch,hexa')
    a=p.parse_args()
    finishes=list(dict.fromkeys(f.strip() for f in a.finishes.split(',')))
    if any(f not in ('birch','hexa') for f in finishes):p.error('--finishes must contain only birch,hexa')
    if a.max_bytes<=0:p.error('--max-bytes must be positive')
    try:parts=selected_parts(a.parts)
    except ValueError as error:p.error(str(error))
    if not a.tag or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in a.tag):
        p.error('tag must contain only letters, digits, dash, underscore')
    base=ROOT/'exports/hexa-studio-blender-20261010'
    jobs=[]
    for part in parts:
        for finish in finishes:
            source=ROOT/f'exports/hexa-public/layouts/assets/{part}.mesh.json'
            if not source.is_file():p.error('Source missing: '+str(source))
            output=base/f'out-furn-{part}-{a.tag}-{finish}'
            if output.exists():p.error('Output already exists: '+str(output))
            folder=output/part
            jobs.append((f'{part}/{finish}',[
                [sys.executable,'-B',str(HERE/'run.py'),str(source),str(output),'--mode','furniture-draft','--finish',finish,'--face-source',a.face_source,'--ratio','0.6','--samples','128','--ao-mode','plain','--ao-atlas-size','2048'],
                [sys.executable,'-B',str(HERE/'check_material_report.py'),str(source),str(folder/'material-report.json')],
                [sys.executable,'-B',str(HERE/'compress.py'),str(folder/'trial.glb'),str(folder/'trial-meshopt.glb'),'--mode','furniture-draft','--max-bytes',str(a.max_bytes)],
                [sys.executable,'-B',str(HERE/'compare_bounds.py'),str(source),str(folder/'trial-meshopt.glb'),'--json',str(folder/'bounds-compressed.json'),'--require-pass']]))
    if a.container_color is not None:
        for _, commands in jobs:
            for cmd in commands[:2]:
                cmd.extend(['--container-color', a.container_color])
    failures=[]
    for label,commands in jobs:
        for cmd in commands:
            print(shlex.join(cmd),flush=True)
            if a.execute:
                try:
                    subprocess.run(cmd,check=True,cwd=ROOT)
                except (subprocess.CalledProcessError,OSError) as error:
                    failures.append(f'{label}: {Path(cmd[2]).name}: {error}')
                    break  # Skip this output's dependent steps, continue the next output.
    if a.execute:
        print(f'Completed: {len(jobs)-len(failures)}/{len(jobs)}; failed: {len(failures)}',flush=True)
        if failures:
            print('Failed outputs:\n'+'\n'.join(failures),file=sys.stderr)
            raise SystemExit(1)


if __name__=='__main__':main()
