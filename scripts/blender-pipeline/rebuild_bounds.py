"""Jobs' eight-output rebuild. Defaults to dry-run; --execute starts Blender."""
import argparse
import subprocess
import sys
from pathlib import Path
import shlex

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
if ROOT.name=='hexa-public':ROOT=ROOT.parent.parent
PARTS=['aluminum-bed','active-side-cabinet','aluminum-front-kitchen','i-seat']


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--execute',action='store_true')
    p.add_argument('--tag',default='match-20261010-1')
    p.add_argument('--face-source',choices=['studio','tetsuya'],default='studio')
    p.add_argument('--max-bytes',type=int,default=4_000_000,help='Furniture size target forwarded to compress.py')
    p.add_argument('--parts',default=','.join(PARTS),help='Comma-separated parts: '+','.join(PARTS))
    a=p.parse_args()
    if a.max_bytes<=0:p.error('--max-bytes must be positive')
    parts=[part.strip() for part in a.parts.split(',')]
    if any(part not in PARTS for part in parts):p.error('--parts must contain only: '+','.join(PARTS))
    parts=list(dict.fromkeys(parts))
    if not a.tag or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in a.tag):
        p.error('tag must contain only letters, digits, dash, underscore')
    base=ROOT/'exports/hexa-studio-blender-20261010'
    jobs=[]
    for part in parts:
        for finish in ['birch','hexa']:
            source=ROOT/f'exports/hexa-public/layouts/assets/{part}.mesh.json'
            output=base/f'out-furn-{part}-{a.tag}-{finish}'
            if output.exists():p.error('Output already exists: '+str(output))
            folder=output/part
            jobs.append((f'{part}/{finish}',[
                [sys.executable,'-B',str(HERE/'run.py'),str(source),str(output),'--mode','furniture-draft','--finish',finish,'--face-source',a.face_source,'--ratio','0.6','--samples','64','--ao-mode','plain','--ao-atlas-size','2048'],
                [sys.executable,'-B',str(HERE/'compress.py'),str(folder/'trial.glb'),str(folder/'trial-meshopt.glb'),'--mode','furniture-draft','--max-bytes',str(a.max_bytes)],
                [sys.executable,'-B',str(HERE/'compare_bounds.py'),str(source),str(folder/'trial-meshopt.glb'),'--json',str(folder/'bounds-compressed.json'),'--require-pass']]))
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
