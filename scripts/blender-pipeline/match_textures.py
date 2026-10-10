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
        with Image.open(tiles/'birch-face.png') as im: raw = im.convert('RGB')
    brightness=[]
    bright,adjustment=brighten_face(raw,reference) if face_source == 'tetsuya' else (None,None)
    for variant, birch, toned in [('toned',True,True),('natural',True,False),('raw',False,False)]:
        face=bright if bright is not None else brighten_studio(reference)
        if face_source == 'tetsuya':
            brightness.append(dict(variant=variant,**adjustment))
        save_new(face, output/f'face-{variant}.png')
    if face_source == 'tetsuya':
        with Image.open(tiles/'birch-edge-15mm.png') as im:
            edge, _ = brighten_face(im, reference)
        save_new(edge, output/'edge-birch.png')
    else:
        with Image.open(tiles/'birch-edge-15mm.png') as im:
            edge = studio_edge(im, brighten_studio(reference))
        save_new(edge, output/'edge-birch.png')
        brightness.append(dict(gain=1.06, saturation=1., contrast=1.))
    # Actual I-Seat default texture: retain the source image's weave and tint.
    with Image.open(assets/'mattress-colors/light-green.jpg') as im:
        save_new(im.convert('RGB'), output/'seat-fabric.png')
    report = dict(face_source=face_source, studio_image=str(assets/'wood-grain.jpg'),
                  reference=stats(reference), matched=stats(raw), brightness=brightness,
                  fabric_image=str(assets/'mattress-colors/light-green.jpg'),
                  tone=('birch #dccbb0, original photo colour variation, grain contrast +15%; no dark display multiplier' if face_source == 'tetsuya' else 'original studio image, brightness +6% only; edge luminance matched to face'))
    with (output/'texture-match.json').open('x') as f: json.dump(report,f,indent=2)
    return report


def previous_brighten_face(image, reference):
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


def brighten_face(image, reference):
    """Warm birch mean; retain photo chroma variation with one common RGB gain.

    Grain contrast is luminance standard deviation, 15% above the previous
    #e8dcc8 treatment of this same photo. No neutral/desaturation mix.
    """
    weights=np.array([.2126,.7152,.0722])
    rgb=np.asarray(image.convert('RGB'),dtype=np.float64)
    mean=rgb.mean(axis=(0,1))
    previous,_=previous_brighten_face(histogram_match(image,reference),reference)
    old_spread=float((np.asarray(previous,dtype=float)@weights).std())
    centered=rgb-mean
    spread=float((centered@weights).std())
    scale=old_spread*1.15/spread if spread>1e-6 else 1.
    target=np.array([220.,203.,176.])
    centered*=scale
    low=centered.min(axis=(0,1));high=centered.max(axis=(0,1))
    safe=min(1.,float(np.min((255-target)/np.maximum(high,1e-6))),
             float(np.min(target/np.maximum(-low,1e-6))))
    out=Image.fromarray(np.rint(target+centered*safe).astype('uint8'))
    return out,dict(saturation=1.,target_rgb=target.tolist(),contrast_gain=1.15,
                    photo_rgb_scale=scale,highlight_scale=safe,
                    previous_grain_std=old_spread,
                    grain_std=float((np.asarray(out,dtype=float)@weights).std()))


def brighten_studio(image):
    """Original studio pixels with a common sRGB brightness gain only."""
    rgb = np.asarray(image.convert('RGB'), dtype=np.float64)
    return Image.fromarray(np.rint(np.clip(rgb * 1.06, 0, 255)).astype('uint8'))


def studio_edge(image, face):
    """Retain birch edge layers/chroma; match mean luminance to the face."""
    weights = np.array([.2126, .7152, .0722])
    rgb = np.asarray(image.convert('RGB'), dtype=np.float64)
    target = float((np.asarray(face, dtype=np.float64) @ weights).mean())
    gain = target / max(float((rgb @ weights).mean()), 1e-6)
    return Image.fromarray(np.rint(np.clip(rgb * gain, 0, 255)).astype('uint8'))
