"""Jobs' eight-output rebuild. Defaults to dry-run; --execute starts Blender."""
import argparse
import subprocess
import sys
from pathlib import Path
import shlex

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
if ROOT.name=='hexa-public':ROOT=ROOT.parent.parent


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--execute',action='store_true')
    p.add_argument('--tag',default='reality-20261010-1')
    a=p.parse_args()
    if not a.tag or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in a.tag):
        p.error('tag must contain only letters, digits, dash, underscore')
    base=ROOT/'exports/hexa-studio-blender-20261010'
    jobs=[]
    for part in ['aluminum-bed','active-side-cabinet','aluminum-front-kitchen','i-seat']:
        for finish in ['birch','hexa']:
            source=ROOT/f'exports/hexa-public/layouts/assets/{part}.mesh.json'
            output=base/f'out-furn-{part}-{a.tag}-{finish}'
            if output.exists():p.error('Output already exists: '+str(output))
            folder=output/part
            jobs.extend([
                [sys.executable,'-B',str(HERE/'run.py'),str(source),str(output),'--mode','furniture-draft','--finish',finish,'--ratio','0.6','--samples','64','--ao-mode','plain','--ao-atlas-size','2048'],
                [sys.executable,'-B',str(HERE/'compress.py'),str(folder/'trial.glb'),str(folder/'trial-meshopt.glb'),'--mode','furniture-draft'],
                [sys.executable,'-B',str(HERE/'compare_bounds.py'),str(source),str(folder/'trial-meshopt.glb'),'--json',str(folder/'bounds-compressed.json'),'--require-pass']])
    for cmd in jobs:
        print(shlex.join(cmd),flush=True)
        if a.execute:subprocess.run(cmd,check=True,cwd=ROOT)


if __name__=='__main__':main()
