"""Compare all source bodies against decoded GLB nodes (world Y-up mm).
Blender-free. Requires the existing local Node/glTF-Transform dependencies.
Legacy joined GLBs have lost identity: report UNRESOLVED, never invent matches.
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path


def union(bounds):
    values = [b for b in bounds if b is not None]
    if not values:
        return None
    return [[min(b[0][i] for b in values) for i in range(3)],
            [max(b[1][i] for b in values) for i in range(3)]]


def difference(actual, expected):
    if actual is None:
        return None
    return [[actual[j][i] - expected[j][i] for i in range(3)] for j in range(2)]


def maximum(delta):
    return None if delta is None else max(abs(x) for row in delta for x in row)


def compare(source, nodes, tolerance=2):
    bodies = source['bodies']; matches = [[] for _ in bodies]; unmatched = []
    for node in nodes:
        extras = node.get('extras', {}); index = extras.get('source_body_index')
        if isinstance(index, int) and not isinstance(index, bool) and 0 <= index < len(bodies):
            matches[index].append(node); continue
        name = extras.get('source_body_name', node['name'])
        candidates = [i for i, b in enumerate(bodies) if b['name'] == name]
        if len(candidates) == 1:
            matches[candidates[0]].append(node)
        else:
            unmatched.append(node['name'])
    rows = []
    for i, body in enumerate(bodies):
        actual = union(n['bounds'] for n in matches[i]); delta = difference(actual, body['bounds'])
        error = maximum(delta)
        status = ('UNRESOLVED' if unmatched else 'MISSING') if actual is None else ('OK' if error <= tolerance else 'SHIFTED')
        rows.append(dict(index=i, name=body['name'], path=body.get('path'), expected=body['bounds'],
                         actual=actual, delta=delta, max_delta_mm=error, status=status,
                         nodes=[n['name'] for n in matches[i]]))
    # Same six faces as inspection-all.json: source top-level bounds, all decoded nodes.
    actual = union(n['bounds'] for n in nodes); delta = difference(actual, source['bounds'])
    error = maximum(delta)
    return dict(expected=source['bounds'], source_body_union=union(b['bounds'] for b in bodies),
                actual=actual, delta=delta, max_delta_mm=error, unmatched_nodes=unmatched, bodies=rows,
                passed=error is not None and error <= tolerance and not unmatched and all(r['status']=='OK' for r in rows))


def decode(path):
    node = shutil.which('node') or str(Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
    result = subprocess.run([node, str(Path(__file__).with_name('decode_bounds.mjs')), str(Path(path).resolve())],
                            check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path); p.add_argument('glb', type=Path)
    p.add_argument('--json', type=Path); p.add_argument('--require-pass', action='store_true')
    a=p.parse_args(); result=compare(json.loads(a.source.read_text()), decode(a.glb))
    print('index | body | status | max difference mm | signed min/max delta XYZ mm')
    for r in result['bodies']:
        print(f"{r['index']} | {r['name']} | {r['status']} | {r['max_delta_mm']} | {r['delta']}")
    print('TOTAL', result['max_delta_mm'], 'mm; unmatched nodes:', result['unmatched_nodes'])
    if a.json:
        with a.json.open('x') as f: json.dump(result,f,ensure_ascii=False,indent=2)
    if a.require_pass and not result['passed']: raise SystemExit(1)


if __name__=='__main__': main()
