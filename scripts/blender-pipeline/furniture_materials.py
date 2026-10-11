"""Material decisions and physical planar coordinates; no Blender dependency."""
import json
import math
import re
from pathlib import Path


def container_color(value):
    if not re.fullmatch(r'#[0-9a-fA-F]{6}', value):
        raise ValueError('Container color must be #RRGGBB')
    return value.lower()


def load_rules(path=None, container_color_override=None):
    rules = json.loads(Path(path or Path(__file__).with_name('materials.json')).read_text())
    if container_color_override is not None:
        rules['materials']['container']['color'] = container_color(container_color_override)
    return rules


# Source bounds are in millimetres. Unknown coatings need geometry evidence;
# named plywood retains its existing treatment even outside these limits.
COATED = re.compile(r'パウダー[\s_]*コート|powder[\s_-]*coat|charcoal[\s_-]*satin', re.I)
METAL_PART = re.compile(r'bracket|bolt|screw|hinge|rail|frame|rod|post|extrusion|ブラケット|金物|ねじ|蝶番|レール|支柱', re.I)


def coated_board(name, material_name, bounds=None):
    if not COATED.search(material_name) or METAL_PART.search(name) or not bounds:
        return False
    try:
        t, w, h = sorted(float(bounds[1][i])-float(bounds[0][i]) for i in range(3))
    except (TypeError, ValueError, IndexError):
        return False
    return (all(math.isfinite(v) for v in (t, w, h)) and
            5-1e-6 <= t <= 30+1e-6 and w >= 60 and w >= 3*t and w*h >= 10000)


def classify(name, material_key='', materials=None, rules=None, path='', role='', model_key='', bounds=None):
    if model_key == 'seat':
        return dict(kind='source_original', matched_by='stock_seat', fallback=False)
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
    # Do not reinterpret explicitly identified appliances, fittings or containers.
    if not guarded and not material and not contextual and COATED.search(material_name):
        if body and body['kind'] != 'plywood':
            return body
        if coated_board(name, material_name, bounds):
            return dict(kind='plywood', matched_by='coated_board_geometry', fallback=False)
        if METAL_PART.search(name):
            return dict(kind='hardware', matched_by='coated_hardware_name', fallback=False)
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
                 material=p['material'], **classify(b['name'],p['material'],data.get('materials',{}),rules,path=b.get('path',''),role=b.get('role',''),model_key=data.get('key',''),bounds=b.get('bounds')))
            for i,b in enumerate(data['bodies']) for j,p in enumerate(b['parts'])]


def linear_color(color):
    rgb = [int(color.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)


# Reviewed source body names: do not treat storage floors or horizontal shelf
# supports as sleeping surfaces. Several source bodies have no descriptive name.
WOOD_BED_TOPS = {
    'slide-bed': {'ボディ6 (1)', 'ボディ67'},
    'lounge-slide-bed': {
        'Fixed comb top - rounded fingers R20',
        'Lift-out hatch 1 - 2mm clearance',
        'Sliding comb top - rounded fingers',
        'Hexa fixed rear top strip -85mm',
        'Hexa hinged top A -524.5x490x15',
        'Hexa hinged top B -524.5x490x15',
    },
    # SHO 2026-10-11: lounge-bed faces, including tops, use Hexa.
    'lounge-bed': set(),
    # SHO 2026-10-11: wall-side ledges 69/78/214/215 are Hexa, not bed tops.
    'two-side-bed': set(),
    'lounge-fillers': {
        'Bed side filler positive - 115x15mm',
        'Bed side filler negative - 115x15mm',
    },
}


def bed_top_board(model_key, body, kind):
    """Bed-only wood tops; source bounds are Y-up, including unnamed slats."""
    if kind != 'plywood':
        return False
    if model_key in WOOD_BED_TOPS:
        bounds = body.get('bounds')
        if body.get('name') not in WOOD_BED_TOPS[model_key] or not bounds:
            return False
        spans = [bounds[1][i] - bounds[0][i] for i in range(3)]
        return 0 < spans[1] < min(spans[0], spans[2])
    if model_key != 'aluminum-bed':
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


def face_policy(material_key, materials, finish, model_key='', body=None, kind='', countertop=False):
    """Hexa covers classified plywood; keep worktop and bed-top exceptions."""
    name = materials.get(str(material_key), {}).get('name', str(material_key))
    switchable = bool(re.search(r'SKY Hexa plywood|Hexa lightweight - charcoal', name))
    if kind == 'plywood' and coated_board((body or {}).get('name',''), name, (body or {}).get('bounds')):
        switchable = True
    if finish == 'hexa' and kind == 'plywood' and body:
        if load_rules().get('hexa_plywood_policy') == 'all_except_countertops_and_bed_tops':
            switchable = True
    if finish == 'hexa' and (countertop or bed_top_board(model_key, body or {}, kind)):
        switchable = False
    hexa = finish == 'hexa' and switchable
    toned = switchable or bool(re.search('birch', name, re.I))
    return dict(finish='hexa' if hexa else 'birch', switchable=switchable,
                variant='raw' if finish == 'hexa' else 'toned' if toned else 'natural')


def studio_spec(kind, material_key, materials, rules, role='', model_key=''):
    if model_key == 'seat':
        return stock_seat_spec(material_key, materials)
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


def countertop_candidate(model_key, material_key, materials, definition, body=None):
    """ALBERO on the six worktop modules; beds and hardware remain excluded."""
    name = materials.get(str(material_key), {}).get('name', str(material_key))
    if model_key not in definition['module_ids'] or re.search('koguchi', name, re.I):
        return False
    if re.search(r'oak|オーク材', name, re.I):
        return True
    body = body or {}
    title = body.get('name', '')
    # Match top as a worktop title, not 'panel with top tenons' or 'stop'.
    pattern = r'^(?:countertop|天板|counter\b|top\b)|(?:^|[ _-])(?:countertop|counter|top)$'
    named = re.search(pattern, title, re.I) or re.search(pattern, name, re.I)
    if not named or METAL_PART.search(title):
        return False
    return classify(title, material_key, materials, path=body.get('path',''),
                    model_key=model_key, bounds=body.get('bounds'))['kind'] == 'plywood'


def countertop_uv(point_mm, bounds_mm, tile_mm):
    lo, hi = bounds_mm
    long_axis = 0 if hi[0]-lo[0] > hi[2]-lo[2] else 2
    cross_axis = 2 if long_axis == 0 else 0
    return ((point_mm[cross_axis]-lo[cross_axis])/tile_mm[0],
            (point_mm[long_axis]-lo[long_axis])/tile_mm[1])


def stock_seat_spec(material_key, materials):
    """Preserve the source seat via app.js + visual-materials.js PBR mapping.

    Source JSON has color fields, not roughness: metal_f0 selects the original
    reflective material. Never replace this with the upholstery preset.
    """
    definition = materials[str(material_key)]
    color, field = source_color(definition)
    metal = 'metal_f0' in definition.get('colors', {})
    linear = linear_color(color)
    return dict(color=color, color_linear=[v * (.85 if metal else 1) for v in linear[:3]] + [1],
                metalness=.9 if metal else 0,
                roughness=(.20 if re.search(r'クロム|chrome', definition.get('name',''), re.I) else .35) if metal else .75), 'source seat materials.colors.' + field + '; original viewer PBR'
