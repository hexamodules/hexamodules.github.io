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
    bright,adjustment=brighten_face(raw,reference) if face_source == 'tetsuya' else (None,None)
    for variant, birch, toned in [('toned',True,True),('natural',True,False),('raw',False,False)]:
        face=bright if bright is not None else studio_face(raw,birch,toned)
        if face_source == 'tetsuya':
            brightness.append(dict(variant=variant,**adjustment))
        save_new(face, output/f'face-{variant}.png')
    # Actual I-Seat default texture: retain the source image's weave and tint.
    with Image.open(assets/'mattress-colors/light-green.jpg') as im:
        save_new(im.convert('RGB'), output/'seat-fabric.png')
    report = dict(face_source=face_source, studio_image=str(assets/'wood-grain.jpg'),
                  reference=stats(reference), matched=stats(raw), brightness=brightness,
                  fabric_image=str(assets/'mattress-colors/light-green.jpg'),
                  tone=('photo gain 1.14, cream #e8dcc8, saturation .85, reference contrast; no dark display multiplier' if face_source == 'tetsuya' else 'legacy studio linear tone'))
    with (output/'texture-match.json').open('x') as f: json.dump(report,f,indent=2)
    return report


def brighten_face(image, reference):
    """Lift photo 14%, then balance to cream; preserve reference grain contrast.

    Input is the photo before the old dark studio display multiplier. The 14%
    exposure and the separate white balance are reported rather than conflated.
    """
    weights=np.array([.2126,.7152,.0722])
    rgb=np.asarray(image.convert('RGB'),dtype=np.float32)
    ref=np.asarray(reference.convert('RGB'),dtype=np.float32)
    mean=rgb.mean(axis=(0,1),dtype=np.float64)
    target=np.array([232.,220.,200.])
    exposed=rgb*1.14
    centered=exposed-mean*1.14
    neutral=(centered@weights)[...,None]
    centered=.85*centered+.15*neutral
    # Reference contrast, with a common highlight-safe scale (no hard clipping).
    spread=centered.std(axis=(0,1),dtype=np.float64)
    contrast=ref.std(axis=(0,1),dtype=np.float64)/np.maximum(spread,1e-6)
    centered*=contrast
    low=centered.min(axis=(0,1));high=centered.max(axis=(0,1))
    safe=min(1.,float(np.min((255-target)/np.maximum(high,1e-6))),
             float(np.min(target/np.maximum(-low,1e-6))))
    out=Image.fromarray(np.rint(np.clip(target+centered*safe,0,255)).astype('uint8'))
    return out,dict(gain=1.14,saturation=.85,target_rgb=target.tolist(),
                    white_balance_offset=(target-mean*1.14).tolist(),contrast_scale=contrast.tolist(),
                    highlight_scale=safe,before=float(mean@weights),
                    after=float(np.asarray(out).mean(axis=(0,1))@weights),
                    reference_mean=float(ref.mean(axis=(0,1),dtype=np.float64)@weights))
