"""Material decisions and physical planar coordinates; no Blender dependency."""
import json
import re
from pathlib import Path


def load_rules(path=None):
    return json.loads(Path(path or Path(__file__).with_name('materials.json')).read_text())


def classify(name, material_key='', materials=None, rules=None, path='', role=''):
    rules = rules or load_rules()
    definition = (materials or {}).get(str(material_key), {})
    material_name = str(material_key) + ' ' + str(definition.get('name', ''))
    def match(text, table, source):
        for rule in rules.get(table, []):
            if re.search(rule['pattern'], text, re.IGNORECASE):
                return dict(kind=rule['kind'], matched_by=source, fallback=False)

    # Explicit source wood protects sink cutouts/supports; ISeat roles protect metal.
    guarded = match(material_name, 'source_guards', 'material_guard')
    body = match(name, 'body_rules', 'body')
    if guarded and guarded['kind'] != 'plywood':
        return guarded
    # Named fasteners and containers remain authoritative even on stale wood labels.
    if body and body['kind'] in ('hardware', 'container', 'mattress', 'aluminum', 'seat_fabric'):
        return body
    if guarded:
        return guarded
    # Component paths identify anonymous appliance and PFS bodies. Do not combine
    # generic parent words ("rear fridge", "Eurocontainer tray") with body names.
    contextual = match(path, 'path_rules', 'path')
    if contextual:
        return contextual
    if body:
        return body
    material = match(material_name, 'material_rules', 'material')
    if material:
        return material
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
    if finish == 'hexa':
        mm = mapping['hexa_mm']
        # Studio UV: short in-plane axis / 450, long / 900, repeat(5, 10).
        return 0, (point[grain]*1000/mm[0], point[across]*1000/mm[1])
    mm = mapping['face_mm']
    return 0, (point[across]*1000/mm[0], point[grain]*1000/mm[1])


def audit_mesh(data, rules=None):
    rules = rules or load_rules()
    return [dict(body_index=i, body=b['name'], path=b.get('path',''), part=j,
                 material=p['material'], **classify(b['name'],p['material'],data.get('materials',{}),rules,path=b.get('path',''),role=b.get('role','')))
            for i,b in enumerate(data['bodies']) for j,p in enumerate(b['parts'])]


def linear_color(color):
    rgb = [int(color.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)
