"""Extract studio photo regions without Blender. Requires Pillow; never edits sources."""
import argparse
import json
import math
from pathlib import Path
from PIL import Image


def defaults():
    root = Path(__file__).resolve().parents[2]
    assets = root / 'layouts/assets'
    if not assets.is_dir():
        assets = root / 'exports/hexa-public/layouts/assets'
    # Both workspace and public-repository copies share the local output directory.
    workspace = root.parent.parent if (root / 'layouts').is_dir() and root.name == 'hexa-public' else root
    return assets, workspace / 'exports/hexa-studio-blender-20261010/tiles'


def affine(mapping, source_size, output_size):
    """Studio UV is bottom-up; Pillow pixels are top-down. Invert both Y axes."""
    cx, cy = mapping['center']; ax, ay = mapping['across']; bx, by = mapping['along']
    sw, sh = source_size; w, h = output_size
    if abs(ax * by - ay * bx) < 1e-12:
        raise ValueError('Degenerate mapping')
    for u in (-.5, .5):
        for v in (-.5, .5):
            if not (0 <= cx + u*ax + v*bx <= 1 and 0 <= cy + u*ay + v*by <= 1):
                raise ValueError('Photo region outside image')
    return (sw*ax/w, -sw*bx/h, sw*(cx-ax/2+bx/2),
            -sh*ay/w, sh*by/h, sh*(1-cy+ay/2-by/2))


def save_new(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as f:
        image.save(f, format='PNG')


def extract_catalog(catalog, output, pixels_per_mm=2):
    data = json.loads(catalog.read_text())
    kind = catalog.stem.removesuffix('-finishes')
    records = []
    for finish in data.get('colors', []):
        mapping = finish.get('mapping')
        if not mapping:
            continue
        tile_mm = mapping['tile_mm']
        if any(not math.isfinite(n) or n <= 0 for n in tile_mm):
            raise ValueError('tile_mm must be positive')
        size = tuple(max(1, round(n*pixels_per_mm)) for n in tile_mm)
        source = catalog.parent.parent / finish['image']
        with Image.open(source) as photo:
            photo = photo.convert('RGB')
            tile = photo.transform(size, Image.Transform.AFFINE, affine(mapping, photo.size, size), Image.Resampling.BICUBIC)
        target = output / f"{kind}-{finish['value']}.png"
        save_new(tile, target)
        records.append({'value':finish['value'], 'kind':kind, 'source':str(source.resolve()),
                        'output':target.name, 'size_px':size, 'tile_mm':tile_mm, 'mapping':mapping})
    return records


def furniture_draft(source, output):
    # Internal-only references; visual estimates, not dimensional material scans.
    with Image.open(source/'birch-face-B-2848x4288.png') as photo:
        save_new(photo.convert('RGB').crop((0, 0, 2848, 3900)), output/'birch-face.png')
    with Image.open(source/'birch-edge-thickness-stack-2622x4561.jpg') as photo:
        # Front-left edge of the board marked 15 mm. Straighten its slope.
        tile = photo.convert('RGB').transform((1024, 128), Image.Transform.AFFINE,
                    (650/1024, 0, 70, 275/1024, 175/128, 1250), Image.Resampling.BICUBIC)
        save_new(tile, output/'birch-edge-15mm.png')


def main():
    assets, output = defaults()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--assets', type=Path, default=assets)
    p.add_argument('--output', type=Path, default=output)
    p.add_argument('--pixels-per-mm', type=float, default=2)
    p.add_argument('--furniture-source', type=Path)
    a = p.parse_args()
    if not math.isfinite(a.pixels_per_mm) or not 0 < a.pixels_per_mm <= 10:
        p.error('--pixels-per-mm must be > 0 and <= 10')
    catalogs = sorted(a.assets.glob('*finishes.json'))
    if not catalogs:
        p.error('No finish catalogs')
    # Preflight before writing, to avoid partially replacing an existing tile set.
    targets = [a.output / f"{c.stem.removesuffix('-finishes')}-{f['value']}.png"
               for c in catalogs for f in json.loads(c.read_text()).get('colors',[]) if f.get('mapping')]
    targets += [a.output/'manifest.json']
    if a.furniture_source:
        targets += [a.output/'birch-face.png', a.output/'birch-edge-15mm.png']
    if any(t.exists() for t in targets):
        p.error('Output exists; choose a new --output directory')
    records = []
    for catalog in catalogs:
        items = extract_catalog(catalog, a.output, a.pixels_per_mm)
        records.extend(items)
        print(catalog.name, f'{len(items)} tiles' if items else 'skipped: no mapping')
    if a.furniture_source:
        furniture_draft(a.furniture_source, a.output)
    a.output.mkdir(parents=True, exist_ok=True)
    with (a.output/'manifest.json').open('x') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
