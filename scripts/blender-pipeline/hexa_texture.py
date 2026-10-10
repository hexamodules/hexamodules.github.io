"""Rasterize the studio canvas definition without starting a browser or Blender.

Geometry/palette: layouts/visual-materials.js, 288 x 256 canvas.
Pillow raster edges can differ slightly from Canvas2D antialiasing.
"""
import math
from PIL import Image, ImageDraw


def studio_hexa_tile():
    scale = 4
    size = (288 * scale, 256 * scale)
    image = Image.new('RGB', size, '#292321')
    for row in range(-1, 9):
        for col in range(-1, 8):
            # JS remainder is negative for negative row, unlike Python modulo.
            cx = col * 48 + math.fmod(row, 2) * 24
            cy = row * 32
            polygon = [((cx + 22 * math.cos(math.pi / 3 * k)) * scale,
                        (cy + 17 * math.sin(math.pi / 3 * k)) * scale)
                       for k in range(6)]
            mask = Image.new('L', size, 0)
            ImageDraw.Draw(mask).polygon(polygon, fill=255)
            face = Image.new('RGB', size, '#3a302b')
            draw = ImageDraw.Draw(face)
            for n in range(-20, 20):
                draw.line(((cx - 26) * scale, (cy + n * 4) * scale,
                           (cx + 26) * scale, (cy + n * 4 + 13) * scale),
                          fill='#493d35', width=scale)
            image.paste(face, (0, 0), mask)
    return image.resize((288, 256), Image.Resampling.LANCZOS)
