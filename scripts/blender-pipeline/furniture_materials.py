"""Material decisions and physical planar coordinates; no Blender dependency."""
import json
import re
from pathlib import Path


def load_rules(path=None):
    return json.loads(Path(path or Path(__file__).with_name('materials.json')).read_text())


def classify(name, material_key='', materials=None, rules=None):
    rules = rules or load_rules()
    definition = (materials or {}).get(str(material_key), {})
    material_name = str(material_key) + ' ' + str(definition.get('name', ''))
    for source, text, table in [('body', name, 'body_rules'), ('material', material_name, 'material_rules')]:
        for rule in rules[table]:
            if re.search(rule['pattern'], text, re.IGNORECASE):
                return dict(kind=rule['kind'], matched_by=source, fallback=False)
    return dict(kind=rules['fallback'], matched_by='fallback', fallback=True)


def board_axes(bounds):
    spans = [bounds[1][i]-bounds[0][i] for i in range(3)]
    thickness = min(range(3), key=lambda i: spans[i])
    plane = sorted((i for i in range(3) if i != thickness), key=lambda i: (spans[i],i))
    return thickness, plane[0], plane[1]  # thickness, grain(width), across


def project(point, normal, axes, mapping, finish='birch'):
    thickness, grain, across = axes
    edge = abs(normal[thickness]) < mapping['face_normal_threshold']
    if edge:
        run = across if abs(normal[grain]) > abs(normal[across]) else grain
        return 1, (point[run]*1000/mapping['edge_mm'][0], point[thickness]*1000/mapping['edge_mm'][1])
    mm = mapping['hexa_mm'] if finish == 'hexa' else mapping['face_mm']
    return 0, (point[across]*1000/mm[0], point[grain]*1000/mm[1])


def audit_mesh(data, rules=None):
    rules = rules or load_rules()
    return [dict(body_index=i, body=b['name'], path=b.get('path',''), part=j,
                 material=p['material'], **classify(b['name'],p['material'],data.get('materials',{}),rules))
            for i,b in enumerate(data['bodies']) for j,p in enumerate(b['parts'])]


def linear_color(color):
    rgb = [int(color.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)
