"""Plan approved-GLB repacking; execution is opt-in and never writes layouts/."""
import hashlib
import json
from pathlib import Path
import shlex
import subprocess
import sys
from external_textures import externalize


def inspect_batch(paths):
    textures = {}
    rows = []
    for path in paths:
        raw = path.read_bytes()
        packed, images = externalize(raw, path.parent)
        textures.update(images)
        rows.append({'name': path.name, 'before_bytes': len(raw), 'glb_bytes': len(packed),
                     'cold_bytes': len(packed)+sum(map(len, images.values())),
                     'warm_bytes': len(packed), 'uris': sorted(images),
                     'source_sha256': hashlib.sha256(raw).hexdigest()})
    return {'models': len(rows), 'before_bytes': sum(r['before_bytes'] for r in rows),
            'after_glb_bytes': sum(r['glb_bytes'] for r in rows),
            'shared_texture_bytes': sum(map(len, textures.values())),
            'after_total_bytes': sum(r['glb_bytes'] for r in rows)+sum(map(len, textures.values())),
            'shared_images': len(textures), 'rows': rows,
            'note': 'File payload bytes, not measured network traffic; warm assumes all shared textures cached.'}


def run_batch(root, here, base, parts, finishes, tag, execute, max_bytes):
    source = root/'exports/hexa-public/layouts/assets/blender'
    destination = base/('shared-textures-'+tag)
    if destination.exists():
        raise SystemExit('Output already exists: '+str(destination))
    paths = [source/f'{part}-{finish}.glb' for part in parts for finish in finishes]
    summary = inspect_batch(paths)  # Preflight all sources before creating anything.
    commands = [[sys.executable, '-B', str(here/'compress.py'), str(path),
                 str(destination/'assets/blender'/path.name), '--mode', 'furniture-draft',
                 '--external-textures', '--max-bytes', str(max_bytes)] for path in paths]
    for command in commands:
        print(shlex.join(command), flush=True)
    if not execute:
        print(json.dumps({k:v for k,v in summary.items() if k!='rows'}, ensure_ascii=False))
        return
    destination.mkdir(parents=True, exist_ok=False)
    for path, row, command in zip(paths, summary['rows'], commands):
        if hashlib.sha256(path.read_bytes()).hexdigest() != row['source_sha256']:
            raise RuntimeError('Source changed after preflight: '+str(path))
        subprocess.run(command, check=True, cwd=root)
        output = destination/'assets/blender'/path.name
        if output.stat().st_size != row['glb_bytes']:
            raise RuntimeError('Output size differs from lossless plan')
    (destination/'capacity.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n')
    print(f'Completed: {len(paths)}/{len(paths)}; layouts unchanged', flush=True)
