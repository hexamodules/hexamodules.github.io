"""Folder-to-folder runner. Use --dry-run to inspect without starting Blender."""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path
from extract_tile import defaults


def main():
    assets, tiles = defaults()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('input', type=Path); p.add_argument('output', type=Path)
    p.add_argument('--assets', type=Path, default=assets)
    p.add_argument('--tiles', type=Path, default=tiles)
    p.add_argument('--finish', default='oak')
    p.add_argument('--texture', type=Path)
    p.add_argument('--tile-mm', type=float, nargs=2)
    p.add_argument('--blender', default='/Applications/Blender.app/Contents/MacOS/Blender')
    p.add_argument('--ratio', type=float, default=.2)
    p.add_argument('--units', choices=['mm','m'], default='mm')
    p.add_argument('--mode', choices=['floor','furniture-draft'], default='floor')
    p.add_argument('--dry-run', action='store_true')
    a = p.parse_args()
    finishes = {f['value']:f for f in json.loads((a.assets/'floor-finishes.json').read_text())['colors']}
    if a.finish not in finishes:
        p.error('--finish must be one of: '+', '.join(finishes))
    texture = a.texture or a.tiles/f'floor-{a.finish}.png'
    tile_mm = a.tile_mm or finishes[a.finish]['mapping']['tile_mm']
    if not 0 < a.ratio <= 1 or any(not math.isfinite(n) or n <= 0 for n in tile_mm):
        p.error('ratio must be >0 and <=1; tile dimensions must be positive')
    if not a.input.exists() or not texture.is_file():
        p.error('Input or tile missing; run extract_tile.py first')
    cmd = [a.blender, '--background', '--factory-startup', '--python-exit-code', '1', '--python',
           str(Path(__file__).with_name('pipeline.py')), '--', '--input', str(a.input.resolve()),
           '--output', str(a.output.resolve()), '--texture', str(texture.resolve()),
           '--ratio', str(a.ratio), '--tile-mm', *map(str,tile_mm), '--units', a.units, '--mode', a.mode]
    if a.mode == 'furniture-draft':
        for flag,name in [('--face-texture','birch-face.png'),('--edge-texture','birch-edge-15mm.png')]:
            if not (a.tiles/name).is_file():
                p.error('Furniture tiles missing; extract with --furniture-source')
            cmd.extend([flag,str((a.tiles/name).resolve())])
    if a.output.exists():
        p.error('Output exists; choose a new directory')
    if a.dry_run:
        print(json.dumps({'command':cmd, 'tile_mm':tile_mm, 'blender_started':False},ensure_ascii=False,indent=2))
        return
    a.output.mkdir(parents=True, exist_ok=False)
    result = subprocess.run(cmd, capture_output=True, text=True)
    (a.output/'blender-run.log').write_text(result.stdout+'\n'+result.stderr)
    print(result.stdout,result.stderr)
    sys.exit(0 if result.returncode == 0 else 1)


if __name__ == '__main__':
    main()
