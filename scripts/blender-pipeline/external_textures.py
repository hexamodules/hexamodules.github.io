"""Lossless GLB image extraction. No image decoding, resizing or encoding."""
import copy
import hashlib
import json
from pathlib import Path
import struct


def read_glb(raw):
    if len(raw) < 20 or struct.unpack_from('<4sII', raw) != (b'glTF', 2, len(raw)):
        raise ValueError('Invalid GLB header')
    chunks = []
    offset = 12
    while offset < len(raw):
        size, kind = struct.unpack_from('<I4s', raw, offset)
        offset += 8
        if size % 4 or offset + size > len(raw):
            raise ValueError('Invalid GLB chunk')
        chunks.append((kind, raw[offset:offset+size]))
        offset += size
    if [k for k, _ in chunks] != [b'JSON', b'BIN\0']:
        raise ValueError('Expected JSON and BIN chunks')
    return json.loads(chunks[0][1]), chunks[1][1]


def write_glb(doc, binary):
    data = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode()
    data += b' ' * (-len(data) % 4)
    binary += b'\0' * (-len(binary) % 4)
    return (struct.pack('<4sII', b'glTF', 2, 28 + len(data) + len(binary)) +
            struct.pack('<I4s', len(data), b'JSON') + data +
            struct.pack('<I4s', len(binary), b'BIN\0') + binary)


def ao_images(doc):
    result = {i for i, image in enumerate(doc.get('images', []))
              if 'ao' in image.get('name', '').lower().split('-')}
    for material in doc.get('materials', []):
        info = material.get('occlusionTexture')
        if not info:
            continue
        texture = doc['textures'][info['index']]
        if 'source' in texture:
            result.add(texture['source'])
        for extension in texture.get('extensions', {}).values():
            if 'source' in extension:
                result.add(extension['source'])
    return result


def image_bytes(doc, binary, index, directory=None):
    image = doc['images'][index]
    if 'bufferView' in image:
        view = doc['bufferViews'][image['bufferView']]
        if view['buffer'] != 0 or view.get('extensions'):
            raise ValueError('Expected plain embedded image')
        start = view.get('byteOffset', 0)
        data = binary[start:start+view['byteLength']]
        if len(data) != view['byteLength']:
            raise ValueError('Image outside BIN')
        return data
    uri = image.get('uri', '')
    if directory is None or not uri or ':' in uri or Path(uri).is_absolute():
        raise ValueError('Expected local external image URI')
    return (Path(directory) / uri).read_bytes()


def externalize(raw, directory=None):
    """Return (GLB bytes, URI->unchanged WebP bytes); never writes files."""
    original, binary = read_glb(raw)
    doc = copy.deepcopy(original)
    ao = ao_images(doc)
    removed = set()
    textures = {}
    for index, image in enumerate(doc.get('images', [])):
        if index in ao:
            if 'bufferView' not in image:
                raise ValueError('AO must remain embedded')
            continue
        data = image_bytes(original, binary, index, directory)
        if image.get('mimeType') != 'image/webp' or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
            raise ValueError('External mode requires existing WebP; conversion is forbidden')
        uri = 'tex/' + hashlib.sha256(data).hexdigest() + '.webp'
        textures[uri] = data
        if 'bufferView' in image:
            removed.add(image.pop('bufferView'))
        image['uri'] = uri
    # Remove only complete 4-byte blocks belonging to removed image views.
    # Keeping up to 3 trailing bytes avoids touching neighbouring payload/padding.
    ranges = sorted((v.get('byteOffset', 0), v.get('byteOffset', 0) + v['byteLength']//4*4)
                    for i, v in enumerate(doc.get('bufferViews', [])) if i in removed)
    for i, (start, end) in enumerate(ranges):
        if start % 4 or end > len(binary) or (i and start < ranges[i-1][1]):
            raise ValueError('Overlapping or invalid image ranges')

    def relocate(record):
        if record.get('buffer') != 0:
            return
        start = record.get('byteOffset', 0)
        end = start + record['byteLength']
        if any(start < b and end > a for a, b in ranges):
            raise ValueError('Image storage overlaps retained data')
        record['byteOffset'] = start - sum(b-a for a, b in ranges if b <= start)

    mapping = {}
    retained = []
    for index, view in enumerate(doc.get('bufferViews', [])):
        if index in removed:
            continue
        mapping[index] = len(retained)
        relocate(view)
        compression = view.get('extensions', {}).get('EXT_meshopt_compression')
        if compression:
            relocate(compression)
        retained.append(view)
    doc['bufferViews'] = retained

    def remap(value):
        if isinstance(value, list):
            for child in value:
                remap(child)
        elif isinstance(value, dict):
            for key, child in value.items():
                if key == 'bufferView':
                    if child not in mapping:
                        raise ValueError('Removed image view is used by other data')
                    value[key] = mapping[child]
                else:
                    remap(child)
    remap(doc)
    pieces = []
    cursor = 0
    for start, end in ranges:
        pieces.append(binary[cursor:start])
        cursor = end
    pieces.append(binary[cursor:])
    result = b''.join(pieces)
    doc['buffers'][0]['byteLength'] -= sum(b-a for a, b in ranges)
    return write_glb(doc, result), textures


def save_external(src, out):
    src, out = Path(src), Path(out)
    if out.exists():
        raise ValueError('Choose a new output name')
    raw, textures = externalize(src.read_bytes(), src.parent)
    for uri, data in textures.items():
        dest = out.parent / uri
        if dest.exists() and dest.read_bytes() != data:
            raise ValueError('Existing shared image differs: ' + str(dest))
    out.parent.mkdir(parents=True, exist_ok=True)
    for uri, data in textures.items():
        dest = out.parent / uri
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            with dest.open('xb') as stream:
                stream.write(data)
    with out.open('xb') as stream:
        stream.write(raw)
    return {'bytes': len(raw), 'external_bytes': sum(map(len, textures.values())),
            'cold_bytes': len(raw) + sum(map(len, textures.values())),
            'external_images': len(textures), 'image_reencoded': False}
