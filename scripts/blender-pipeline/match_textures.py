"""Prepare studio-matched colour textures outside layouts; no Blender dependency."""
import json
import numpy as np
from PIL import Image
from extract_tile import save_new


def srgb_to_linear(x):
    return np.where(x <= .04045, x / 12.92, ((x + .055) / 1.055) ** 2.4)


def linear_to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= .0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - .055)


def histogram_match(source, reference):
    """Per-channel empirical CDF match; handles flat/low-contrast photographs."""
    src = np.asarray(source.convert('RGB'))
    ref = np.asarray(reference.convert('RGB'))
    out = np.empty_like(src)
    for c in range(3):
        values, inverse, counts = np.unique(src[..., c], return_inverse=True, return_counts=True)
        target, target_counts = np.unique(ref[..., c], return_counts=True)
        q = (np.cumsum(counts) - counts / 2) / counts.sum()
        tq = (np.cumsum(target_counts) - target_counts / 2) / target_counts.sum()
        out[..., c] = np.rint(np.interp(q, tq, target))[inverse].reshape(src.shape[:2])
    return Image.fromarray(out)


def studio_face(image, birch=True, toned=True):
    """Bake visual-materials.js face mix and tone in LINEAR RGB, encode once."""
    rgb = srgb_to_linear(np.asarray(image.convert('RGB'), dtype=np.float32) / 255)
    if birch:
        rgb = rgb * .81 + np.array([.77, .69, .53],dtype=np.float32) * .19
        if toned:
            grain = rgb ** 1.08
            neutral = (grain * np.array([.2126, .7152, .0722],dtype=np.float32)).sum(axis=2, keepdims=True)
            rgb = (neutral * .08 + grain * .92) * np.array([.40, .40, .46],dtype=np.float32)
    return Image.fromarray(np.rint(linear_to_srgb(rgb) * 255).astype('uint8'))


def stats(image):
    x = np.asarray(image.convert('RGB'), dtype=float).reshape(-1, 3)
    return dict(mean=x.mean(axis=0).tolist(), std=x.std(axis=0).tolist())


def prepare(assets, tiles, output, face_source='studio'):
    with Image.open(assets/'wood-grain.jpg') as im: reference = im.convert('RGB')
    raw = reference
    if face_source == 'tetsuya':
        with Image.open(tiles/'birch-face.png') as im: raw = histogram_match(im, reference)
    brightness=[]
    for variant, birch, toned in [('toned',True,True),('natural',True,False),('raw',False,False)]:
        face=studio_face(raw,birch,toned)
        if face_source == 'tetsuya':
            face,adjustment=brighten_face(face, reference)
            brightness.append(dict(variant=variant,**adjustment))
        save_new(face, output/f'face-{variant}.png')
    # Actual I-Seat default texture: retain the source image's weave and tint.
    with Image.open(assets/'mattress-colors/light-green.jpg') as im:
        save_new(im.convert('RGB'), output/'seat-fabric.png')
    report = dict(face_source=face_source, studio_image=str(assets/'wood-grain.jpg'),
                  reference=stats(reference), matched=stats(raw), brightness=brightness,
                  fabric_image=str(assets/'mattress-colors/light-green.jpg'),
                  tone='linear mix .19, power 1.08, saturation .92, gain .40/.40/.46; sRGB once')
    with (output/'texture-match.json').open('x') as f: json.dump(report,f,indent=2)
    return report


def brighten_face(image, reference):
    """Raise displayed photograph gently, capped at the studio image mean."""
    weights=np.array([.2126,.7152,.0722])
    rgb=np.asarray(image.convert('RGB'),dtype=float)
    before=float((rgb@weights).mean())
    target=float((np.asarray(reference.convert('RGB'),dtype=float)@weights).mean())
    gain=max(1.0,min(1.06,target/before)) if before else 1.0
    out=Image.fromarray(np.rint(np.clip(rgb*gain,0,255)).astype('uint8'))
    return out,dict(gain=gain,before=before,after=float((np.asarray(out)@weights).mean()),reference_mean=target)
