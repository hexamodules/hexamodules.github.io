"""Folder-to-folder runner. Use --dry-run to inspect without starting Blender."""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path
from extract_tile import defaults
from furniture_materials import load_rules
from hexa_texture import studio_hexa_tile
from match_textures import prepare


def main():
    assets, tiles = defaults()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('input', type=Path); p.add_argument('output', type=Path)
    p.add_argument('--assets', type=Path, default=assets)
    p.add_argument('--tiles', type=Path, default=tiles)
    p.add_argument('--finish')
    p.add_argument('--face-source',choices=['studio','tetsuya'],default='studio')
    p.add_argument('--texture', type=Path)
    p.add_argument('--tile-mm', type=float, nargs=2)
    p.add_argument('--blender', default='/Applications/Blender.app/Contents/MacOS/Blender')
    p.add_argument('--ratio', type=float, default=.6)
    p.add_argument('--samples', type=int, default=64)
    p.add_argument('--units', choices=['mm','m'], default='mm')
    p.add_argument('--mode', choices=['floor','furniture-draft'], default='floor')
    p.add_argument('--ao-atlas-size', type=int, choices=[2048,4096], default=2048)
    p.add_argument('--ao-mode', choices=['plain','packed','lowres','gpu-off','none'], default='plain')
    p.add_argument('--skip-ao', action='store_true')
    p.add_argument('--skip-export', action='store_true')
    p.add_argument('--dry-run', action='store_true')
    a = p.parse_args()
    rules = load_rules()
    a.finish = a.finish or ('birch' if a.mode == 'furniture-draft' else 'oak')
    if a.mode == 'furniture-draft':
        if a.finish not in ('birch','hexa'): p.error('Furniture finish must be birch or hexa')
        texture = a.texture or (a.assets/'wood-grain.jpg' if a.face_source == 'studio' else a.tiles/rules['textures']['birch_face'])
        tile_mm = a.tile_mm or rules['mapping']['hexa_mm' if a.finish == 'hexa' else 'face_mm']
    else:
        finishes = {f['value']:f for f in json.loads((a.assets/'floor-finishes.json').read_text())['colors']}
        if a.finish not in finishes: p.error('--finish must be one of: '+', '.join(finishes))
        texture = a.texture or a.tiles/f'floor-{a.finish}.png'
        tile_mm = a.tile_mm or finishes[a.finish]['mapping']['tile_mm']
    if a.samples < 1 or not 0 < a.ratio <= 1 or any(not math.isfinite(n) or n <= 0 for n in tile_mm):
        p.error('ratio must be >0 and <=1; tile dimensions must be positive')
    if not a.input.exists() or not texture.is_file():
        p.error('Input or tile missing; run extract_tile.py first')
    cmd = [a.blender, '--background', '--factory-startup', '--python-exit-code', '1', '--python',
           str(Path(__file__).with_name('pipeline.py')), '--', '--input', str(a.input.resolve()),
           '--output', str(a.output.resolve()), '--texture', str(texture.resolve()),
           '--ratio', str(a.ratio), '--samples', str(a.samples), '--tile-mm', *map(str,tile_mm), '--units', a.units, '--mode', a.mode, '--ao-mode', a.ao_mode]
    for flag,enabled in [('--skip-ao',a.skip_ao),('--skip-export',a.skip_export)]:
        if enabled: cmd.append(flag)
    if a.mode == 'furniture-draft':
        cmd.extend(['--ao-atlas-size', str(a.ao_atlas_size), '--finish', a.finish])
        for flag,name in [('--edge-texture','birch-edge-15mm.png')]:
            if not (a.tiles/name).is_file():
                p.error('Furniture tiles missing; extract with --furniture-source')
            cmd.extend([flag,str((a.tiles/name).resolve())])
        for name in ['wood-grain.jpg','mattress-colors/light-green.jpg']:
            if not (a.assets/name).is_file(): p.error('Studio texture missing: '+name)
        cmd.extend(['--countertop-definition',str((a.assets/'countertop-material.json').resolve())])
        cmd.extend(['--face-source',a.face_source,'--face-texture',str((a.output/'face-toned.png').resolve()),
                    '--natural-face-texture',str((a.output/'face-natural.png').resolve()),
                    '--raw-face-texture',str((a.output/'face-raw.png').resolve()),
                    '--fabric-texture',str((a.output/'seat-fabric.png').resolve())])
    if a.mode == 'furniture-draft' and a.finish == 'hexa':
        hexa_source = a.texture or a.output/rules['textures']['hexa_source']
        if a.texture and not hexa_source.is_file(): p.error('Hexa tile missing')
        cmd.extend(['--hexa-source',str(hexa_source.resolve())])
    if a.output.exists():
        p.error('Output exists; choose a new directory')
    if a.dry_run:
        print(json.dumps({'command':cmd, 'tile_mm':tile_mm, 'blender_started':False},ensure_ascii=False,indent=2))
        return
    a.output.mkdir(parents=True, exist_ok=False)
    if a.mode == 'furniture-draft':
        prepare(a.assets,a.tiles,a.output,a.face_source)
    if a.mode == 'furniture-draft' and a.finish == 'hexa' and not a.texture:
        studio_hexa_tile().save(hexa_source, format='PNG')
    # Merge streams to preserve warning/STAGE order and keep a live crash log.
    with (a.output/'blender-run.log').open('x') as log:
        with subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1) as process:
            for line in process.stdout:
                log.write(line); log.flush()
                print(line, end='', flush=True)
            returncode = process.wait()
        log.write(f'RUNNER: returncode={returncode}\n'); log.flush()
    sys.exit(0 if returncode == 0 else 1)


if __name__ == '__main__':
    main()
