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

    named = match(name, 'name_priority_rules', 'body_priority')
    # Eurobox rail backing / floor are furniture supports, not the box itself.
    support = re.search(r'backing|floor|rail|support|底板|支持|補強', name, re.I)
    if named and not support:
        return named
    guarded = match(material_name, 'source_guards', 'material_guard')
    body = match(name, 'body_rules', 'body')
    contextual = match(path, 'path_rules', 'path')
    material = match(material_name, 'material_rules', 'material')
    if guarded and guarded['kind'] != 'plywood':
        return guarded
    # Preserve explicit board labels, including Eurobox floor/backing panels.
    if guarded:
        if body and body['kind'] == 'mattress':
            return body
        return guarded
    # Source aluminum/plastic takes precedence over generic slide/fridge names.
    if material and material['kind'] in ('aluminum', 'plastic'):
        return material
    if contextual and contextual['kind'] == 'container':
        return contextual
    if body and body['kind'] == 'container':
        return body
    if material:
        return material
    if contextual:
        return contextual
    if body:
        return body
    return dict(kind=rules['fallback'], matched_by='fallback', fallback=True)


def source_color(definition):
    colors = definition.get('colors', {})
    for key in ('opaque_albedo', 'metal_f0', 'surface_albedo'):
        if key in colors:
            values = colors[key]
            if len(values) < 3 or any(not 0 <= v <= 255 for v in values[:3]):
                raise ValueError('Invalid source RGB: ' + repr(values))
            return '#' + ''.join(f'{round(v):02x}' for v in values[:3]), key
    raise ValueError('Missing source color: ' + repr(definition))


def resolved_spec(kind, material_key, materials, rules):
    spec = dict(rules['materials'][kind])
    if kind in ('plywood', 'aluminum', 'container'):
        return spec, 'specified_' + kind
    color, field = source_color(materials.get(str(material_key), {}))
    spec['color'] = color
    return spec, 'materials.colors.' + field


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


def bed_top_board(model_key, body, kind):
    """Bed-only wood tops; source bounds are Y-up, including unnamed slats."""
    if model_key != 'aluminum-bed' or kind != 'plywood':
        return False
    name = body.get('name', '')
    if re.search(r'天板|すのこ|(?:^|[\W_])(?:top|slat)s?(?:$|[\W_])', name, re.I):
        return True
    bounds = body.get('bounds')
    if not bounds:
        return False
    spans = [bounds[1][i] - bounds[0][i] for i in range(3)]
    # A vertical panel also has upward edge normals: require a horizontal plate.
    return 0 < spans[1] < min(spans[0], spans[2])


def face_policy(material_key, materials, finish, model_key='', body=None, kind=''):
    """Same material-name switch as app.js; a body name alone is not a switch."""
    name = materials.get(str(material_key), {}).get('name', str(material_key))
    switchable = bool(re.search(r'SKY Hexa plywood|Hexa lightweight - charcoal', name))
    if finish == 'hexa' and bed_top_board(model_key, body or {}, kind):
        switchable = False
    hexa = finish == 'hexa' and switchable
    toned = switchable or bool(re.search('birch', name, re.I))
    return dict(finish='hexa' if hexa else 'birch', switchable=switchable,
                variant='raw' if finish == 'hexa' else 'toned' if toned else 'natural')


def studio_spec(kind, material_key, materials, rules, role='', model_key=''):
    spec, source = resolved_spec(kind, material_key, materials, rules)
    name = materials.get(str(material_key), {}).get('name', str(material_key))
    if re.search('graphite satin metallic', name, re.I):
        # app.js rgb(61,65,69), then visual-materials.js linear multiply .85.
        rgb = linear_color('#3d4145')[:3]
        encoded = [12.92*v*.85 if v*.85 <= .0031308 else 1.055*(v*.85)**(1/2.4)-.055 for v in rgb]
        spec.update(color='#'+''.join(f'{round(v*255):02x}' for v in encoded), metalness=.9, roughness=.35)
        source = 'studio graphite rgb(61,65,69) * .85 linear'
    if kind == 'seat_fabric' and model_key != 'seat':
        # Texture supplies the default olive colour; seams have no colour map.
        spec.update(color='#ffffff' if role != 'seam' else '#797b65', metalness=0,
                    roughness=.96 if role != 'seam' else 1)
        source = 'studio light-green fabric image' if role != 'seam' else 'studio light-green seam * .64 linear'
    return spec, source


def countertop_candidate(model_key, material_key, materials, definition):
    """countertops.js uses oak material tags, not generic body-name matches."""
    name = materials.get(str(material_key), {}).get('name', str(material_key))
    return (model_key in definition['module_ids'] and
            bool(re.search(r'oak|オーク材', name, re.I)) and
            not bool(re.search('koguchi', name, re.I)))


def countertop_uv(point_mm, bounds_mm, tile_mm):
    lo, hi = bounds_mm
    long_axis = 0 if hi[0]-lo[0] > hi[2]-lo[2] else 2
    cross_axis = 2 if long_axis == 0 else 0
    return ((point_mm[cross_axis]-lo[cross_axis])/tile_mm[0],
            (point_mm[long_axis]-lo[long_axis])/tile_mm[1])
