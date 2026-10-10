"""Validate generated material-report.json against source container parts; no Blender."""
import argparse
import json
from pathlib import Path
from furniture_materials import audit_mesh


def validate(data, report):
    expected = {(r['body_index'], r['part']) for r in audit_mesh(data) if r['kind'] == 'container'}
    actual = {}
    for row in report['decisions']:
        key = (row.get('source_body_index'), row.get('source_part_index'))
        if key in actual:
            raise ValueError('Duplicate source part: ' + str(key))
        actual[key] = row
    for key in expected:
        row = actual.get(key, {})
        if row.get('kind') != 'container' or row.get('spec', {}).get('color') != '#969594':
            raise ValueError('Container kind/color missing or wrong: ' + str(key))
    return len(expected)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    p.add_argument('report', type=Path)
    a = p.parse_args()
    count = validate(json.loads(a.source.read_text()), json.loads(a.report.read_text()))
    print(f'Container material report: {count} source parts passed')


if __name__ == '__main__':
    main()
